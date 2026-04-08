// 🔥 TRUE 100% MERGED (NO SIMPLIFICATION, EXACT LOGIC PRESERVED)
// Combines jobRequest + gangRequest EXACT behavior

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
const jobs = require("../jobRoles");
const config = require("../config.json");

const cooldown = new Map();
const COOLDOWN_TIME = 3 * 24 * 60 * 60 * 1000;

async function safeExecute(interaction, fn) {
  try { await fn(); }
  catch (err) {
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

/* ========================= SELECT ========================= */
if (interaction.isStringSelectMenu()) {

  if (interaction.customId === "gang_select") {
    const key = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`gang_request:${key}`)
      .setTitle("Gang Role Request")
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("ingame_name")
          .setLabel("IN-GAME NAME")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ));

    return interaction.showModal(modal);
  }

  if (interaction.customId === "job_select") {
    const key = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`job_request:${key}`)
      .setTitle("Job Role Request")
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("ingame_name")
          .setLabel("IN-GAME NAME")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ));

    return interaction.showModal(modal);
  }
}

/* ========================= UNROLE BUTTONS ========================= */
if (interaction.isButton()) {

  if (interaction.customId === "gang_leave") {
    const modal = new ModalBuilder()
      .setCustomId("unrole_modal")
      .setTitle("Unrole Request")
      .addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder()
          .setCustomId("ingame_name")
          .setLabel("IN-GAME NAME")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder()
          .setCustomId("agree")
          .setLabel("Do you agree to 3 days cooldown?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true))
      );

    return interaction.showModal(modal);
  }

  if (interaction.customId === "job_leave") {
    const modal = new ModalBuilder()
      .setCustomId("job_unrole_modal")
      .setTitle("Unrole Request")
      .addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder()
          .setCustomId("ingame_name")
          .setLabel("IN-GAME NAME")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder()
          .setCustomId("agree")
          .setLabel("Do you agree to 3 days cooldown?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true))
      );

    return interaction.showModal(modal);
  }
}

/* ========================= MODALS ========================= */
if (interaction.isModalSubmit()) {
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

/* ===== JOB REQUEST ===== */
if (interaction.customId.startsWith("job_request:")) {

if (member.roles.cache.some(r=>config.jobRoleIds.includes(r.id)))
  return interaction.editReply("❌ You already have a job role.");

if (member.roles.cache.some(r=>config.gangRoleIds.includes(r.id)))
  return interaction.editReply("❌ You must leave your gang before requesting a job.");

const key = interaction.customId.split(":")[1];
const job = jobs[key];

const embed = new EmbedBuilder()
.setColor(0x0099ff)
.setTitle("🏢 WHITELIST JOB REQUEST")
.setThumbnail(interaction.user.displayAvatarURL({dynamic:true}))
.addFields(
{name:"DISCORD USER",value:`<@${interaction.user.id}>`},
{name:"IN-GAME NAME",value:interaction.fields.getTextInputValue("ingame_name")},
{name:"ROLE REQUEST",value:`<@&${job.roleId}>`},
{name:"DIRECTOR APPROVAL",value:"❌ NOT APPROVED"},
{name:"STATUS",value:"🔵 WAITING FOR DIRECTOR APPROVAL"}
)
.setFooter({text:`${job.name} | ${job.roleId}`});

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("job_verify").setLabel("VERIFY").setStyle(1),
new ButtonBuilder().setCustomId("job_approve").setLabel("APPROVE").setStyle(3),
new ButtonBuilder().setCustomId("job_deny").setLabel("DENY").setStyle(4)
);

await interaction.client.channels.fetch(config.jobRequestChannelId)
.then(ch=>ch.send({embeds:[embed],components:[row]}));

return interaction.editReply("✅ Request submitted.");
}

/* ===== GANG REQUEST ===== */
if (interaction.customId.startsWith("gang_request:")) {

if (member.roles.cache.some(r=>config.gangRoleIds.includes(r.id)))
  return interaction.editReply("❌ You already have a gang role.");

if (member.roles.cache.some(r=>config.jobRoleIds.includes(r.id)))
  return interaction.editReply("❌ You must remove your job role before requesting a gang.");

const key = interaction.customId.split(":")[1];
const gang = gangs[key];

const embed = new EmbedBuilder()
.setColor(0xff8c00)
.setTitle("📄 GANG ROLE REQUEST")
.setThumbnail(interaction.user.displayAvatarURL({dynamic:true}))
.addFields(
{name:"DISCORD USER",value:`<@${interaction.user.id}>`},
{name:"IN-GAME NAME",value:interaction.fields.getTextInputValue("ingame_name")},
{name:"ROLE REQUEST",value:`<@&${gang.roleId}>`},
{name:"PATRON/A APPROVAL",value:"❌ NOT APPROVED"},
{name:"STATUS",value:"🟡 WAITING FOR PATRON APPROVAL"}
)
.setFooter({text:`${gang.name} | ${gang.roleId}`});

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("gang_verify").setLabel("VERIFY").setStyle(1),
new ButtonBuilder().setCustomId("gang_approve").setLabel("APPROVE").setStyle(3),
new ButtonBuilder().setCustomId("gang_deny").setLabel("DENY").setStyle(4)
);

await interaction.client.channels.fetch(config.gangRequestChannelId)
.then(ch=>ch.send({embeds:[embed],components:[row]}));

return interaction.editReply("✅ Request submitted.");
}

});
}

/* ========================= BUTTON HANDLER ========================= */
if (!interaction.isButton()) return;

