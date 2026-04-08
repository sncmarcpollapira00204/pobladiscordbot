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
   HANDLERS (ONLY WHAT YOU NEED)
=============================== */

const namechangeHandler = require("./interactions/namechange");

// ✅ ONLY USE MERGED SYSTEM
const requestHandler = require("./interactions/requestHandler");

// SELECT HANDLERS (UI only)
const gangSelectHandler = require("./interactions/gangSelect");
const jobSelectHandler = require("./interactions/jobSelect");

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
   SLASH COMMANDS
=============================== */

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  }
}

/* ===============================
   READY
=============================== */

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch("1470750976368578630");
    if (channel) {
      await channel.send("✅ **Gatekeeper is now back online.**");
    }
  } catch (err) {
    console.error("Restart message failed:", err);
  }
});

/* ===============================
   INTERACTIONS
=============================== */

client.on(Events.InteractionCreate, async (interaction) => {
  try {

    /* ===== SELECT ===== */
    if (interaction.isStringSelectMenu()) {
      await gangSelectHandler(interaction);
      if (interaction.replied || interaction.deferred) return;

      await jobSelectHandler(interaction);
      if (interaction.replied || interaction.deferred) return;

      return;
    }

    /* ===== SLASH ===== */
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction);
      return;
    }

    /* ===== BUTTON + MODAL (MERGED SYSTEM ONLY) ===== */
    if (interaction.isButton() || interaction.isModalSubmit()) {

      // name change priority
      await namechangeHandler(interaction);
      if (interaction.replied || interaction.deferred) return;

      // ✅ ONE HANDLER ONLY
      await requestHandler(interaction);
      return;
    }

  } catch (error) {
    console.error("❌ Interaction error:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Unexpected error occurred.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

/* ===============================
   LOGIN
=============================== */

client.login(process.env.TOKEN);