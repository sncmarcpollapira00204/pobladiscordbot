const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const gangs = require("../gangRoles");
const config = require("../config.json");

const hasRole = (member, roles) =>
  roles.some(id => member.roles.cache.has(id));

module.exports = async (interaction) => {

  /* =========================
     LEAVE GANG
  ========================= */
  if (interaction.isButton() && interaction.customId === "gang_leave") {

    const member = interaction.member;

    const userGangRoles = member.roles.cache.filter(r =>
      config.gangRoleIds.includes(r.id)
    );

    if (!userGangRoles.size) {
      return interaction.reply({
        content: "❌ You are not in any gang.",
        flags: 64
      });
    }

    for (const role of userGangRoles.values()) {
      await member.roles.remove(role.id).catch(() => {});
    }

    // REMOVE PREFIX
    const name = member.nickname || member.user.username;
    const cleanName = name.split("|").pop().trim();

    await member.setNickname(cleanName).catch(() => {});

    return interaction.reply({
      content: "✅ You left your gang.",
      flags: 64
    });
  }

  /* =========================
     MODAL SUBMIT
  ========================= */
  if (interaction.isModalSubmit()) {

    if (!interaction.customId.startsWith("gang_request:")) return;

    await interaction.deferReply({ flags: 64 });

    const member = interaction.member;

    // ❌ PREVENT MULTIPLE GANG
    if (member.roles.cache.some(r => config.gangRoleIds.includes(r.id))) {
      return interaction.editReply("❌ You are already in a gang.");
    }

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
      new ButtonBuilder().setCustomId("gang_verify").setLabel("Verify").setStyle(1),
      new ButtonBuilder().setCustomId("gang_approve").setLabel("Approve").setStyle(3),
      new ButtonBuilder().setCustomId("gang_deny").setLabel("Deny").setStyle(4)
    );

    const channel = await interaction.client.channels.fetch(
      config.gangRequestChannelId
    );

    await channel.send({ embeds: [embed], components: [row] });

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

  if (!footer) return;

  const [uidPart, gangPart] = footer.split("|");

  const userId = uidPart.replace("UID:", "");
  const gangKey = gangPart.replace("GANG:", "");
  const gang = gangs[gangKey];

  const statusField = embed.data.fields.find(f => f.name === "STATUS");

  if (!statusField.value.includes("PENDING")) {
    return interaction.reply({
      content: "❌ Already processed.",
      flags: 64
    });
  }

  /* VERIFY */
  if (interaction.customId === "gang_verify") {

    if (!hasRole(interaction.member, [
      ...config.directorRoleIds,
      ...config.patronRoleIds
    ])) {
      return interaction.reply({
        content: "❌ Only Directors/Patrons can verify.",
        flags: 64
      });
    }

    if (embed.data.fields.some(f => f.name === "VERIFIED BY")) {
      return interaction.reply({
        content: "❌ Already verified.",
        flags: 64
      });
    }

    embed.addFields({
      name: "VERIFIED BY",
      value: `${interaction.user}`
    });

    await message.edit({ embeds: [embed] });

    return interaction.reply({
      content: "✅ Verified.",
      flags: 64
    });
  }

  /* APPROVE */
  if (interaction.customId === "gang_approve") {

    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({
        content: "❌ Admin only.",
        flags: 64
      });
    }

    const member = await interaction.guild.members.fetch(userId);

    // REMOVE OLD GANG ROLES
    for (const roleId of config.gangRoleIds) {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId).catch(() => {});
      }
    }

    await member.roles.add(gang.roleId).catch(() => {});

    // CLEAN PREFIX FIRST
    let name = member.nickname || member.user.username;
    name = name.includes("|") ? name.split("|")[1].trim() : name;

    const newName = `${gang.prefix} | ${name}`.slice(0, 32);

    await member.setNickname(newName).catch(() => {});

    statusField.value = "✅ APPROVED";

    embed.addFields({
      name: "APPROVED BY",
      value: `${interaction.user}`
    });

    await message.edit({ embeds: [embed], components: [] });

    return interaction.reply({
      content: "✅ Approved.",
      flags: 64
    });
  }

  /* DENY */
  if (interaction.customId === "gang_deny") {

    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({
        content: "❌ Admin only.",
        flags: 64
      });
    }

    statusField.value = "❌ DENIED";

    await message.edit({ embeds: [embed], components: [] });

    return interaction.reply({
      content: "❌ Denied.",
      flags: 64
    });
  }
};