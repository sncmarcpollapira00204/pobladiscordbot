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
     🔄 UPDATE LOOP
  ========================= */
  async function updateStatus() {
    try {
      const channel = await client.channels.fetch(STATUS_CHANNEL_ID).catch(() => null);
      if (!channel) return;

      let playerCount = 0;
      let maxPlayers = 600;
      let statusText = "🟢 Online";

      // ✅ CFX API
      const data = await safeFetch("https://servers-frontend.fivem.net/api/servers/single/6jabyd");

      if (!data || !data.Data) {
        statusText = "🔴 Offline";
      } else {
        playerCount = data.Data.clients;
        maxPlayers = data.Data.sv_maxclients;
      }

      // 🔒 Prevent spam edits
      const payloadKey = `${statusText}-${playerCount}`;
      if (payloadKey === lastPayload) return;
      lastPayload = payloadKey;

      /* =========================
         🎨 DISTRICTX STYLE EMBED
      ========================= */
      const embed = new EmbedBuilder()
        .setColor(0x111214)

        .setTitle("Poblacion Roleplay")
        .setDescription("Developed and Maintained by Sxph")

        .setThumbnail("https://cdn.discordapp.com/attachments/1469746646672867349/1469770157693075659/pgif2.gif")

        .addFields(
          {
            name: "STATUS",
            value: statusText,
            inline: true
          },
          {
            name: "PLAYERS",
            value: `${playerCount}/${maxPlayers}`,
            inline: true
          },
          {
            name: "\u200B",
            value: "\u200B"
          },
          {
            name: "CONNECT",
            value: "```connect poblacion.fivem.ph```"
          }
        )

        .setImage("https://cdn.discordapp.com/attachments/1475756977849237545/1491980601484513480/POBLACIONINTROVIDEO.gif")

        .setFooter({
          text: "Poblacion • Live Status"
        });

      /* =========================
         🔘 BUTTON
      ========================= */
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Join Server")
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