import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types';

/**
 * Ping command - Check bot latency
 *
 * This is a template for creating new commands:
 * 1. Copy this file to the appropriate category folder
 * 2. Rename the file to your command name (e.g., mycommand.ts)
 * 3. Update the data and execute function
 */

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Check the bot latency and response time'),

    // Optional: cooldown in seconds
    cooldown: 5,

    async execute(interaction: ChatInputCommandInteraction) {
        // Calculate latency
        const sent = await interaction.reply({
            content: '🏓 Pinging...',
            fetchReply: true,
        });

        const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const wsLatency = interaction.client.ws.ping;

        await interaction.editReply(
            `🏓 **Pong!**\n` +
                `> Roundtrip: \`${roundtripLatency}ms\`\n` +
                `> WebSocket: \`${wsLatency}ms\``,
        );
    },
};

export default command;
