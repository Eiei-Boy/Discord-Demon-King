import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ChannelType,
} from 'discord.js';
import { Command } from '../../types';
import * as api from '../../services/api';
import { scheduleDailyReminder } from '../../services/scheduler';

// Common timezones for autocomplete
const COMMON_TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'America/Denver',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Asia/Bangkok',
    'Australia/Sydney',
    'Pacific/Auckland',
];

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('contract')
        .setDescription('📜 Manage your daily LeetCode contract')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new daily LeetCode contract')
                .addStringOption(option =>
                    option
                        .setName('time')
                        .setDescription('Daily reminder time (HH:MM format, e.g., 09:00)')
                        .setRequired(true),
                )
                .addChannelOption(option =>
                    option
                        .setName('reminder_channel')
                        .setDescription('Channel for daily reminders')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                )
                .addChannelOption(option =>
                    option
                        .setName('fail_channel')
                        .setDescription('Channel to announce failures (shame channel)')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                )
                .addStringOption(option =>
                    option
                        .setName('timezone')
                        .setDescription('Your timezone (default: UTC)')
                        .setRequired(false)
                        .setAutocomplete(true),
                ),
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View your current contract status and stats'),
        )
        .addSubcommand(subcommand =>
            subcommand.setName('cancel').setDescription('Cancel your active contract'),
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await handleCreate(interaction);
                break;
            case 'status':
                await handleStatus(interaction);
                break;
            case 'cancel':
                await handleCancel(interaction);
                break;
        }
    },
};

