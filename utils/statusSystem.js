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
      const res = await fetch(url, { timeout: 5000 });
      return await res.json();
    } catch {
      return null;
    }
  }

  /* =========================
     ✨ TEXT SPACING (DistrictX style)
  ========================= */
  function spaced(text) {
    return text.split("").join(" ");
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
      let statusText = "🔴 Offline";

      // 🔥 MAIN API
      const data = await safeFetch("https://servers-frontend.fivem.net/api/servers/single/6jabyd");

      // 🔥 DIRECT SERVER CHECK (REAL STATUS)
      const directCheck = await safeFetch("http://143.14.88.34:30120/info.json");

      if (!data || !data.Data || !directCheck) {
        statusText = "🔴 Offline";
      } else {
        playerCount = data.Data.clients ?? 0;
        maxPlayers = data.Data.sv_maxclients ?? 600;

        if (playerCount === 0) {
          statusText = "🟠 " + spaced("Starting");
        } else {
          statusText = "🟢 " + spaced("Online");
        }
      }

      // 🔒 Prevent spam edits
      const payloadKey = `${statusText}-${playerCount}`;
      if (payloadKey === lastPayload) return;
      lastPayload = payloadKey;

      /* =========================
         🎨 DISTRICTX STYLE EMBED
      ========================= */
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)

        .setTitle("Poblacion Roleplay")
        .setDescription("Developed and Maintained by Sxph")

        .setThumbnail("https://cdn.discordapp.com/attachments/1469746646672867349/1469770157693075659/pgif2.gif")

        .addFields(
          {
            name: "STATUS",
            value: `│ ${statusText}`
          },
          {
            name: "PLAYERS",
            value: `│ ${playerCount}/${maxPlayers}`
          },
          {
            name: "F8 CONNECT COMMAND",
            value:
`│ connect poblacion.fivem.ph
│ connect poblacion.fivem.me`
          }
        )

        .setImage("https://cdn.discordapp.com/attachments/1475756977849237545/1491980601484513480/POBLACIONINTROVIDEO.gif")

        .setFooter({
          text: "txAdmin 8.0.1 • Updated every minute"
        });

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