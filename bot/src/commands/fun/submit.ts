import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types'; // Assuming this path is correct
import { submitDailyTask } from '../reminders/contractManager'; // Import the submission function

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('submit')
        .setDescription('✅ Submit your daily LeetCode completion and satisfy your contract.')
        .addStringOption(option =>
            option
                .setName('link')
                .setDescription(
                    'Optional: Link to your solution or the problem (e.g., LeetCode URL).',
                )
                .setRequired(false),
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        const link = interaction.options.getString('link');
        const userId = interaction.user.id;

        // 1. Mark the user's task as complete for today (See contractManager.ts below)
        const success = submitDailyTask(userId);

        if (success) {
            let replyContent = `🎉 **Contract Satisfied!** ${interaction.user} has submitted their LeetCode solution for today.`;
            if (link) {
                replyContent += `\n**Solution Link:** ${link}`;
            }

            // 2. Send public confirmation
            await interaction.reply({
                content: replyContent,
                ephemeral: false, // Publicly announce the submission
            });
        } else {
            // 3. Handle case where no contract exists or submission is too late
            await interaction.reply({
                content:
                    '⚠️ You do not currently have an active LeetCode contract, or the submission window has already closed for the day.',
                ephemeral: true,
            });
        }
    },
};

export default command;
