const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

module.exports = (client) => {

  const STATUS_CHANNEL_ID = "1484857118757752913";

  let statusMessage = null;
  let lastPayload = "";

  /* =========================
     🌐 SAFE FETCH
  ========================= */
  async function safeFetch(url) {
    try {
      const res = await fetch(url);
      return await res.json();
    } catch {
      return null;
    }
  }

  /* =========================
     ⏱️ TIME FORMAT
  ========================= */
  function formatTime(ms) {
    const hrs = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hrs <= 0) return `${mins} mins`;
    return `${hrs} hrs, ${mins} mins`;
  }

  /* =========================
     🔁 NEXT RESTART (6AM / 6PM)
  ========================= */
  function getNextRestart() {
    const now = new Date();

    const next6AM = new Date();
    next6AM.setHours(6, 0, 0, 0);

    const next6PM = new Date();
    next6PM.setHours(18, 0, 0, 0);

    if (now < next6AM) return next6AM;
    if (now < next6PM) return next6PM;

    const tomorrow6AM = new Date(next6AM);
    tomorrow6AM.setDate(tomorrow6AM.getDate() + 1);
    return tomorrow6AM;
  }

  /* =========================
     ⏱️ UPTIME (REAL)
  ========================= */
  function getUptime() {
    const now = new Date();

    const last6AM = new Date();
    last6AM.setHours(6, 0, 0, 0);

    const last6PM = new Date();
    last6PM.setHours(18, 0, 0, 0);

    let lastRestart;

    if (now >= last6PM) lastRestart = last6PM;
    else if (now >= last6AM) lastRestart = last6AM;
    else {
      lastRestart = new Date(last6PM);
      lastRestart.setDate(lastRestart.getDate() - 1);
    }

    return formatTime(now - lastRestart);
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
      let status = "🟢 Online";

      // ✅ CFX API (WORKS ON RAILWAY)
      const data = await safeFetch("https://servers-frontend.fivem.net/api/servers/single/6jabyd");

      if (!data || !data.Data) {
        status = "🔴 Offline";
      } else {
        playerCount = data.Data.clients;
        maxPlayers = data.Data.sv_maxclients;
      }

      // ⏱️ REAL TIMES
      const nextRestart = getNextRestart();
      const restartText = formatTime(nextRestart - new Date());
      const uptime = getUptime();

      // 📦 PREVENT SPAM EDIT
      const payloadKey = `${status}-${playerCount}-${restartText}-${uptime}`;
      if (payloadKey === lastPayload) return;
      lastPayload = payloadKey;

      /* =========================
         🎨 EMBED (DISTRICTX STYLE)
      ========================= */
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({ name: "Poblacion Roleplay" })
        .setDescription("Developed and Maintained by Sxph and RryBaN")

        .setThumbnail("https://cdn.discordapp.com/attachments/1469746646672867349/1469770157693075659/pgif2.gif")

.addFields(
  {
    name: "STATUS",
    value: "```🟢 Online```"
  },
  {
    name: "PLAYERS",
    value: `\`\`\`${playerCount}/${maxPlayers}\`\`\``
  },

  { name: "\u200B", value: "\u200B" },

  {
    name: "F8 CONNECT COMMAND",
    value:
"```connect poblacion.fivem.ph\nconnect poblacion.fivem.me\nconnect 143.14.88.34```"
  },

  { name: "\u200B", value: "\u200B" },

  {
    name: "NEXT RESTART",
    value: `\`\`\`in ${restartText}\`\`\``
  },
  {
    name: "UPTIME",
    value: `\`\`\`${uptime}\`\`\``
  }
)

        .setImage("https://cdn.discordapp.com/attachments/1475756977849237545/1491980601484513480/POBLACIONINTROVIDEO.gif")

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
         📌 FIND OLD MESSAGE
      ========================= */
      if (!statusMessage) {
        const messages = await channel.messages.fetch({ limit: 10 });
        statusMessage = messages.find(m =>
          m.author.id === client.user.id &&
          m.embeds.length
        ) || null;
      }

      /* =========================
         📤 SEND / EDIT
      ========================= */
      if (!statusMessage) {
        statusMessage = await channel.send({ embeds: [embed], components: [row] });
      } else {
        await statusMessage.edit({ embeds: [embed], components: [row] });
      }

    } catch (err) {
      console.error("STATUS ERROR:", err);
    }
  }

  setInterval(updateStatus, 60000);
  updateStatus();
};