return safeExecute(interaction, async () => {

const embed = interaction.message.embeds[0];

if (!embed) {
  return interaction.reply({ content: "❌ No embed found.", flags: 64 });
}

const footer = embed.footer?.text;

if (!footer) {
  return interaction.reply({ content: "❌ Invalid embed data.", flags: 64 });
}

/* =========================
   TYPE DETECTION (FIXED)
========================= */

// ================= JOB UNROLE =================
if (footer.startsWith("JOB_UNROLE")) {

  if (interaction.customId === "job_unrole_verify") {

    const roleId = footer.split("|")[1].trim();
    const job = Object.values(jobs).find(j => j.roleId === roleId);

    if (!job || !interaction.member.roles.cache.has(job.directorRoleId)) {
      return interaction.reply({ content: "❌ Only Director can verify.", flags: 64 });
    }

    const newEmbed = EmbedBuilder.from(embed)
      .spliceFields(4, 1, {
        name: "STATUS",
        value: `☑️ VERIFIED BY: ${interaction.user}`
      });

    return interaction.message.edit({ embeds: [newEmbed] });
  }

  if (interaction.customId === "job_unrole_approve") {

    const userId = footer.split("|")[1].trim();
    const member = await interaction.guild.members.fetch(userId);

    for (const r of config.jobRoleIds) {
      if (member.roles.cache.has(r)) await member.roles.remove(r);
    }

    const cooldownEnd = Math.floor((Date.now() + COOLDOWN_TIME) / 1000);
    cooldown.set(userId, cooldownEnd * 1000);

    return interaction.reply({ content: "✅ Unrole approved.", flags: 64 });
  }

  if (interaction.customId === "job_unrole_deny") {
    return interaction.reply({ content: "❌ Unrole denied.", flags: 64 });
  }
}

// ================= GANG UNROLE =================
else if (footer.startsWith("GANG_UNROLE")) {

  if (interaction.customId === "gang_unrole_verify") {

    if (!interaction.member.roles.cache.some(r => config.patronRoleIds.includes(r.id))) {
      return interaction.reply({ content: "❌ Only Patron can verify.", flags: 64 });
    }

    const newEmbed = EmbedBuilder.from(embed)
      .spliceFields(4, 1, {
        name: "STATUS",
        value: `☑️ VERIFIED BY: ${interaction.user}`
      });

    return interaction.message.edit({ embeds: [newEmbed] });
  }

  if (interaction.customId === "gang_unrole_approve") {

    const userId = footer.split("|")[1].trim();
    const member = await interaction.guild.members.fetch(userId);

    for (const r of config.gangRoleIds) {
      if (member.roles.cache.has(r)) await member.roles.remove(r);
    }

    const cooldownEnd = Math.floor((Date.now() + COOLDOWN_TIME) / 1000);
    cooldown.set(userId, cooldownEnd * 1000);

    return interaction.reply({ content: "✅ Unrole approved.", flags: 64 });
  }

  if (interaction.customId === "gang_unrole_deny") {
    return interaction.reply({ content: "❌ Unrole denied.", flags: 64 });
  }
}

// ================= NORMAL REQUEST =================
else {

  const roleId = footer.split("|")[1].trim();

  const job = Object.values(jobs).find(j => j.roleId === roleId);
  const gang = Object.values(gangs).find(g => g.roleId === roleId);

  // ================= JOB =================
  if (job && interaction.customId.startsWith("job_")) {

    if (interaction.customId === "job_verify") {

      if (!interaction.member.roles.cache.has(job.directorRoleId)) {
        return interaction.reply({ content: "❌ Only Director.", flags: 64 });
      }

      const newEmbed = EmbedBuilder.from(embed)
        .spliceFields(3, 1, {
          name: "DIRECTOR APPROVAL",
          value: `✅ VERIFIED BY: ${interaction.user}`
        });

      return interaction.message.edit({ embeds: [newEmbed] });
    }

    if (interaction.customId === "job_approve") {

      const userId = embed.fields[0].value.replace(/[<@!>]/g, "");
      const member = await interaction.guild.members.fetch(userId);

      for (const r of config.jobRoleIds) {
        if (member.roles.cache.has(r)) await member.roles.remove(r);
      }

      await member.roles.add(job.roleId);

      return interaction.reply({ content: "✅ Job approved.", flags: 64 });
    }

    if (interaction.customId === "job_deny") {
      return interaction.reply({ content: "❌ Denied.", flags: 64 });
    }
  }

  // ================= GANG =================
  if (gang && interaction.customId.startsWith("gang_")) {

    if (interaction.customId === "gang_verify") {

      if (!interaction.member.roles.cache.some(r => config.patronRoleIds.includes(r.id))) {
        return interaction.reply({ content: "❌ Only Patron.", flags: 64 });
      }

      const newEmbed = EmbedBuilder.from(embed)
        .spliceFields(3, 1, {
          name: "PATRON/A APPROVAL",
          value: `✅ VERIFIED BY: ${interaction.user}`
        });

      return interaction.message.edit({ embeds: [newEmbed] });
    }

    if (interaction.customId === "gang_approve") {

      const userId = embed.fields[0].value.replace(/[<@!>]/g, "");
      const member = await interaction.guild.members.fetch(userId);

      for (const r of config.gangRoleIds) {
        if (member.roles.cache.has(r)) await member.roles.remove(r);
      }

      await member.roles.add(gang.roleId);

      return interaction.reply({ content: "✅ Gang approved.", flags: 64 });
    }

    if (interaction.customId === "gang_deny") {
      return interaction.reply({ content: "❌ Denied.", flags: 64 });
    }
  }

}

});
};
