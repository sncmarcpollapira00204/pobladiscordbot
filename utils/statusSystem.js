
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

  const RESTART_INTERVAL_HOURS = 12;
  let serverStartTime = Date.now();

  // ⏱️ FORMAT TIME
  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  }

  // 🌐 SAFE FETCH (prevents hanging)
  async function safeFetch(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      return await res.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function updateStatus() {
    try {
      const channel = await client.channels.fetch(STATUS_CHANNEL_ID).catch(() => null);
      if (!channel) return;

      let playerCount = 0;
      let maxPlayers = 600;
      let status = "🟢 Online";

      // 🔥 FETCH DATA
            const data = await safeFetch("https://servers-frontend.fivem.net/api/servers/single/6jabyd");

            if (!data || !data.Data) {
            status = "🔴 Offline";
            } else {
            playerCount = data.Data.clients;
            maxPlayers = data.Data.sv_maxclients;
            }
            
      // ⏱️ UPTIME
      const uptime = formatTime(Date.now() - serverStartTime);

      // 🔁 RESTART TIMER
      const nextRestart = serverStartTime + (RESTART_INTERVAL_HOURS * 3600000);
      const timeLeft = nextRestart - Date.now();

      let restartText = "Restarting...";
      if (timeLeft > 0) {
        restartText = formatTime(timeLeft);
      } else {
        serverStartTime = Date.now();
      }

      // 📦 PAYLOAD HASH (prevents useless edits)
      const payloadKey = `${status}-${playerCount}-${uptime}-${restartText}`;

      if (payloadKey === lastPayload) return;
      lastPayload = payloadKey;

      // 🎨 EMBED
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({ name: "Poblacion Roleplay" })
        .setDescription("Developed and Maintained by Sxph and RryBaN")

        .setThumbnail("https://cdn.discordapp.com/attachments/1469746646672867349/1469770157693075659/pgif2.gif") // 👈 RIGHT SIDE

        .addFields(
          { name: "STATUS", value: "🟢 Online" },
          { name: "PLAYERS", value: `${playerCount}/${maxPlayers}` },

          { name: "\u200B", value: "\u200B" },

          {
            name: "F8 CONNECT COMMAND",
            value: "```bash\nconnect poblacion.fivem.ph\nconnect poblacion.fivem.me```"
          },

          { name: "NEXT RESTART", value: restartText },
          { name: "UPTIME", value: uptime }
        )

        .setImage("https://cdn.discordapp.com/attachments/1475756977849237545/1491980601484513480/POBLACIONINTROVIDEO.gif") // 👈 BOTTOM

        .setFooter({ text: "txAdmin • Updated every minute" })
        .setTimestamp();

      // 🔘 BUTTON
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Connect")
          .setStyle(ButtonStyle.Link)
          .setURL("https://cfx.re/join/6jabyd")
      );

      // 📌 FIND OLD MESSAGE (on restart)
      if (!statusMessage) {
        const messages = await channel.messages.fetch({ limit: 10 });
        statusMessage = messages.find(m =>
          m.author.id === client.user.id &&
          m.embeds.length &&
          m.embeds[0].title === "Poblacion City Roleplay"
        ) || null;
      }

      // 📤 SEND OR EDIT
      if (!statusMessage) {
        statusMessage = await channel.send({ embeds: [embed], components: [row] });
      } else {
        await statusMessage.edit({ embeds: [embed], components: [row] });
      }

    } catch (err) {
      console.error("STATUS ERROR:", err);
    }
  }

  // 🔄 LOOP
  setInterval(updateStatus, 60000);
  updateStatus();
};