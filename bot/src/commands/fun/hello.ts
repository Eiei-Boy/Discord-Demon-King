import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('hello')
        .setDescription('👋 Say hello to someone!')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to greet (optional)')
                .setRequired(false),
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        // Get the target user, default to the command user
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const isself = targetUser.id === interaction.user.id;

        const greetings = [
            `👋 Hello, ${targetUser}!`,
            `Hey there, ${targetUser}! 🌟`,
            `Greetings, ${targetUser}! ✨`,
            `What's up, ${targetUser}? 😎`,
            `Howdy, ${targetUser}! 🤠`,
        ];

        // Pick a random greeting
        const greeting = greetings[Math.floor(Math.random() * greetings.length)];

        if (isself) {
            await interaction.reply(`${greeting}\n*Nice to meet you!*`);
        } else {
            await interaction.reply(`${greeting}\n*${interaction.user.username} says hi!*`);
        }
    },
};

export default command;
