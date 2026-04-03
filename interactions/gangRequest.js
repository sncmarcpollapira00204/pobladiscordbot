const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const gangs = require("../gangRoles");
const config = require("../config.json");

// SIMPLE COOLDOWN (memory)
const cooldown = new Map();
const COOLDOWN_TIME = 3 * 24 * 60 * 60 * 1000; // 3 days

module.exports = async (interaction) => {

  /* =========================
     BUTTON: OPEN UNROLE MODAL
  ========================= */
  if (interaction.isButton() && interaction.customId === "gang_leave") {

    const modal = new ModalBuilder()
      .setCustomId("unrole_modal")
      .setTitle("Unrole Request");

    const nameInput = new TextInputBuilder()
      .setCustomId("ingame_name")
      .setLabel("IN-GAME NAME")
      .setPlaceholder("Firstname Lastname")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const agreeInput = new TextInputBuilder()
      .setCustomId("agree")
      .setLabel("Do you agree to 3 days cooldown before requesting a new role?")
      .setPlaceholder("Yes or No")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(agreeInput)
    );

    return interaction.showModal(modal);
  }

  /* =========================
     MODAL: GANG REQUEST
  ========================= */
  if (interaction.isModalSubmit() && interaction.customId.startsWith("gang_request:")) {

    await interaction.deferReply({ flags: 64 });

    const member = interaction.member;

    // COOLDOWN CHECK
    if (cooldown.has(member.id)) {
      const timeLeft = cooldown.get(member.id) - Date.now();
      if (timeLeft > 0) {
        return interaction.editReply("❌ You are on cooldown.");
      } else {
        cooldown.delete(member.id);
      }
    }

    // PREVENT MULTIPLE GANG
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
      .setFooter({ text: `GANG|${interaction.user.id}|${gangKey}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("gang_verify").setLabel("Verify").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("gang_approve").setLabel("Approve").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("gang_deny").setLabel("Deny").setStyle(ButtonStyle.Danger)
    );

    const channel = await interaction.client.channels.fetch(config.gangRequestChannelId);
    await channel.send({ embeds: [embed], components: [row] });

    return interaction.editReply("✅ Request submitted.");
  }

  /* =========================
     MODAL: UNROLE REQUEST
  ========================= */
  if (interaction.isModalSubmit() && interaction.customId === "unrole_modal") {

    await interaction.deferReply({ flags: 64 });

    const agree = interaction.fields.getTextInputValue("agree");

    if (agree.toLowerCase() !== "yes") {
      return interaction.editReply("❌ You must type YES.");
    }

    const ingameName = interaction.fields.getTextInputValue("ingame_name");

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("📤 UNROLE REQUEST")
        .addFields(
        { name: "DISCORD USER", value: `<@${interaction.user.id}>` },
        { name: "IN-GAME NAME", value: ingameName },
        { name: "COOLDOWN AGREEMENT", value: agree },
        { name: "STATUS", value: "🟡 PENDING REVIEW" }
        )
      .setFooter({ text: `UNROLE|${interaction.user.id}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("unrole_approve").setLabel("Approve").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("unrole_deny").setLabel("Deny").setStyle(ButtonStyle.Danger)
    );

    const channel = await interaction.client.channels.fetch(config.gangRequestChannelId);
    await channel.send({ embeds: [embed], components: [row] });

    return interaction.editReply("✅ Unrole request submitted.");
  }

  /* =========================
     BUTTON HANDLER
  ========================= */
  if (!interaction.isButton()) return;

  const embed = interaction.message.embeds[0];
  if (!embed) return;

  const footer = embed.footer?.text;
  if (!footer) return;

  const parts = footer.split("|");

  /* =========================
     UNROLE APPROVE
  ========================= */
  if (interaction.customId === "unrole_approve") {

    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: "❌ Admin only.", flags: 64 });
    }

    const userId = parts[1];
    const member = await interaction.guild.members.fetch(userId);

    // REMOVE ROLES
    for (const roleId of config.gangRoleIds) {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId).catch(() => {});
      }
    }

    // REMOVE PREFIX
    let name = member.nickname || member.user.username;
    name = name.includes("|") ? name.split("|")[1].trim() : name;
    await member.setNickname(name).catch(() => {});

    // SET COOLDOWN
    cooldown.set(userId, Date.now() + COOLDOWN_TIME);

    const newEmbed = EmbedBuilder.from(embed)
      .spliceFields(2, 1, { name: "STATUS", value: "✅ APPROVED" })
      .addFields({ name: "APPROVED BY", value: `${interaction.user}` });

    await interaction.message.edit({ embeds: [newEmbed], components: [] });

    return interaction.reply({ content: "✅ Unrole approved.", flags: 64 });
  }

  /* =========================
     UNROLE DENY
  ========================= */
  if (interaction.customId === "unrole_deny") {

    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: "❌ Admin only.", flags: 64 });
    }

    const newEmbed = EmbedBuilder.from(embed)
      .spliceFields(2, 1, { name: "STATUS", value: "❌ DENIED" });

    await interaction.message.edit({ embeds: [newEmbed], components: [] });

    return interaction.reply({ content: "❌ Denied.", flags: 64 });
  }

  /* =========================
     GANG APPROVE
  ========================= */
  if (interaction.customId === "gang_approve") {

    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: "❌ Admin only.", flags: 64 });
    }

    const userId = parts[1];
    const gangKey = parts[2];
    const gang = gangs[gangKey];

    const member = await interaction.guild.members.fetch(userId);

    for (const roleId of config.gangRoleIds) {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId).catch(() => {});
      }
    }

    await member.roles.add(gang.roleId);

    let name = member.nickname || member.user.username;
    name = name.includes("|") ? name.split("|")[1].trim() : name;

    await member.setNickname(`${gang.prefix} | ${name}`);

    const newEmbed = EmbedBuilder.from(embed)
      .spliceFields(3, 1, { name: "STATUS", value: "✅ APPROVED" })
      .addFields({ name: "APPROVED BY", value: `${interaction.user}` });

    await interaction.message.edit({ embeds: [newEmbed], components: [] });

    return interaction.reply({ content: "✅ Approved.", flags: 64 });
  }

  /* =========================
     GANG DENY
  ========================= */
  if (interaction.customId === "gang_deny") {

    const newEmbed = EmbedBuilder.from(embed)
      .spliceFields(3, 1, { name: "STATUS", value: "❌ DENIED" });

    await interaction.message.edit({ embeds: [newEmbed], components: [] });

    return interaction.reply({ content: "❌ Denied.", flags: 64 });
  }
};