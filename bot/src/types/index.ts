import { Client, Collection, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

// Extended command interface
export interface Command {
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    cooldown?: number; // Optional cooldown in seconds
}

// Extended client with commands collection
export interface ExtendedClient extends Client {
    commands: Collection<string, Command>;
}

// Event handler interface
export interface Event {
    name: string;
    once?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: (...args: any[]) => void | Promise<void>;
}
