# Discord Demon King Bot

A Discord bot built with TypeScript and discord.js.

## Prerequisites

- Node.js 18.x or higher
- npm or yarn
- A Discord Bot Token (from [Discord Developer Portal](https://discord.com/developers/applications))

## Setup

1. **Install dependencies:**

    ```bash
    npm install
    ```

2. **Configure environment variables:**

    Copy `.env.example` to `.env` and fill in your bot token:

    ```bash
    cp .env.example .env
    ```

    Edit `.env` and add your Discord bot token.

3. **Build the project:**

    ```bash
    npm run build
    ```

4. **Start the bot:**

    ```bash
    npm start
    ```

## Development

Run the bot in development mode (using ts-node):

```bash
npm run dev
```

Watch for changes and rebuild automatically:

```bash
npm run watch
```

## Project Structure

```
├── src/
│   ├── index.ts          # Main entry point
│   └── types/
│       └── environment.d.ts  # Type definitions for env variables
├── dist/                 # Compiled JavaScript (generated)
├── .env                  # Environment variables (create from .env.example)
├── .env.example          # Example environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Commands

Currently available commands:

- `!ping` - Responds with "Pong! 🏓"

## Adding More Features

You can extend the bot by:

1. Adding more message commands in `src/index.ts`
2. Implementing slash commands using discord.js interactions
3. Creating event handlers in separate files
4. Adding a command handler system for better organization

## License

MIT
