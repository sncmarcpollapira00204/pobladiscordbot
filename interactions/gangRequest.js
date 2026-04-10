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
const GANG_MODERATOR_ROLE = "1474757185568378900";

const cooldown = new Map();
const COOLDOWN_TIME = 3 * 24 * 60 * 60 * 1000;

// SAFE EXECUTION WRAPPER
async function safeExecute(interaction, fn) {
  try {
    await fn();
  } catch (err) {
    console.error("❌ ERROR:", err);

    const msg = "❌ Something went wrong. Please contact admin.";

    if (interaction.deferred || interaction.replied) {
      interaction.editReply(msg).catch(() => {});
    } else {
      interaction.reply({ content: msg, flags: 64 }).catch(() => {});
    }
  }
}

module.exports = async (interaction) => {

  /* =========================
     GANG SELECT → MODAL
  ========================= */
  if (interaction.isStringSelectMenu() && interaction.customId === "gang_select") {

    const gangKey = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`gang_request:${gangKey}`)
      .setTitle("Gang Role Request");

    const input = new TextInputBuilder()
      .setCustomId("ingame_name")
      .setLabel("IN-GAME NAME")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Firstname Lastname")
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);

    modal.addComponents(row);

    return interaction.showModal(modal);
  }

  /* =========================
     UNROLE MODAL SUBMIT
  ========================= */
  if (interaction.isModalSubmit() && interaction.customId === "unrole_modal") {
    return safeExecute(interaction, async () => {

      await interaction.deferReply({ flags: 64 });

      const agree = interaction.fields.getTextInputValue("agree");
      const ingameName = interaction.fields.getTextInputValue("ingame_name");

      if (agree.toLowerCase() !== "yes") {
        return interaction.editReply("❌ You must type YES.");
      }

      const member = interaction.member;

      const currentGang = member.roles.cache.find(r =>
        config.gangRoleIds.includes(r.id)
      );

      // NO GANG = BLOCK
      if (!currentGang) {
        return interaction.editReply("❌ You don't have a gang role to remove.");
      }

      const roleName = currentGang
        ? `<@&${currentGang.id}>`
        : "No Gang Role";

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("📤 UNROLE REQUEST")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "DISCORD USER", value: `<@${interaction.user.id}>` },
          { name: "IN-GAME NAME", value: ingameName },
          { name: "CURRENT ROLE", value: roleName },
          { name: "COOLDOWN AGREEMENT", value: agree },

          // ✅ IDAGDAG MO ITO
          { name: "PATRON/A APPROVAL", value: "❌ NOT APPROVED" },

          { name: "STATUS", value: "🟡 WAITING FOR PATRON APPROVAL" }
        )
        .setFooter({ text: `GANG_UNROLE | ${interaction.user.id}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("gang_unrole_verify")
          .setLabel("VERIFY")
          .setEmoji("☑️")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("gang_unrole_approve")
          .setLabel("APPROVE")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("gang_unrole_deny")
          .setLabel("DENY")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Danger)
      );

      const channel = await interaction.client.channels
        .fetch(config.unroleRequestChannelId)
        .catch(() => null);

      if (!channel) {
        return interaction.editReply("❌ Request channel not found.");
      }

      await channel.send({ embeds: [embed], components: [row] });

      return interaction.editReply("✅ Unrole request submitted.");
    });
  }

  /* =========================
     UNROLE BUTTON
  ========================= */
  if (interaction.isButton() && interaction.customId === "gang_leave") {
    return safeExecute(interaction, async () => {

      const modal = new ModalBuilder()
        .setCustomId("unrole_modal")
        .setTitle("Unrole Request");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("ingame_name")
            .setLabel("IN-GAME NAME")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Firstname Lastname")
            .setRequired(true)
        ),

        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("agree")
            .setLabel("Do you agree to 3 days cooldown?")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Type YES to confirm")
            .setRequired(true)
        )
      );

      return interaction.showModal(modal);
    });
  }

  /* =========================
     GANG REQUEST
  ========================= */
  if (interaction.isModalSubmit() && interaction.customId.startsWith("gang_request:")) {
    return safeExecute(interaction, async () => {

      await interaction.deferReply({ flags: 64 });

      const member = interaction.member;

      // cooldown
      if (cooldown.has(member.id)) {
        if (cooldown.get(member.id) > Date.now()) {
          return interaction.editReply("❌ You are still on cooldown.");
        } else {
          cooldown.delete(member.id);
        }
      }

      // already in gang
      if (member.roles.cache.some(r =>
        config.gangRoleIds.includes(r.id)
      )) {
        return interaction.editReply("❌ You already have a gang role.");
      }

      // has job role (BLOCK)
      if (member.roles.cache.some(r =>
        config.jobRoleIds.includes(r.id)
      )) {
        return interaction.editReply("❌ You must remove your job role before requesting a gang.");
      }

      const gangKey = interaction.customId.split(":")[1];
      const gang = gangs[gangKey];

      if (!gang) {
        return interaction.editReply("❌ Invalid gang selected.");
      }

      const ingameName = interaction.fields.getTextInputValue("ingame_name");

      const embed = new EmbedBuilder()
        .setColor(0xff8c00)
        .setTitle("📄 GANG ROLE REQUEST")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "DISCORD USER", value: `<@${interaction.user.id}>` },
          { name: "IN-GAME NAME", value: ingameName },
          { name: "ROLE REQUEST", value: `<@&${gang.roleId}>` },
          { name: "PATRON/A APPROVAL", value: "❌ NOT APPROVED" },
          { name: "STATUS", value: "🟡 WAITING FOR PATRON APPROVAL" }
        )
        .setFooter({ text: `${gang.name} | ${gang.roleId}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("gang_verify")
          .setLabel("VERIFY")
          .setEmoji("☑️")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("gang_approve")
          .setLabel("APPROVE")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("gang_deny")
          .setLabel("DENY")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Danger)
      );

      const channel = await interaction.client.channels
        .fetch(config.gangRequestChannelId)
        .catch(() => null);

      if (!channel) {
        return interaction.editReply("❌ Request channel not found. Contact admin.");
      }

      await channel.send({ embeds: [embed], components: [row] });

      return interaction.editReply("✅ Request submitted.");
    });
  }

  /* =========================
     BUTTON HANDLER
  ========================= */
      if (!interaction.isButton()) return;

      return safeExecute(interaction, async () => {

        const embed = interaction.message.embeds[0];

        if (!embed) {
          return interaction.reply({
            content: "❌ No embed found.",
            flags: 64
          });
        }

        const footer = embed.footer?.text;

        if (!footer) {
          return interaction.reply({
            content: "❌ Invalid embed data.",
            flags: 64
          });
        }

        let parts = [];
        if (footer.includes("|")) {
          parts = footer.split("|");
        }

    /* =========================
       VERIFY
    ========================= */
    if (interaction.customId === "gang_verify") {

      if (!interaction.member.roles.cache.some(r =>
        config.patronRoleIds.includes(r.id)
      )) {
        return interaction.reply({ content: "❌ You don't have permission.", flags: 64 });
      }

      const isVerified = embed.fields
        .find(f => f.name === "PATRON/A APPROVAL")
        ?.value.includes("VERIFIED");

      if (isVerified) {
        return interaction.reply({ content: "⚠️ Already verified.", flags: 64 });
      }

      const newEmbed = EmbedBuilder.from(embed)
        .spliceFields(3, 1, {
          name: "PATRON/A APPROVAL",
          value: `✅ VERIFIED BY: ${interaction.user}`
        })
        .spliceFields(4, 1, {
          name: "STATUS",
          value: "🔵 READY FOR ADMIN APPROVAL"
        });

      const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("gang_unverify")
          .setLabel("Remove Verify")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("gang_approve")
          .setLabel("APPROVE")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("gang_deny")
          .setLabel("DENY")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.message.edit({ embeds: [newEmbed], components: [newRow] });

      return interaction.reply({ content: "✅ Verified.", flags: 64 });
    }

    // UNVERIFY
    if (interaction.customId === "gang_unverify") {

      const approvalField = embed.fields.find(f => f.name === "PATRON/A APPROVAL");

      if (!approvalField || !approvalField.value.includes(`<@${interaction.user.id}>`)) {
        return interaction.reply({ content: "❌ Only the verifier can remove this.", flags: 64 });
      }

      const newEmbed = EmbedBuilder.from(embed)
        .spliceFields(3, 1, {
          name: "PATRON/A APPROVAL",
          value: "❌ NOT APPROVED"
        })
        .spliceFields(4, 1, {
          name: "STATUS",
          value: "🟡 WAITING FOR PATRON APPROVAL"
        });

      const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("gang_verify")
          .setLabel("VERIFY")
          .setEmoji("☑️")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("gang_approve")
          .setLabel("APPROVE")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("gang_deny")
          .setLabel("DENY")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.message.edit({ embeds: [newEmbed], components: [newRow] });

      return interaction.reply({ content: "⚠️ Verification removed.", flags: 64 });
    }

    /* =========================
       APPROVE
    ========================= */
    if (interaction.customId === "gang_approve") {

    const isAdmin = config.adminRoleIds?.some(roleId =>
      interaction.member.roles.cache.has(roleId)
    );

    const isGangMod = interaction.member.roles.cache.has("1474757185568378900");

    if (!isAdmin && !isGangMod) {
      return interaction.reply({
        content: "❌ You don't have permission to Approve this request.",
        flags: 64
      });
    }

      const verification = embed.fields.find(f => f.name === "PATRON/A APPROVAL");

      if (!verification || !verification.value.includes("VERIFIED")) {
        return interaction.reply({ content: "❌ This request is not verified yet.", flags: 64 });
      }

      const userField = embed.fields.find(f => f.name === "DISCORD USER");
      const userId = userField.value.replace(/[<@!>]/g, "");

      const footer = embed.footer?.text;

      if (!footer || !footer.includes("|")) {
        return interaction.reply({ content: "❌ Invalid data.", flags: 64 });
      }

      const roleId = footer.split("|")[1].trim();

      const gang = Object.values(gangs).find(g => g.roleId === roleId);

      if (!gang) {
        return interaction.reply({ content: "❌ Gang not found.", flags: 64 });
      }

      const member = await interaction.guild.members.fetch(userId).catch(() => null);

      if (!member) {
        return interaction.reply({ content: "❌ User not found.", flags: 64 });
      }

      for (const roleId of config.gangRoleIds) {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId).catch(() => {});
        }
      }

      await member.roles.add(gang.roleId).catch(() => {
        throw new Error("Missing permission to assign role.");
      });

      let name = member.nickname || member.user.username;
      name = name.includes("|") ? name.split("|")[1].trim() : name;

      await member.setNickname(`${gang.prefix} | ${name}`).catch(() => {
        console.log("⚠️ Cannot change nickname (role hierarchy issue)");
      });

      const newEmbed = EmbedBuilder.from(embed)
        .spliceFields(4, 1, {
          name: "ADMIN APPROVAL",
          value: `✅ APPROVED BY: ${interaction.user}`
        });

      await interaction.message.edit({ embeds: [newEmbed], components: [] });

      return interaction.reply({ content: "✅ Role approved successfully.", flags: 64 });
    }

    /* =========================
       DENY
    ========================= */
    if (interaction.customId === "gang_deny") {

      const isAdmin = config.adminRoleIds?.some(roleId =>
        interaction.member.roles.cache.has(roleId)
      );

      const isGangMod = interaction.member.roles.cache.has("1474757185568378900");

      if (!isAdmin && !isGangMod) {
        return interaction.reply({
          content: "❌ You do not have permission to deny this request.",
          flags: 64
        });
      }

      const userId = embed.fields.find(f => f.name === "DISCORD USER")?.value
        .replace(/[<@!>]/g, "")
        .trim();

      const ingame = embed.fields.find(f => f.name === "IN-GAME NAME")?.value || "N/A";
      const role = embed.fields.find(f => f.name === "ROLE REQUEST")?.value || "N/A";

      const newEmbed = EmbedBuilder.from(embed);

      newEmbed.setFields(
        { name: "DISCORD USER", value: `<@${userId}>` },
        { name: "IN-GAME NAME", value: ingame },
        { name: "ROLE REQUEST", value: role },
        { name: "STATUS", value: `❌ DENIED BY: ${interaction.user}` }
      );

      await interaction.message.edit({ embeds: [newEmbed], components: [] });

      return interaction.reply({ content: "❌ Request denied.", flags: 64 });
    }

    //UNROLE VERIFY

    if (interaction.customId === "gang_unrole_verify") {

        const isPatron = config.patronRoleIds?.some(roleId =>
          interaction.member.roles.cache.has(roleId)
        );

        if (!isPatron) {
          return interaction.reply({
            content: "❌ Only Patron can verify this unrole request.",
            flags: 64
          });
        }

        const alreadyVerified = embed.fields
          .find(f => f.name === "STATUS")
          ?.value.includes("VERIFIED");

        if (alreadyVerified) {
          return interaction.reply({ content: "⚠️ Already verified.", flags: 64 });
        }

        const newEmbed = EmbedBuilder.from(embed)
          .spliceFields(4, 1, {
            name: "PATRON/A APPROVAL",
            value: `✅ VERIFIED BY: ${interaction.user}`
          })
          .spliceFields(5, 1, {
            name: "STATUS",
            value: "🔵 READY FOR ADMIN APPROVAL"
          });

      const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("gang_unrole_unverify")
          .setLabel("Remove Verify")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("gang_unrole_approve")
          .setLabel("APPROVE")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("gang_unrole_deny")
          .setLabel("DENY")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Danger)
      );

        await interaction.message.edit({ embeds: [newEmbed], components: [newRow] });

        return interaction.reply({ content: "✅ Verified.", flags: 64 });
      }

    /* =========================
       UNROLE APPROVE
    ========================= */
    if (interaction.customId === "gang_unrole_approve") {

      const approvalField = embed.fields.find(f => f.name === "PATRON/A APPROVAL");

      if (!approvalField || !approvalField.value.includes("VERIFIED")) {
        return interaction.reply({
          content: "❌ This request is not verified yet.",
          flags: 64
        });
      }

      const isAdmin = config.adminRoleIds?.some(roleId =>
        interaction.member.roles.cache.has(roleId)
      );

      const isGangMod = interaction.member.roles.cache.has("1474757185568378900");

      if (!isAdmin && !isGangMod) {
        return interaction.reply({
          content: "❌ You need Administrator permission to perform this action.",
          flags: 64
        });
      }

      const userId = embed.footer?.text?.split("|")[1].trim();

      if (!userId) {
        return interaction.reply({ content: "❌ Invalid user data.", flags: 64 });
      }

      const member = await interaction.guild.members.fetch(userId).catch(() => null);

      if (!member) {
        return interaction.reply({ content: "❌ User not found.", flags: 64 });
      }

      for (const roleId of config.gangRoleIds) {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId).catch(() => {});
        }
      }

      let name = member.nickname || member.user.username;
      name = name.includes("|") ? name.split("|")[1].trim() : name;

      await member.setNickname(name).catch(() => {
        console.log("⚠️ Cannot change nickname");
      });

      const cooldownEnd = Math.floor((Date.now() + COOLDOWN_TIME) / 1000);
      cooldown.set(userId, cooldownEnd * 1000);

      const ingame = embed.fields.find(f => f.name === "IN-GAME NAME")?.value || "N/A";
      const role = embed.fields.find(f => f.name === "CURRENT ROLE")?.value || "N/A";

      const newEmbed = EmbedBuilder.from(embed);

      newEmbed.setFields(
        { name: "DISCORD USER", value: `<@${userId}>` },
        { name: "IN-GAME NAME", value: ingame },
        { name: "CURRENT ROLE", value: role },
        { name: "COOLDOWN AGREEMENT", value: `⏳ <t:${cooldownEnd}:F>` },
        { name: "STATUS", value: `✅ APPROVED BY: ${interaction.user}` }
      );

      await interaction.message.edit({ embeds: [newEmbed], components: [] });

      return interaction.reply({ content: "✅ Unrole approved.", flags: 64 });
    }

