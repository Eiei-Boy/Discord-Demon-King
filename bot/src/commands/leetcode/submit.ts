import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../types';
import * as api from '../../services/api';

// LeetCode difficulty options
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('submit')
        .setDescription('📝 Submit your daily LeetCode solution')
        .addIntegerOption(option =>
            option
                .setName('question')
                .setDescription('The LeetCode question number (e.g., 1, 42, 1337)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10000)
        )
        .addStringOption(option =>
            option
                .setName('title')
                .setDescription('Question title (optional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('difficulty')
                .setDescription('Question difficulty (optional)')
                .setRequired(false)
                .addChoices(
                    { name: '🟢 Easy', value: 'Easy' },
                    { name: '🟡 Medium', value: 'Medium' },
                    { name: '🔴 Hard', value: 'Hard' }
                )
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        if (!interaction.guildId) {
            await interaction.editReply({ content: '❌ This command can only be used in a server!' });
            return;
        }

        const questionNumber = interaction.options.getInteger('question', true);
        const questionTitle = interaction.options.getString('title');
        const difficulty = interaction.options.getString('difficulty');

        // Check if user has an active contract
        const contractResult = await api.getContract(interaction.user.id, interaction.guildId);

        if (!contractResult.success || !contractResult.data) {
            await interaction.editReply({
                content:
                    "❌ You don't have an active contract! Use `/contract create` to start your daily LeetCode commitment.",
            });
            return;
        }

        if (!contractResult.data.isActive) {
            await interaction.editReply({
                content:
                    '❌ Your contract is inactive. Use `/contract create` to start a new one!',
            });
            return;
        }

        // Submit the solution
        const result = await api.createSubmission({
            discordId: interaction.user.id,
            guildId: interaction.guildId,
            questionNumber,
            questionTitle: questionTitle || undefined,
            difficulty: difficulty || undefined,
        });

        if (!result.success) {
            if (result.error?.includes('Already submitted')) {
                await interaction.editReply({
                    content: "✅ You've already submitted today! Great job staying on track! 🎉",
                });
            } else {
                await interaction.editReply({
                    content: `❌ Failed to record submission: ${result.error}`,
                });
            }
            return;
        }

        const contract = result.data!.contract;
        const submission = result.data!.submission;

        // Get difficulty emoji
        const difficultyEmoji = difficulty
            ? { Easy: '🟢', Medium: '🟡', Hard: '🔴' }[difficulty] || '⚪'
            : '⚪';

        // Build celebration message based on streak
        let celebrationMessage = '';
        if (contract.currentStreak === 1) {
            celebrationMessage = "First day on the new streak! Let's keep it going! 🚀";
        } else if (contract.currentStreak === 7) {
            celebrationMessage = "🎉 ONE WEEK STREAK! You're on fire! 🔥";
        } else if (contract.currentStreak === 30) {
            celebrationMessage = "🏆 30 DAY STREAK! You're a LeetCode legend! 👑";
        } else if (contract.currentStreak === 100) {
            celebrationMessage = "💯 100 DAYS! You're absolutely UNSTOPPABLE! 🦾";
        } else if (contract.currentStreak % 10 === 0) {
            celebrationMessage = `🎊 ${contract.currentStreak} day streak! Amazing consistency!`;
        } else if (contract.currentStreak > contract.longestStreak) {
            celebrationMessage = '🏆 NEW PERSONAL BEST STREAK!';
        }

        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Submission Recorded!')
            .setDescription(celebrationMessage || "Great job! Today's task is complete! 💪")
            .addFields(
                {
                    name: '📝 Problem',
                    value: `#${questionNumber}${questionTitle ? ` - ${questionTitle}` : ''}`,
                    inline: true,
                },
                {
                    name: 'Difficulty',
                    value: `${difficultyEmoji} ${difficulty || 'Not specified'}`,
                    inline: true,
                },
                { name: '\u200B', value: '\u200B', inline: true },
                { name: '🔥 Current Streak', value: `${contract.currentStreak} days`, inline: true },
                { name: '🏆 Best Streak', value: `${contract.longestStreak} days`, inline: true },
                { name: '📊 Total', value: `${contract.totalSubmissions} submissions`, inline: true }
            )
            .setFooter({ text: 'Keep up the great work!' })
            .setTimestamp();

        // Add LeetCode link
        embed.addFields({
            name: '🔗 Problem Link',
            value: `[LeetCode #${questionNumber}](https://leetcode.com/problems/)`,
        });

        await interaction.editReply({ embeds: [embed] });
    },
};

export default command;
