// Made / Edited by @Maxine

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const namechangeHandler = require("./interactions/namechange");
// ❌ Removed messageFilter


const {
  Client,
  Collection,
  GatewayIntentBits,
  Events
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ❌ Removed messageCreate listener for messageFilter

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* ===============================
   LOAD BUTTON & MODAL HANDLERS
   =============================== */

const buttonHandlers = [
  require("./interactions/buttons"),
  require("./interactions/noVoucherButtons"),
];

const modalHandlers = [
  require("./interactions/modals"),
  require("./interactions/noVoucherModal"),
  require("./interactions/revokeModal")
];

/* ===============================
   SLASH COMMANDS
   =============================== */

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  }
}

/* ===============================
   READY
   =============================== */

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const restartChannel = "1470750976368578630";

  try {
    const channel = await client.channels.fetch(restartChannel);

    if (channel) {
      await channel.send({
        content: "✅ **Gatekeeper is now back online.**"
      });
    }

  } catch (err) {
    console.error("Failed to send restart confirmation:", err);
  }
});

/* ===============================
   INTERACTION HANDLER
   =============================== */

client.on(Events.InteractionCreate, async interaction => {
  try {

    // SLASH COMMANDS
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      await Promise.resolve(command.execute(interaction));
    }

    // BUTTONS
    else if (interaction.isButton()) {

      await namechangeHandler(interaction);
      if (interaction.replied || interaction.deferred) return;

      for (const handler of buttonHandlers) {
        await handler(interaction);
        if (interaction.replied || interaction.deferred) break;
      }
    }

    // MODALS
    else if (interaction.isModalSubmit()) {

      await namechangeHandler(interaction);
      if (interaction.replied || interaction.deferred) return;

      for (const handler of modalHandlers) {
        await handler(interaction);
        if (interaction.replied || interaction.deferred) break;
      }
    }

  } catch (error) {
    console.error("❌ Interaction error:", error);

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ An unexpected error occurred.",
          ephemeral: true
        }).catch(() => {});
      }
    } catch (err) {
      console.error("❌ Failed to send error response:", err);
    }
  }
});

/* ===============================
   LOGIN
   =============================== */

client.login(process.env.TOKEN);