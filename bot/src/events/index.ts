import { Client } from 'discord.js';
import { Event } from '../types';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * Loads and registers all event handlers
 * Each .ts file in the events folder (except index.ts) is an event handler
 */
export async function loadEvents(client: Client): Promise<void> {
    const eventsPath = __dirname;

    // Get all event files (excluding index.ts)
    const eventFiles = fs
        .readdirSync(eventsPath)
        .filter(
            file =>
                (file.endsWith('.ts') || file.endsWith('.js')) &&
                file !== 'index.ts' &&
                file !== 'index.js',
        );

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);

        try {
            const eventModule = await import(filePath);
            const event: Event = eventModule.default || eventModule;

            // Validate event structure
            if ('name' in event && 'execute' in event) {
                // Register the event
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args));
                } else {
                    client.on(event.name, (...args) => event.execute(...args));
                }

                logger.info(`Loaded event: ${event.name}${event.once ? ' (once)' : ''}`);
            } else {
                logger.warn(`Event at ${filePath} is missing "name" or "execute" property`);
            }
        } catch (error) {
            logger.error(`Failed to load event at ${filePath}:`, error);
        }
    }

    logger.success(`Loaded ${eventFiles.length} events`);
}
