import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { getCommandsData } from './commands';
import { logger } from './utils/logger';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; // Optional: for faster testing in a specific server

if (!token || !clientId) {
    logger.error('DISCORD_TOKEN and CLIENT_ID must be set in .env file');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

/**
 * Deploy commands to Discord
 *
 * Usage:
 *   npm run deploy           - Deploy globally (takes up to 1 hour to update)
 *   npm run deploy -- --guild - Deploy to test guild only (instant update)
 */
async function deployCommands() {
    try {
        // Auto-load all commands from the commands folder
        const commands = await getCommandsData();

        logger.info(`Found ${commands.length} commands to deploy`);

        // Check for --guild flag for guild-specific deployment
        const deployToGuild = process.argv.includes('--guild');

        if (deployToGuild && guildId) {
            // Deploy to specific guild (instant update, good for testing)
            logger.info(`Deploying commands to guild: ${guildId}`);

            await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
                body: commands,
            });

            logger.success(`Successfully deployed ${commands.length} commands to guild!`);
        } else {
            // Deploy globally (takes up to 1 hour to propagate)
            logger.info('Deploying commands globally...');

            await rest.put(Routes.applicationCommands(clientId), {
                body: commands,
            });

            logger.success(`Successfully deployed ${commands.length} commands globally!`);
            logger.info('Note: Global commands may take up to 1 hour to update');
        }
    } catch (error) {
        logger.error('Error deploying commands:', error);
        process.exit(1);
    }
}

deployCommands();
