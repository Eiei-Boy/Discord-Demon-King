import { Client, TextChannel } from 'discord.js';
import cron, { ScheduledTask } from 'node-cron';
import * as api from './api';
import { logger } from '../utils/logger';

// Map to hold the cron jobs so we can stop/restart them
const scheduledJobs = new Map<string, ScheduledTask>();

// Store client reference for midnight check
let botClient: Client | null = null;

export interface ReminderConfig {
    discordId: string;
    guildId: string;
    reminderTime: string; // HH:MM format
    reminderChannelId: string;
    failChannelId: string;
    timezone?: string;
}

/**
 * Schedule a daily reminder for a user
 */
export function scheduleDailyReminder(client: Client, config: ReminderConfig): void {
    const jobKey = `reminder:${config.discordId}:${config.guildId}`;
    const [hour, minute] = config.reminderTime.split(':');

    // Cron syntax: minute hour * * * (every day at specified time)
    const cronExpression = `${minute} ${hour} * * *`;

    // Stop existing job if any
    if (scheduledJobs.has(jobKey)) {
        scheduledJobs.get(jobKey)?.stop();
        logger.info(`Stopped existing reminder for ${config.discordId}`);
    }

    const job = cron.schedule(
        cronExpression,
        async () => {
            try {
                // Check if user already submitted today
                const todayResult = await api.hasSubmittedToday(config.discordId, config.guildId);

                if (todayResult.data?.hasSubmitted) {
                    logger.info(`User ${config.discordId} already submitted today, skipping reminder`);
                    return;
                }

                const channel = client.channels.cache.get(config.reminderChannelId) as TextChannel;

                if (channel) {
                    await channel.send(
                        `<@${config.discordId}>, ⏰ **Daily LeetCode Reminder!**\n\n` +
                            `Time to practice! 💪\n` +
                            `Use \`/submit <question_number>\` after solving a problem.\n\n` +
                            `*Don't forget - you must submit before midnight UTC to maintain your streak!*`
                    );
                    logger.info(`Sent reminder to ${config.discordId}`);
                } else {
                    logger.warn(`Could not find reminder channel ${config.reminderChannelId}`);
                }
            } catch (error) {
                logger.error(`Error sending reminder to ${config.discordId}:`, error);
            }
        },
        {
            timezone: config.timezone || 'UTC',
        }
    );

    scheduledJobs.set(jobKey, job);
    logger.info(`Scheduled reminder for ${config.discordId} at ${config.reminderTime} (${config.timezone || 'UTC'})`);
}

/**
 * Cancel a scheduled reminder
 */
export function cancelReminder(discordId: string, guildId: string): void {
    const jobKey = `reminder:${discordId}:${guildId}`;

    if (scheduledJobs.has(jobKey)) {
        scheduledJobs.get(jobKey)?.stop();
        scheduledJobs.delete(jobKey);
        logger.info(`Cancelled reminder for ${discordId}`);
    }
}

/**
 * Initialize the scheduler - load all active jobs from database
 */
export async function initializeScheduler(client: Client): Promise<void> {
    botClient = client;
    logger.info('Initializing scheduler...');

    try {
        // Load all active contracts and schedule reminders
        const result = await api.getActiveContracts();

        if (result.success && result.data) {
            for (const contract of result.data) {
                scheduleDailyReminder(client, {
                    discordId: contract.user.discordId,
                    guildId: contract.guildId,
                    reminderTime: contract.reminderTime,
                    reminderChannelId: contract.reminderChannelId,
                    failChannelId: contract.failChannelId,
                    timezone: contract.user.timezone,
                });
            }
            logger.success(`Loaded ${result.data.length} contract reminders`);
        } else {
            logger.warn('Could not load active contracts from API');
        }
    } catch (error) {
        logger.error('Error initializing scheduler:', error);
    }

    // Schedule the midnight check
    scheduleMidnightCheck(client);
}

/**
 * Schedule the midnight contract enforcement check
 */
function scheduleMidnightCheck(client: Client): void {
    // Run every day at 00:05 UTC (5 minutes after midnight for buffer)
    cron.schedule(
        '5 0 * * *',
        async () => {
            logger.info('Running midnight contract check...');

            try {
                // Call API to process midnight check
                const result = await api.processMidnightCheck();

                if (!result.success) {
                    logger.error('Midnight check API failed:', result.error);
                    return;
                }

                const failedUsers = result.data?.failedUsers || [];
                logger.info(`Found ${failedUsers.length} users who failed to submit`);

                // Send shame messages
                for (const failed of failedUsers) {
                    try {
                        const failChannel = client.channels.cache.get(failed.failChannelId) as TextChannel;

                        if (failChannel) {
                            const streakMessage =
                                failed.currentStreak > 0
                                    ? `They lost a **${failed.currentStreak} day** streak! 😭`
                                    : '';

                            await failChannel.send(
                                `⚠️ **CONTRACT FAILED!**\n\n` +
                                    `<@${failed.discordId}> failed to submit their LeetCode solution before midnight UTC!\n` +
                                    `${streakMessage}\n\n` +
                                    `*Their streak has been reset to 0. Better luck tomorrow!* 💀`
                            );
                            logger.info(`Sent failure notification for ${failed.discordId}`);
                        }
                    } catch (error) {
                        logger.error(`Error sending failure notification for ${failed.discordId}:`, error);
                    }
                }

                logger.success('Midnight check completed');
            } catch (error) {
                logger.error('Error in midnight check:', error);
            }
        },
        {
            timezone: 'UTC',
        }
    );

    logger.info('Midnight check scheduled for 00:05 UTC');
}

/**
 * Get the number of active scheduled jobs
 */
export function getActiveJobCount(): number {
    return scheduledJobs.size;
}
