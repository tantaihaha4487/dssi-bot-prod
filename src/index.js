const { Client, GatewayIntentBits, Events, Collection } = require("discord.js");
const { registerHandlers } = require("./utils/handler");
require("dotenv").config();
const { BOT_TOKEN } = process.env;

if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN in .env.");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
});

client.commands = new Collection();

registerHandlers(client);

client.login(BOT_TOKEN);
