import { Collection } from 'discord.js';
import { Command } from '../types';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * Loads all commands from subdirectories
 * Each subdirectory represents a category (e.g., general, fun, moderation)
 */
export async function loadCommands(): Promise<Collection<string, Command>> {
    const commands = new Collection<string, Command>();
    const commandsPath = __dirname;

    // Get all category folders
    const categoryFolders = fs
        .readdirSync(commandsPath)
        .filter(file => fs.statSync(path.join(commandsPath, file)).isDirectory());

    for (const category of categoryFolders) {
        const categoryPath = path.join(commandsPath, category);

        // Get all command files in this category
        const commandFiles = fs
            .readdirSync(categoryPath)
            .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(categoryPath, file);

            try {
                // Dynamic import for the command
                const commandModule = await import(filePath);
                const command: Command = commandModule.default || commandModule;

                // Validate command structure
                if ('data' in command && 'execute' in command) {
                    commands.set(command.data.name, command);
                    logger.info(`Loaded command: /${command.data.name} [${category}]`);
                } else {
                    logger.warn(`Command at ${filePath} is missing "data" or "execute" property`);
                }
            } catch (error) {
                logger.error(`Failed to load command at ${filePath}:`, error);
            }
        }
    }

    logger.success(`Loaded ${commands.size} commands total`);
    return commands;
}

/**
 * Gets all command data for deployment (registering with Discord)
 */
export async function getCommandsData() {
    const commands = await loadCommands();
    return commands.map(command => command.data.toJSON());
}
