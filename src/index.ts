import { Client, GatewayIntentBits, Events, Collection } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a new Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

// When the client is ready, run this code once
client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Ready! Logged in as ${readyClient.user.tag}`);
});

// Handle slash command interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    const latency = Date.now() - interaction.createdTimestamp;
    await interaction.reply(`🏓 Pong! Latency: ${latency}ms`);
  } 
  else if (commandName === 'hello') {
    await interaction.reply(`👋 Hello, ${interaction.user.username}!`);
  }
  else if (commandName === 'info') {
    await interaction.reply({
      content: `🤖 **Bot Info**\n` +
        `• Name: ${client.user?.tag}\n` +
        `• Servers: ${client.guilds.cache.size}\n` +
        `• Uptime: ${Math.floor((client.uptime || 0) / 1000)}s`,
    });
  }
});

// Login to Discord with your bot token
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('❌ DISCORD_TOKEN is not set in .env file');
  process.exit(1);
}

client.login(token);
