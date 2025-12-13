import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
    console.error('❌ DISCORD_TOKEN and CLIENT_ID must be set in .env file');
    process.exit(1);
}

// Define your slash commands here
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
    new SlashCommandBuilder().setName('hello').setDescription('Says hello to you!'),
    new SlashCommandBuilder().setName('info').setDescription('Get information about the bot'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

        // Register commands globally (available in all servers)
        const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });

        console.log(`✅ Successfully reloaded application (/) commands.`);
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
})();
