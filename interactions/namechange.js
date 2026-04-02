const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const config = require("../config.json");

module.exports = async (interaction) => {

  /* =========================
     BUTTONS
     ========================= */
  if (interaction.isButton()) {

    /* OPEN MODAL */
    if (interaction.customId === "open_namechange_modal") {

      if (!interaction.member.roles.cache.has(config.citizenRoleId)) {
        return interaction.reply({
          content: "❌ Only Citizens can request.",
          flags: 64
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("namechange_submit")
        .setTitle("Name Change Request");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("new_name")
            .setLabel("New RP Name")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    /* APPROVE / DENY */
    if (
      interaction.customId === "namechange_approve" ||
      interaction.customId === "namechange_deny"
    ) {

      const isAdmin = config.adminRoleIds?.some(roleId =>
        interaction.member.roles.cache.has(roleId)
      );

      if (!isAdmin) {
        return interaction.reply({
          content: "❌ You are not allowed to approve/deny.",
          flags: 64
        });
      }

      const embedRaw = interaction.message.embeds[0];
      if (!embedRaw) {
        return interaction.reply({ content: "❌ Invalid embed.", flags: 64 });
      }

      const embed = EmbedBuilder.from(embedRaw);

      const footer = embed.data.footer?.text;
      if (!footer?.startsWith("UID:")) {
        return interaction.reply({
          content: "❌ Invalid application embed.",
          flags: 64
        });
      }

      const userId = footer.replace("UID:", "");

      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return interaction.reply({
          content: "❌ User not found.",
          flags: 64
        });
      }

      const newName = embed.data.fields[1]?.value;
      if (!newName) {
        return interaction.reply({
          content: "❌ Requested name missing.",
          flags: 64
        });
      }

      const fields = embed.data.fields;

      /* APPROVE */
      if (interaction.customId === "namechange_approve") {

        try {
          const safeName = newName.trim().slice(0, 32);

          if (safeName.length < 3) {
            return interaction.reply({
              content: "❌ Invalid name.",
              flags: 64
            });
          }

          await member.setNickname(safeName);

        } catch {
          return interaction.reply({
            content: "⚠️ Approved but cannot change nickname.",
            flags: 64
          });
        }

        fields[2].value = "✅ APPROVED";
        embed.setFields(fields);

        embed.addFields({
          name: "Approved By",
          value: `${interaction.user}`
        });

        await interaction.message.edit({
          embeds: [embed],
          components: []
        });

        return interaction.reply({
          content: `✅ Name changed to ${newName}`,
          flags: 64
        });
      }

      /* DENY */
      if (interaction.customId === "namechange_deny") {

        fields[2].value = "❌ DENIED";
        embed.setFields(fields);

        embed.addFields({
          name: "Denied By",
          value: `${interaction.user}`
        });

        await interaction.message.edit({
          embeds: [embed],
          components: []
        });

        return interaction.reply({
          content: "❌ Request denied.",
          flags: 64
        });
      }
    }

    return;
  }

  /* =========================
     MODAL SUBMIT
     ========================= */
  if (interaction.isModalSubmit()) {

    if (interaction.customId !== "namechange_submit") return;

    const channel = await interaction.client.channels
      .fetch(config.nameChangeChannelId)
      .catch(() => null);

    if (!channel) return;

    // ✅ BLOCK IF ALREADY HAS PENDING
    const messages = await channel.messages.fetch({ limit: 50 });

    const hasPending = messages.some(msg => {
      const embed = msg.embeds[0];
      if (!embed) return false;

      const footer = embed.footer?.text;
      const status = embed.fields?.[2]?.value;

      return (
        footer === `UID:${interaction.user.id}` &&
        status === "🟡 PENDING REVIEW"
      );
    });

    if (hasPending) {
      return interaction.reply({
        content: "⚠️ You already have a pending name change request.",
        flags: 64
      });
    }

    const newName = interaction.fields.getTextInputValue("new_name");
    const currentName = interaction.member.nickname || interaction.user.username;

    const embed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setAuthor({
        name: "NAME CHANGE REQUEST",
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setThumbnail(
        interaction.user.displayAvatarURL({ dynamic: true, size: 256 })
      )
      .addFields(
        {
          name: "CURRENT NAME",
          value: currentName,
        },
        {
          name: "REQUESTED NAME",
          value: newName,
        },
        {
          name: "\u200B",
          value: "🟡 PENDING REVIEW"
        }
      )
      .setFooter({
        text: `UID:${interaction.user.id}`
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("namechange_approve")
        .setLabel("✅ APPROVED")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("namechange_deny")
        .setLabel("❌ DENIED")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      content: "✅ Name Change Submitted.",
      flags: 64
    });

    await channel.send({
      embeds: [embed],
      components: [row]
    });

    return;
  }
};