// Made / Edited by @Maxine (Optimized by ChatGPT)

require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  Collection,
  GatewayIntentBits,
  Events
} = require("discord.js");

/* ===============================
   HANDLERS
=============================== */

const namechangeHandler = require("./interactions/namechange");
const startStatusSystem = require("./utils/statusSystem");

// GANG
const gangSelectHandler = require("./interactions/gangSelect");
const gangRequestHandler = require("./interactions/gangRequest");

// ✅ JOB (ADDED ONLY — walang binago sa iba)
const jobSelectHandler = require("./interactions/jobSelect");
const jobRequestHandler = require("./interactions/jobRequest");

/* ===============================
   CLIENT SETUP
=============================== */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* ===============================
   LOAD HANDLERS
=============================== */

const buttonHandlers = [
  gangRequestHandler, // 🔥 PRIORITY FIRST
  jobRequestHandler,  // ✅ ADD (job buttons)
  require("./interactions/buttons"),
  require("./interactions/noVoucherButtons")
];

const modalHandlers = [
  gangRequestHandler, // 🔥 PRIORITY FIRST
  jobRequestHandler,  // ✅ ADD (job modals)
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

  startStatusSystem(client);
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

    /* =========================
       SELECT MENU
    ========================= */
    if (interaction.isStringSelectMenu()) {

      // GANG
      await gangSelectHandler(interaction);
      if (interaction.replied || interaction.deferred) return;

      // ✅ JOB
      await jobSelectHandler(interaction);
      if (interaction.replied || interaction.deferred) return;

      return;
    }

    /* =========================
       SLASH COMMANDS
    ========================= */
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction);
      return;
    }

    /* =========================
       BUTTONS
    ========================= */
    if (interaction.isButton()) {

      // 🔥 NAME CHANGE FIRST
      await namechangeHandler(interaction);
      if (interaction.replied || interaction.deferred) return;

      // 🔥 ALL BUTTON HANDLERS
      for (const handler of buttonHandlers) {
        await handler(interaction);
        if (interaction.replied || interaction.deferred) return;
      }
    }

    /* =========================
       MODALS
    ========================= */
    if (interaction.isModalSubmit()) {

      // 🔥 NAME CHANGE FIRST
      await namechangeHandler(interaction);
      if (interaction.replied || interaction.deferred) return;

      // 🔥 ALL MODAL HANDLERS
      for (const handler of modalHandlers) {
        await handler(interaction);
        if (interaction.replied || interaction.deferred) return;
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