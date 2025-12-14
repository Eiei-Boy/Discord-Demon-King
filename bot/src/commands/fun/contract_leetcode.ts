import { SlashCommandBuilder, ChatInputCommandInteraction, Client } from 'discord.js';
import { Command } from '../../types'; // Assuming this path is correct
import { setContract, getUserContract } from '../reminders/contractManager'; // Import the management functions
import { scheduleDailyReminder } from '../reminders/scheduler'; // Import the scheduling function

// Define the structure for the reminder state (could be a DB/JSON file in a real app)
// We need the client object here to initiate the scheduler once the contract is set.

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('contract_leetcode')
        .setDescription('📅 Set your daily LeetCode reminder contract!')
        .addStringOption(option =>
            option
                .setName('time')
                .setDescription(
                    'The time (HH:MM 24h format, e.g., 09:30) to receive your daily reminder.',
                )
                .setRequired(true),
        )
        .addChannelOption(option =>
            option
                .setName('fail_channel')
                .setDescription(
                    'The channel where the bot will post if you fail the contract (default: current channel).',
                )
                .setRequired(false),
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        // Ensure the interaction is in a guild/server environment
        if (!interaction.guild) {
            return interaction.reply({
                content: 'This command must be run in a server.',
                ephemeral: true,
            });
        }

        const timeInput = interaction.options.getString('time', true); // e.g., "09:30"
        const failChannel = interaction.options.getChannel('fail_channel') || interaction.channel;

        // Basic time format validation (HH:MM 24hr)
        if (!/^\d{2}:\d{2}$/.test(timeInput)) {
            return interaction.reply({
                content: '❌ Invalid time format. Please use HH:MM (e.g., 14:30).',
                ephemeral: true,
            });
        }

        const [hourStr, minuteStr] = timeInput.split(':');
        const hour = parseInt(hourStr);
        const minute = parseInt(minuteStr);

        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return interaction.reply({
                content: '❌ Invalid hour or minute. Use 24-hour format (00:00 to 23:59).',
                ephemeral: true,
            });
        }

        // 1. Save the contract details
        const contract = {
            userId: interaction.user.id,
            reminderTime: timeInput, // The time the initial reminder is sent
            guildId: interaction.guild.id,
            reminderChannelId: interaction.channelId, // The channel to send the reminder
            failChannelId: failChannel?.id, // The channel to post the failure message
        };

        setContract(contract.userId, contract);

        // 2. Schedule the daily reminder using node-cron (See scheduler.ts below)
        scheduleDailyReminder(interaction.client as Client, contract);

        // 3. Send confirmation reply
        const currentContract = getUserContract(interaction.user.id);

        if (currentContract) {
            await interaction.reply({
                content: `✅ **LeetCode Contract Set!**
                I will remind you daily at **${currentContract.reminderTime} UTC** in this channel (<#${currentContract.reminderChannelId}>).
                You must use \`/submit\` before midnight UTC, or the failure message will be posted in <#${currentContract.failChannelId}>.
                `,
                ephemeral: false, // Make it visible to everyone
            });
        }
    },
};

export default command;
