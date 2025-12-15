import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    version,
} from 'discord.js';
import { Command } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('📊 Get information about the bot'),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client;

        // Calculate uptime
        const uptime = client.uptime || 0;
        const days = Math.floor(uptime / 86400000);
        const hours = Math.floor((uptime % 86400000) / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        const seconds = Math.floor((uptime % 60000) / 1000);

        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // Create embed
        const embed = new EmbedBuilder()
            .setColor(0x5865f2) // Discord blurple
            .setTitle('🤖 Bot Information')
            .setThumbnail(client.user?.displayAvatarURL() || '')
            .addFields(
                {
                    name: '📛 Bot Name',
                    value: client.user?.tag || 'Unknown',
                    inline: true,
                },
                {
                    name: '🆔 Bot ID',
                    value: client.user?.id || 'Unknown',
                    inline: true,
                },
                {
                    name: '🌐 Servers',
                    value: `${client.guilds.cache.size}`,
                    inline: true,
                },
                {
                    name: '👥 Users',
                    value: `${client.users.cache.size}`,
                    inline: true,
                },
                {
                    name: '📺 Channels',
                    value: `${client.channels.cache.size}`,
                    inline: true,
                },
                {
                    name: '⏱️ Uptime',
                    value: uptimeString,
                    inline: true,
                },
                {
                    name: '📚 Discord.js',
                    value: `v${version}`,
                    inline: true,
                },
                {
                    name: '🟢 Node.js',
                    value: process.version,
                    inline: true,
                },
                {
                    name: '💾 Memory',
                    value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
                    inline: true,
                },
            )
            .setFooter({ text: 'Demon King Bot' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};

export default command;
