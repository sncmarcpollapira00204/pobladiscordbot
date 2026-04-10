const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

// For Node < 18:
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
     📊 PLAYER BAR
  ========================= */
  function getPlayerBar(current, max) {
    const totalBars = 10;
    const percent = Math.round((current / max) * 100);
    const filled = Math.round((current / max) * totalBars);
    const empty = totalBars - filled;

    const bar = "█".repeat(filled) + "░".repeat(empty);
    return `${bar} (${percent}%)`;
  }

  /* =========================
     ⏱ CITY UPTIME (6AM / 6PM)
  ========================= */
  function getCityUptime() {
    const now = new Date();
    const lastRestart = new Date(now);
    const hour = now.getHours();

    if (hour >= 18) lastRestart.setHours(18, 0, 0, 0);
    else if (hour >= 6) lastRestart.setHours(6, 0, 0, 0);
    else {
      lastRestart.setDate(now.getDate() - 1);
      lastRestart.setHours(18, 0, 0, 0);
    }

    const diff = now - lastRestart;

    const h = Math.floor(diff / 1000 / 60 / 60);
    const m = Math.floor((diff / 1000 / 60) % 60);

    if (h === 0 && m < 5) return "Just Restarted";

    return `${h} hrs, ${m} mins`;
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

      const data = await safeFetch(
        "https://servers-frontend.fivem.net/api/servers/single/6jabyd"
      );

      if (data?.Data) {
        playerCount = data.Data.clients ?? 0;
        maxPlayers = data.Data.sv_maxclients ?? 600;
        statusType = playerCount === 0 ? "starting" : "online";
      }

      // 🔥 PULSE EFFECT
      const pulse = Date.now() % 2000 < 1000 ? "🟢" : "🟩";

      // 🔥 SMART STATUS
      let statusDisplay = "🔴  Offline";

      if (statusType === "online") {
        if (playerCount >= maxPlayers) {
          statusDisplay = "🔴  Full";
        } else if (playerCount >= maxPlayers * 0.9) {
          statusDisplay = "🟠  Almost Full";
        } else if (playerCount >= maxPlayers * 0.7) {
          statusDisplay = "🟡  High Population";
        } else {
          statusDisplay = `${pulse}  Online`;
        }
      } else if (statusType === "starting") {
        statusDisplay = "🟠  Starting";
      }

      // ⚠️ PLAYER WARNING
      let warning = "";
      if (playerCount >= maxPlayers) warning = "\n🚨 Server Full";
      else if (playerCount >= maxPlayers * 0.9) warning = "\n⚠️ Almost Full";

      // 🔒 Anti-spam
      const payloadKey = `${statusType}-${playerCount}`;
      if (payloadKey === lastPayload) return;
      lastPayload = payloadKey;

      /* =========================
         🎨 EMBED
      ========================= */
      const embed = new EmbedBuilder()
        .setColor(
          playerCount >= maxPlayers
            ? 0xED4245
            : playerCount >= maxPlayers * 0.8
            ? 0xFEE75C
            : 0x57F287
        )

        .setAuthor({
          name: "Poblacion Roleplay",
          iconURL: "https://cdn.discordapp.com/attachments/1469746646672867349/1469770055586676770/poblamain.png"
        })

        .setDescription("Developed and Maintained by Sxph")

        .addFields({
          name: "\u200b",
          value:
`> **STATUS**
${statusDisplay}

> **PLAYERS**
${playerCount}/${maxPlayers}
${getPlayerBar(playerCount, maxPlayers)}${warning}

> **F8 CONNECT COMMAND**
connect poblacion.fivem.ph
connect poblacion.fivem.me

> **NEXT RESTART**
NOT SCHEDULED

> **UPTIME**
${getCityUptime()}`
        })

        .setThumbnail("https://cdn.discordapp.com/attachments/1469746646672867349/1469770055586676770/poblamain.png")

        .setImage("https://cdn.discordapp.com/attachments/1475756977849237545/1491980601484513480/POBLACIONINTROVIDEO.gif")

        .setFooter({
          text: "txAdmin 8.0.1 • Live Status"
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
         📌 MESSAGE HANDLING
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

  setInterval(updateStatus, 15000); // ⚡ faster updates
  updateStatus();
};