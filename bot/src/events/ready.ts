import { Client, Events, ActivityType } from 'discord.js';
import { Event } from '../types';
import { logger } from '../utils/logger';

/**
 * Ready event - Fires once when the bot successfully logs in
 */
const event: Event = {
    name: Events.ClientReady,
    once: true,

    execute(client: Client<true>) {
        logger.success(`Logged in as ${client.user.tag}!`);
        logger.info(`Bot is in ${client.guilds.cache.size} server(s)`);
        logger.info(`Serving ${client.users.cache.size} user(s)`);

        // Set bot status/activity
        client.user.setPresence({
            activities: [
                {
                    name: '/help | Demon King',
                    type: ActivityType.Watching,
                },
            ],
            status: 'online',
        });

        // You can add more startup tasks here:
        // - Load data from database
        // - Initialize caches
        // - Start scheduled tasks
    },
};

export default event;