async function handleCreate(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const time = interaction.options.getString('time', true);
    const reminderChannel = interaction.options.getChannel('reminder_channel', true);
    const failChannel = interaction.options.getChannel('fail_channel', true);
    const timezone = interaction.options.getString('timezone') || 'UTC';

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(time)) {
        await interaction.editReply({
            content: '❌ Invalid time format! Please use HH:MM (e.g., 09:00 or 21:30)',
        });
        return;
    }

    // Validate timezone
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
        await interaction.editReply({
            content: `❌ Invalid timezone: \`${timezone}\`. Please use a valid IANA timezone (e.g., America/New_York, Europe/London, Asia/Tokyo)`,
        });
        return;
    }

    if (!interaction.guildId) {
        await interaction.editReply({ content: '❌ This command can only be used in a server!' });
        return;
    }

    // Normalize time to HH:MM format
    const [hours, minutes] = time.split(':');
    const normalizedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;

    const result = await api.createContract({
        discordId: interaction.user.id,
        guildId: interaction.guildId,
        reminderChannelId: reminderChannel.id,
        failChannelId: failChannel.id,
        reminderTime: normalizedTime,
        timezone,
    });

    if (!result.success) {
        if (result.error?.includes('already exists')) {
            await interaction.editReply({
                content:
                    '❌ You already have an active contract in this server! Use `/contract cancel` first if you want to create a new one.',
            });
        } else {
            await interaction.editReply({
                content: `❌ Failed to create contract: ${result.error}`,
            });
        }
        return;
    }

    // Schedule the reminder in the bot
    scheduleDailyReminder(interaction.client, {
        discordId: interaction.user.id,
        guildId: interaction.guildId,
        reminderTime: normalizedTime,
        reminderChannelId: reminderChannel.id,
        failChannelId: failChannel.id,
        timezone,
    });

    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('📜 Contract Created!')
        .setDescription("You've committed to solving a LeetCode problem every day!")
        .addFields(
            { name: '⏰ Reminder Time', value: `${normalizedTime} (${timezone})`, inline: true },
            { name: '📢 Reminder Channel', value: `<#${reminderChannel.id}>`, inline: true },
            { name: '😈 Shame Channel', value: `<#${failChannel.id}>`, inline: true },
            {
                name: '📋 How it works',
                value:
                    '1. You will receive a daily reminder at your chosen time\n' +
                    "2. Use `/submit <question_number>` to mark today's problem as done\n" +
                    "3. If you don't submit before midnight UTC, you'll be shamed!\n" +
                    '4. Build your streak and track your progress!',
            },
        )
        .setFooter({ text: 'Good luck on your LeetCode journey! 💪' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleStatus(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    if (!interaction.guildId) {
        await interaction.editReply({ content: '❌ This command can only be used in a server!' });
        return;
    }

    const result = await api.getContract(interaction.user.id, interaction.guildId);

    if (!result.success || !result.data) {
        await interaction.editReply({
            content:
                "❌ You don't have an active contract in this server. Use `/contract create` to start one!",
        });
        return;
    }

    const contract = result.data;

    // Check if submitted today
    const todayResult = await api.hasSubmittedToday(interaction.user.id, interaction.guildId);
    const hasSubmittedToday = todayResult.data?.hasSubmitted || false;

    const statusEmoji = contract.isActive ? '🟢' : '🔴';
    const submittedEmoji = hasSubmittedToday ? '✅' : '⏳';

    const embed = new EmbedBuilder()
        .setColor(contract.isActive ? 0x00ff00 : 0xff0000)
        .setTitle('📊 Contract Status')
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
            {
                name: 'Status',
                value: `${statusEmoji} ${contract.isActive ? 'Active' : 'Inactive'}`,
                inline: true,
            },
            {
                name: "Today's Task",
                value: `${submittedEmoji} ${hasSubmittedToday ? 'Completed!' : 'Pending...'}`,
                inline: true,
            },
            { name: '\u200B', value: '\u200B', inline: true },
            { name: '🔥 Current Streak', value: `${contract.currentStreak} days`, inline: true },
            { name: '🏆 Longest Streak', value: `${contract.longestStreak} days`, inline: true },
            { name: '📝 Total Submissions', value: `${contract.totalSubmissions}`, inline: true },
            { name: '⏰ Reminder Time', value: contract.reminderTime, inline: true },
            {
                name: '📢 Reminder Channel',
                value: `<#${contract.reminderChannelId}>`,
                inline: true,
            },
            { name: '😈 Shame Channel', value: `<#${contract.failChannelId}>`, inline: true },
        )
        .setFooter({
            text: `Contract started: ${new Date(contract.createdAt).toLocaleDateString()}`,
        })
        .setTimestamp();

    // Add recent submissions if available
    if (contract.submissions && contract.submissions.length > 0) {
        const recentSubmissions = contract.submissions
            .slice(0, 5)
            .map(
                (s, i) =>
                    `${i + 1}. Problem #${s.questionNumber}${s.difficulty ? ` (${s.difficulty})` : ''} - ${new Date(s.submittedAt).toLocaleDateString()}`,
            )
            .join('\n');

        embed.addFields({ name: '📋 Recent Submissions', value: recentSubmissions });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleCancel(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    if (!interaction.guildId) {
        await interaction.editReply({ content: '❌ This command can only be used in a server!' });
        return;
    }

    const result = await api.cancelContract(interaction.user.id, interaction.guildId);

    if (!result.success) {
        await interaction.editReply({
            content: "❌ You don't have an active contract to cancel!",
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setColor(0xff6600)
        .setTitle('📜 Contract Cancelled')
        .setDescription('Your daily LeetCode contract has been cancelled.')
        .addFields({
            name: '💡 Tip',
            value: "You can always start a new contract with `/contract create` when you're ready to commit again!",
        })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

export default command;

// Autocomplete handler for timezone
export async function handleContractAutocomplete(
    interaction: import('discord.js').AutocompleteInteraction,
) {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'timezone') {
        const filtered = COMMON_TIMEZONES.filter(tz =>
            tz.toLowerCase().includes(focusedOption.value.toLowerCase()),
        ).slice(0, 25);

        await interaction.respond(filtered.map(tz => ({ name: tz, value: tz })));
    }
}
