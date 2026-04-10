const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

// ✅ IMPORTANT (for Node < 18)
// Uncomment if needed:
// const fetch = require("node-fetch");

module.exports = (client) => {

  const STATUS_CHANNEL_ID = "1484857118757752913";

  let statusMessage = null;
  let lastPayload = "";

  /* =========================
     🌐 SAFE FETCH
  ========================= */
  async function safeFetch(url) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /* =========================
     ✨ TEXT SPACING
  ========================= */
  function spaced(text) {
    return text.split("").join(" ");
  }

  /* =========================
     🎨 FORMAT STATUS
  ========================= */
  function formatStatus(type) {
    if (type === "online") return `🟢  ${spaced("Online")}`;
    if (type === "starting") return `🟠  ${spaced("Starting")}`;
    return `🔴  ${spaced("Offline")}`;
  }

  /* =========================
     🔄 UPDATE LOOP
  ========================= */
  async function updateStatus() {
    try {
      const channel = await client.channels.fetch(STATUS_CHANNEL_ID).catch(() => null);
      if (!channel) return;

      let playerCount = 0;
      let maxPlayers = 600;
      let statusType = "offline";

      // ✅ ONLY FiveM API (FIXED)
      const data = await safeFetch(
        "https://servers-frontend.fivem.net/api/servers/single/6jabyd"
      );

      if (data?.Data) {
        playerCount = data.Data.clients ?? 0;
        maxPlayers = data.Data.sv_maxclients ?? 600;

        // smarter status logic
        if (playerCount === 0) {
          statusType = "starting";
        } else {
          statusType = "online";
        }
      } else {
        statusType = "offline";
      }

      const statusText = formatStatus(statusType);

      // 🔒 Anti-spam edit
      const payloadKey = `${statusType}-${playerCount}`;
      if (payloadKey === lastPayload) return;
      lastPayload = payloadKey;

      /* =========================
         🎨 EMBED
      ========================= */
// 🧠 UPTIME
const uptimeSeconds = Math.floor(process.uptime());
const hours = Math.floor(uptimeSeconds / 3600);
const minutes = Math.floor((uptimeSeconds % 3600) / 60);

// 🕒 NEXT RESTART (countdown)
function getRestartCountdown() {
  const now = new Date();
  const currentHour = now.getHours();

  const nextHour = Math.ceil(currentHour / 6) * 6;
  const next = new Date();
  next.setHours(nextHour, 0, 0, 0);

  const diff = next - now;

  const h = Math.floor(diff / 1000 / 60 / 60);
  const m = Math.floor((diff / 1000 / 60) % 60);

  return `in ${h} hrs, ${m} mins`;
}

const embed = new EmbedBuilder()
  .setColor(
    statusType === "online"
      ? 0x57F287
      : statusType === "starting"
      ? 0xFEE75C
      : 0xED4245
  )

  // 🔝 HEADER
  .setAuthor({
    name: "Poblacion Roleplay",
    iconURL: "https://cdn.discordapp.com/attachments/1469746646672867349/1469770055586676770/poblamain.png"
  })

  .setDescription("Developed and Maintained by Sxph")

  // 🧾 HYBRID CONTENT (QUOTE STYLE)
    .addFields({
      name: "\u200b",
      value:
    `> **STATUS**
    > 🟢 \`ONLINE\`

    > **PLAYERS**
    > \`${playerCount}/${maxPlayers}\`

    > **F8 CONNECT COMMAND**
    > \`connect poblacion.fivem.ph\`
    > \`connect poblacion.fivem.me\`

    > **NEXT RESTART**
    > \`${getRestartCountdown()}\`

    > **UPTIME**
    > \`${hours} hrs, ${minutes} mins\``
    })

  // 🎨 VISUALS
  .setThumbnail("https://cdn.discordapp.com/attachments/1469746646672867349/1469770055586676770/poblamain.png")

  .setImage("https://cdn.discordapp.com/attachments/1475756977849237545/1491980601484513480/POBLACIONINTROVIDEO.gif")

  // 🔻 FOOTER
  .setFooter({
    text: "txAdmin 8.0.1 • Updated every minute"
  })

  .setTimestamp();

      /* =========================
         🔘 BUTTON
      ========================= */
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Connect")
          .setStyle(ButtonStyle.Link)
          .setURL("https://cfx.re/join/6jabyd")
      );

      /* =========================
         📌 FIND / CREATE MESSAGE
      ========================= */
      if (!statusMessage) {
        const messages = await channel.messages.fetch({ limit: 10 });
        statusMessage = messages.find(m =>
          m.author.id === client.user.id &&
          m.embeds.length
        ) || null;
      }

      if (!statusMessage) {
        statusMessage = await channel.send({
          embeds: [embed],
          components: [row]
        });
      } else {
        await statusMessage.edit({
          embeds: [embed],
          components: [row]
        });
      }

    } catch (err) {
      console.error("STATUS ERROR:", err);
    }
  }

  setInterval(updateStatus, 60000);
  updateStatus();
};