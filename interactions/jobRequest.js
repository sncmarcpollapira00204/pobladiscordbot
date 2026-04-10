const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const jobs = require("../jobRoles");
const config = require("../config.json");

const cooldown = new Map();
const COOLDOWN_TIME = 3 * 24 * 60 * 60 * 1000;

// SAFE EXEC
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
     UNROLE MODAL SUBMIT
  ========================= */
  if (interaction.isModalSubmit() && interaction.customId === "job_unrole_modal") {
    return safeExecute(interaction, async () => {

      await interaction.deferReply({ flags: 64 });

      const agree = interaction.fields.getTextInputValue("agree");
      const ingameName = interaction.fields.getTextInputValue("ingame_name");

      if (agree.toLowerCase() !== "yes") {
        return interaction.editReply("❌ You must type YES.");
      }

      const member = interaction.member;

      const currentJob = member.roles.cache.find(r =>
        config.jobRoleIds.includes(r.id)
      );

      // NO JOB = BLOCK
      if (!currentJob) {
        return interaction.editReply("❌ You don't have a job role to remove.");
      }

      const roleName = currentJob
        ? `<@&${currentJob.id}>`
        : "No Job Role";

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("📤 UNROLE REQUEST")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "DISCORD USER", value: `<@${interaction.user.id}>` },
          { name: "IN-GAME NAME", value: ingameName },
          { name: "CURRENT ROLE", value: roleName },
          { name: "COOLDOWN AGREEMENT", value: agree },
          { name: "STATUS", value: "🟡 PENDING REVIEW" }
        )
        .setFooter({ text: `JOB_UNROLE | ${interaction.user.id}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("job_unrole_verify")
          .setLabel("VERIFY")
          .setEmoji("☑️")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("job_unrole_approve")
          .setLabel("APPROVE")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("job_unrole_deny")
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
  if (interaction.isButton() && interaction.customId === "job_leave") {
    return safeExecute(interaction, async () => {

      const modal = new ModalBuilder()
        .setCustomId("job_unrole_modal")
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
     JOB REQUEST
  ========================= */
  if (interaction.isModalSubmit() && interaction.customId.startsWith("job_request:")) {
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

      // already has job
      if (member.roles.cache.some(r =>
        config.jobRoleIds.includes(r.id)
      )) {
        return interaction.editReply("❌ You already have a job role.");
      }

      // has gang role (BLOCK)
      if (member.roles.cache.some(r =>
        config.gangRoleIds.includes(r.id)
      )) {
        return interaction.editReply("❌ You must leave your gang before requesting a job.");
      }

      const jobKey = interaction.customId.split(":")[1];
      const job = jobs[jobKey];

      if (!job) {
        return interaction.editReply("❌ Invalid job selected.");
      }

      const ingameName = interaction.fields.getTextInputValue("ingame_name");

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("🏢 WHITELIST JOB REQUEST")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "DISCORD USER", value: `<@${interaction.user.id}>` },
          { name: "IN-GAME NAME", value: ingameName },
          { name: "ROLE REQUEST", value: `<@&${job.roleId}>` },
          { name: "DIRECTOR APPROVAL", value: "❌ NOT APPROVED" },
          { name: "STATUS", value: "🔵 WAITING FOR DIRECTOR APPROVAL" }
        )
        .setFooter({ text: `${job.name} | ${job.roleId}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("job_verify")
          .setLabel("VERIFY")
          .setEmoji("☑️")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("job_approve")
          .setLabel("APPROVE")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("job_deny")
          .setLabel("DENY")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Danger)
      );

      const channel = await interaction.client.channels
        .fetch(config.jobRequestChannelId)
        .catch(() => null);

      if (!channel) {
        return interaction.editReply("❌ Request channel not found.");
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
       VERIFY (DIRECTOR ONLY)
    ========================= */
    if (interaction.customId === "job_verify") {

      const footer = embed.footer?.text;

      if (!footer || !footer.includes("|")) {
        return interaction.reply({ content: "❌ Invalid data.", flags: 64 });
      }

      const roleId = footer.split("|")[1].trim();
      const job = Object.values(jobs).find(j => j.roleId === roleId);

      if (!job || !interaction.member.roles.cache.has(job.directorRoleId)) {
        return interaction.reply({ content: "❌ Only Director can verify.", flags: 64 });
      }

      const isVerified = embed.fields
        .find(f => f.name === "DIRECTOR APPROVAL")
        ?.value.includes("VERIFIED");

      if (isVerified) {
        return interaction.reply({ content: "⚠️ Already verified.", flags: 64 });
      }

      const newEmbed = EmbedBuilder.from(embed)
        .spliceFields(3, 1, {
          name: "DIRECTOR APPROVAL",
          value: `✅ VERIFIED BY: ${interaction.user}`
        })
        .spliceFields(4, 1, {
          name: "STATUS",
          value: "🔵 READY FOR ADMIN APPROVAL"
        });

      const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("job_unverify")
          .setLabel("Remove Verify")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("job_approve")
          .setLabel("APPROVE")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("job_deny")
          .setLabel("DENY")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.message.edit({ embeds: [newEmbed], components: [newRow] });

      return interaction.reply({ content: "✅ Verified.", flags: 64 });
    }

    // UNVERIFY
    if (interaction.customId === "job_unverify") {

      const approvalField = embed.fields.find(f => f.name === "DIRECTOR APPROVAL");

      if (!approvalField || !approvalField.value.includes(`<@${interaction.user.id}>`)) {
        return interaction.reply({ content: "❌ Only the verifier can remove this.", flags: 64 });
      }

      const newEmbed = EmbedBuilder.from(embed)
        .spliceFields(3, 1, { name: "DIRECTOR APPROVAL", value: "❌ NOT APPROVED" })
        .spliceFields(4, 1, { name: "STATUS", value: "🔵 WAITING FOR DIRECTOR APPROVAL" });

      const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("job_verify")
          .setLabel("VERIFY")
          .setEmoji("☑️")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("job_approve")
          .setLabel("APPROVE")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("job_deny")
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
    if (interaction.customId === "job_approve") {

      const isAdmin = config.adminRoleIds?.some(roleId =>
        interaction.member.roles.cache.has(roleId)
      );

      if (!isAdmin) {
        return interaction.reply({
          content: "❌ You don't have permission to Approve this request.",
          flags: 64
        });
      }

      const verification = embed.fields.find(f => f.name === "DIRECTOR APPROVAL");

      if (!verification.value.includes("VERIFIED")) {
        return interaction.reply({
          content: "❌ This request has not been verified yet.\n✔ A Director must verify it before admin approval.",
          flags: 64
        });
      }

      const userId = embed.fields[0].value.replace(/[<@!>]/g, "");
      const footer = embed.footer?.text;

      if (!footer || !footer.includes("|")) {
        return interaction.reply({ content: "❌ Invalid data.", flags: 64 });
      }

      const roleId = footer.split("|")[1].trim();
      const job = Object.values(jobs).find(j => j.roleId === roleId);

      const member = await interaction.guild.members.fetch(userId).catch(() => null);

      if (!member || !job) {
        return interaction.reply({ content: "❌ Error finding user/job.", flags: 64 });
      }

      for (const roleId of config.jobRoleIds) {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId).catch(() => {});
        }
      }

      await member.roles.add(job.roleId);

      let name = member.nickname || member.user.username;
      name = name.includes("|") ? name.split("|")[1].trim() : name;

      await member.setNickname(`${job.prefix} | ${name}`).catch(() => {});

      const newEmbed = EmbedBuilder.from(embed)
        .spliceFields(4, 1, {
          name: "ADMIN APPROVAL",
          value: `✅ APPROVED BY: ${interaction.user}`
        });

      await interaction.message.edit({ embeds: [newEmbed], components: [] });

      return interaction.reply({ content: "✅ Approved.", flags: 64 });
    }

    /* =========================
       DENY
    ========================= */
    if (interaction.customId === "job_deny") {

const isAdmin = config.adminRoleIds?.some(roleId =>
  interaction.member.roles.cache.has(roleId)
);

    if (!isAdmin) {
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

      return interaction.reply({ content: "❌ Denied.", flags: 64 });
    }

// UNROLE VERIFY
if (interaction.customId === "job_unrole_verify") {

  const roleField = embed.fields.find(f => f.name === "CURRENT ROLE");

  if (!roleField) {
    return interaction.reply({
      content: "❌ Role data not found.",
      flags: 64
    });
  }

  // extract roleId from <@&123>
  const roleId = roleField.value.replace(/[<@&>]/g, "").trim();

  const job = Object.values(jobs).find(j => j.roleId === roleId);

  if (!job || !interaction.member.roles.cache.has(job.directorRoleId)) {
    return interaction.reply({
      content: "❌ Only Director can verify this unrole request.",
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
      name: "STATUS",
      value: `☑️ VERIFIED BY: ${interaction.user}`
    });

  const newRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("job_unrole_unverify")
      .setLabel("Remove Verify")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("job_unrole_approve")
      .setLabel("APPROVE")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("job_unrole_deny")
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
    if (interaction.customId === "job_unrole_approve") {
      
      const statusField = embed.fields.find(f => f.name === "STATUS");

      if (!statusField || !statusField.value.includes("VERIFIED")) {
        return interaction.reply({
          content: "❌ This request is not verified yet.",
          flags: 64
        });
      }

      const isAdmin = config.adminRoleIds?.some(roleId =>
        interaction.member.roles.cache.has(roleId)
      );

      if (!isAdmin) {
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

      for (const roleId of config.jobRoleIds) {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId).catch(() => {});
        }
      }

      let name = member.nickname || member.user.username;
      name = name.includes("|") ? name.split("|")[1].trim() : name;

      await member.setNickname(name).catch(() => {});

      const cooldownEnd = Math.floor((Date.now() + COOLDOWN_TIME) / 1000);
      cooldown.set(userId, cooldownEnd * 1000);

      const userIdClean = embed.footer?.text?.split("|")[1].trim();

      const ingame = embed.fields.find(f => f.name === "IN-GAME NAME")?.value || "N/A";
      const role = embed.fields.find(f => f.name === "CURRENT ROLE")?.value || "N/A";

      const newEmbed = EmbedBuilder.from(embed);

      newEmbed.setFields(
        { name: "DISCORD USER", value: `<@${userIdClean}>` },
        { name: "IN-GAME NAME", value: ingame },
        { name: "CURRENT ROLE", value: role },
        { name: "COOLDOWN AGREEMENT", value: `⏳ <t:${cooldownEnd}:F>` },
        { name: "STATUS", value: `✅ APPROVED BY: ${interaction.user}` }
      );

      await interaction.message.edit({ embeds: [newEmbed], components: [] });

      return interaction.reply({ content: "✅ Unrole approved.", flags: 64 });
    }

      // ✅ DITO MO ILALAGAY
      if (interaction.customId === "job_unrole_unverify") {

        const statusField = embed.fields.find(f => f.name === "STATUS");

        if (!statusField.value.includes(`<@${interaction.user.id}>`)) {
          return interaction.reply({
            content: "❌ Only the verifier can remove this.",
            flags: 64
          });
        }

        const newEmbed = EmbedBuilder.from(embed)
          .spliceFields(4, 1, {
            name: "STATUS",
            value: "🟡 PENDING REVIEW"
          });

        const newRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("job_unrole_verify")
            .setLabel("VERIFY")
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId("job_unrole_approve")
            .setLabel("APPROVE")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId("job_unrole_deny")
            .setLabel("DENY")
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.message.edit({ embeds: [newEmbed], components: [newRow] });

        return interaction.reply({ content: "⚠️ Verification removed.", flags: 64 });
      }


    /* =========================
       UNROLE DENY
    ========================= */
    if (interaction.customId === "job_unrole_deny") {

      const isAdmin = config.adminRoleIds?.some(roleId =>
        interaction.member.roles.cache.has(roleId)
      );

      if (!isAdmin) {
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