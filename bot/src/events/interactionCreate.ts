import { Events, Interaction, Collection } from 'discord.js';
import { Event, ExtendedClient } from '../types';
import { logger } from '../utils/logger';

// Cooldown tracking
const cooldowns = new Collection<string, Collection<string, number>>();

/**
 * InteractionCreate event - Handles all interactions (commands, buttons, etc.)
 */
const event: Event = {
    name: Events.InteractionCreate,

    async execute(interaction: Interaction) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const client = interaction.client as ExtendedClient;
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                logger.warn(`No command found for: ${interaction.commandName}`);
                await interaction.reply({
                    content: '❌ This command is not available.',
                    ephemeral: true,
                });
                return;
            }

            // Log command usage
            logger.command(interaction.commandName, interaction.user.tag, interaction.guild?.name);

            // Handle cooldowns
            if (command.cooldown) {
                if (!cooldowns.has(command.data.name)) {
                    cooldowns.set(command.data.name, new Collection());
                }

                const now = Date.now();
                const timestamps = cooldowns.get(command.data.name)!;
                const cooldownAmount = command.cooldown * 1000;

                if (timestamps.has(interaction.user.id)) {
                    const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;

                    if (now < expirationTime) {
                        const timeLeft = (expirationTime - now) / 1000;
                        await interaction.reply({
                            content: `⏱️ Please wait **${timeLeft.toFixed(1)}** seconds before using \`/${command.data.name}\` again.`,
                            ephemeral: true,
                        });
                        return;
                    }
                }

                timestamps.set(interaction.user.id, now);
                setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
            }

            // Execute the command
            try {
                await command.execute(interaction);
            } catch (error) {
                logger.error(`Error executing command ${interaction.commandName}:`, error);

                const errorMessage = '❌ There was an error executing this command!';

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            }
        }

        // Handle button interactions
        else if (interaction.isButton()) {
            // Example: Handle button clicks
            // const buttonId = interaction.customId;
            // logger.info(`Button clicked: ${buttonId}`);
            // await interaction.reply({ content: 'Button clicked!', ephemeral: true });
        }

        // Handle select menu interactions
        else if (interaction.isStringSelectMenu()) {
            // Example: Handle select menu selections
            // const selected = interaction.values[0];
            // logger.info(`Selected: ${selected}`);
        }

        // Handle modal submissions
        else if (interaction.isModalSubmit()) {
            // Example: Handle modal form submissions
            // const inputValue = interaction.fields.getTextInputValue('input_id');
        }

        // Handle autocomplete
        else if (interaction.isAutocomplete()) {
            const commandName = interaction.commandName;

            // Handle contract command autocomplete
            if (commandName === 'contract') {
                const { handleContractAutocomplete } = await import('../commands/leetcode/contract');
                await handleContractAutocomplete(interaction);
            }
        }
    },
};

export default event;