if (interaction.customId === "gang_unrole_unverify") {

  const approvalField = embed.fields.find(f => f.name === "PATRON/A APPROVAL");

  if (!approvalField || !approvalField.value.includes(`<@${interaction.user.id}>`)) {
    return interaction.reply({
      content: "❌ Only the verifier can remove this.",
      flags: 64
    });
  }

  const newEmbed = EmbedBuilder.from(embed)
    .spliceFields(4, 1, {
      name: "PATRON/A APPROVAL",
      value: "❌ NOT APPROVED"
    })
    .spliceFields(5, 1, {
      name: "STATUS",
      value: "🟡 WAITING FOR PATRON APPROVAL"
    });

  const newRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gang_unrole_verify")
      .setLabel("VERIFY")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("gang_unrole_approve")
      .setLabel("APPROVE")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("gang_unrole_deny")
      .setLabel("DENY")
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.message.edit({ embeds: [newEmbed], components: [newRow] });

  return interaction.reply({ content: "⚠️ Verification removed.", flags: 64 });
}

    /* =========================
       UNROLE DENY
    ========================= */
    if (interaction.customId === "gang_unrole_deny") {

      const isAdmin = config.adminRoleIds?.some(roleId =>
        interaction.member.roles.cache.has(roleId)
      );

      const isGangMod = interaction.member.roles.cache.has("1474757185568378900");

      if (!isAdmin && !isGangMod) {
        return interaction.reply({
          content: "❌ You don't have permission to Deny this Unrole Request.",
          flags: 64
        });
      }

      const userId = embed.footer?.text?.split("|")[1].trim();

      const ingame = embed.fields.find(f => f.name === "IN-GAME NAME")?.value || "N/A";
      const role = embed.fields.find(f => f.name === "CURRENT ROLE")?.value || "N/A";

      const newEmbed = EmbedBuilder.from(embed);

      newEmbed.setFields(
        { name: "DISCORD USER", value: `<@${userId}>` },
        { name: "IN-GAME NAME", value: ingame },
        { name: "CURRENT ROLE", value: role },
        { name: "COOLDOWN AGREEMENT", value: "❌ Cancelled" },
        { name: "STATUS", value: `❌ DENIED BY: ${interaction.user}` }
      );

      await interaction.message.edit({ embeds: [newEmbed], components: [] });

      return interaction.reply({ content: "❌ Unrole denied.", flags: 64 });
    }

  });
};