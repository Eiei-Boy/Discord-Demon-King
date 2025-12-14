import { Client, TextChannel } from 'discord.js';
import cron from 'node-cron';
import {
    UserContract,
    getContractEntries,
    resetDailySubmissions,
    hasSubmittedToday,
} from './contractManager';

// Map to hold the cron jobs so we can stop/restart them if the time changes
const scheduledJobs = new Map<string, cron.ScheduledTask>();

export function scheduleDailyReminder(client: Client, contract: UserContract): void {
    const userId = contract.userId;
    const [hour, minute] = contract.reminderTime.split(':');

    // Cron syntax: minute hour dayOfMonth month dayOfWeek (0-59 0-23 1-31 1-12 0-7)
    // Reminder: Runs every day at the user's specified time (in UTC).
    const reminderCronTime = `${minute} ${hour} * * *`;

    // Stop and remove any existing job for this user
    if (scheduledJobs.has(userId)) {
        scheduledJobs.get(userId)?.stop();
    }

    const job = cron.schedule(
        reminderCronTime,
        async () => {
            const channel = client.channels.cache.get(contract.reminderChannelId) as TextChannel;
            if (channel) {
                await channel.send(`<@${userId}>, ⏰ **Daily LeetCode Reminder!** Time to practice!
            You must use \`/submit\` before midnight UTC to satisfy your contract.`);
            }
        },
        {
            scheduled: true,
            timezone: 'UTC', // IMPORTANT: Use a consistent timezone, UTC is standard for bots
        },
    );

    scheduledJobs.set(userId, job);
    console.log(`Scheduled reminder for ${userId} at ${contract.reminderTime} UTC.`);
}

// --- Midnight Contract Enforcement ---
// This job runs every day at 00:00 (midnight) UTC.
cron.schedule(
    '0 0 * * *',
    async () => {
        console.log('--- Running Midnight Contract Check ---');

        // 1. Get the list of users who failed to submit
        const failedUsersIds = resetDailySubmissions(); // Also resets submissions for the new day

        // 2. Notify the fail channel for each user
        for (const userId of failedUsersIds) {
            const contract = getContractEntries().find(([, c]) => c.userId === userId)?.[1];

            if (contract) {
                const failChannel = client.channels.cache.get(
                    contract.failChannelId,
                ) as TextChannel;
                if (failChannel) {
                    await failChannel.send(
                        `⚠️ **CONTRACT FAILED!** <@${userId}> failed to submit their LeetCode solution before the midnight UTC deadline! Get them next time!`,
                    );
                }
            }
        }
    },
    {
        scheduled: true,
        timezone: 'UTC',
    },
);
