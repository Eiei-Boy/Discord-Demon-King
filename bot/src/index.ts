import { Client, GatewayIntentBits, Collection } from 'discord.js';
import dotenv from 'dotenv';
import { ExtendedClient, Command } from './types';
import { loadCommands } from './commands';
import { loadEvents } from './events';
import { logger } from './utils/logger';
import { initializeScheduler } from './services/scheduler';

// Load environment variables
dotenv.config();

/**
 * Main bot initialization
 */
async function main() {
    // Create a new Discord client with necessary intents
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            // Add more intents as needed:
            // GatewayIntentBits.GuildMembers,      // For member events (requires privileged intent)
            // GatewayIntentBits.MessageContent,    // For message content (requires privileged intent)
            // GatewayIntentBits.GuildVoiceStates,  // For voice state events
        ],
    }) as ExtendedClient;

    // Initialize commands collection
    client.commands = new Collection<string, Command>();

    // Validate token
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
        logger.error('DISCORD_TOKEN is not set in .env file');
        process.exit(1);
    }

    try {
        // Load all commands
        logger.info('Loading commands...');
        client.commands = await loadCommands();

        // Load all events
        logger.info('Loading events...');
        await loadEvents(client);

        // Login to Discord
        logger.info('Logging in to Discord...');
        await client.login(token);

        // Initialize scheduler after login (needs client to be ready)
        logger.info('Initializing scheduler...');
        await initializeScheduler(client);
    } catch (error) {
        logger.error('Failed to start bot:', error);
        process.exit(1);
    }
}

// Start the bot
main();
