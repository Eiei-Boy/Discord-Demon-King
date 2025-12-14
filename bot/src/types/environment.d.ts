declare global {
    namespace NodeJS {
        interface ProcessEnv {
            DISCORD_TOKEN: string;
            CLIENT_ID: string;
            GUILD_ID?: string;
            API_BASE_URL?: string; // Backend API URL for contract storage
        }
    }
}

export {};
