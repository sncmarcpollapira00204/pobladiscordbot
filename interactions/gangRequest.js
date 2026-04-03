const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const gangs = require("../gangRoles");

module.exports = async (interaction) => {

  /* =========================
     MODAL SUBMIT
  ========================= */

  if (interaction.isModalSubmit()) {

    if (!interaction.customId.startsWith("gang_request:")) return;

    await interaction.deferReply({ flags: 64 });

    const gangKey = interaction.customId.split(":")[1];
    const gang = gangs[gangKey];

    const ingameName = interaction.fields.getTextInputValue("ingame_name");

    const embed = new EmbedBuilder()
      .setColor(0xff8c00)
      .setTitle("📄 GANG ROLE REQUEST")
      .addFields(
        { name: "DISCORD USER", value: `<@${interaction.user.id}>` },
        { name: "IN-GAME NAME", value: ingameName },
        { name: "ROLE REQUEST", value: gang.name },
        { name: "STATUS", value: "🟡 PENDING REVIEW" }
      )
      .setFooter({
        text: `UID:${interaction.user.id}|GANG:${gangKey}`
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("gang_verify")
        .setLabel("Verify")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("gang_approve")
        .setLabel("Approve")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("gang_deny")
        .setLabel("Deny")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    return interaction.editReply("✅ Request submitted.");
  }

  /* =========================
     BUTTONS
  ========================= */

  if (!interaction.isButton()) return;

  const message = interaction.message;
  if (!message.embeds.length) return;

  const embed = EmbedBuilder.from(message.embeds[0]);
  const footer = embed.data.footer?.text;

  const [uidPart, gangPart] = footer.split("|");

  const userId = uidPart.replace("UID:", "");
  const gangKey = gangPart.replace("GANG:", "");
  const gang = gangs[gangKey];

  const statusField = embed.data.fields.find(f => f.name === "STATUS");

  if (!statusField.value.includes("PENDING")) {
    return interaction.reply({ content: "❌ Already processed.", flags: 64 });
  }

  /* VERIFY */
  if (interaction.customId === "gang_verify") {

    embed.addFields({
      name: "VERIFIED BY",
      value: `${interaction.user}`
    });

    await message.edit({ embeds: [embed] });

    return interaction.reply({ content: "✅ Verified.", flags: 64 });
  }

  /* APPROVE */
  if (interaction.customId === "gang_approve") {

    const member = await interaction.guild.members.fetch(userId);

    await member.roles.add(gang.roleId).catch(() => {});

    const currentName = member.nickname || member.user.username;
    const newName = `${gang.prefix} | ${currentName}`.slice(0, 32);

    await member.setNickname(newName).catch(() => {});

    statusField.value = "✅ APPROVED";

    embed.addFields({
      name: "APPROVED BY",
      value: `${interaction.user}`
    });

    await message.edit({ embeds: [embed], components: [] });

    return interaction.reply({ content: "✅ Approved.", flags: 64 });
  }

  /* DENY */
  if (interaction.customId === "gang_deny") {

    statusField.value = "❌ DENIED";

    await message.edit({ embeds: [embed], components: [] });

    return interaction.reply({ content: "❌ Denied.", flags: 64 });
  }
};