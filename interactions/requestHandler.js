// ✅ FULL UPGRADED MERGED SYSTEM (JOB + GANG)
// Restores verification flow, permissions, embeds, cooldown, and safety

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
  try {
    await fn();
  } catch (err) {
    console.error("❌ ERROR:", err);
    const msg = "❌ Something went wrong. Contact admin.";

    if (interaction.deferred || interaction.replied) {
      interaction.editReply(msg).catch(() => {});
    } else {
      interaction.reply({ content: msg, flags: 64 }).catch(() => {});
    }
  }
}

module.exports = async (interaction) => {

/* ================= SELECT ================= */
if (interaction.isStringSelectMenu()) {

  const key = interaction.values[0];

  if (interaction.customId === "job_select") {
    const modal = new ModalBuilder()
      .setCustomId(`job_request:${key}`)
      .setTitle("Job Request")
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("ingame_name")
          .setLabel("IN-GAME NAME")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ));

    return interaction.showModal(modal);
  }

  if (interaction.customId === "gang_select") {
    const modal = new ModalBuilder()
      .setCustomId(`gang_request:${key}`)
      .setTitle("Gang Request")
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

/* ================= MODALS ================= */
if (interaction.isModalSubmit()) {
return safeExecute(interaction, async () => {

await interaction.deferReply({ flags: 64 });
const member = interaction.member;

// cooldown
if (cooldown.has(member.id) && cooldown.get(member.id) > Date.now()) {
  return interaction.editReply("❌ You are on cooldown.");
}

/* ===== JOB REQUEST ===== */
if (interaction.customId.startsWith("job_request:")) {

if (member.roles.cache.some(r => config.jobRoleIds.includes(r.id)))
  return interaction.editReply("❌ You already have a job.");

if (member.roles.cache.some(r => config.gangRoleIds.includes(r.id)))
  return interaction.editReply("❌ Leave your gang first.");

const key = interaction.customId.split(":")[1];
const job = jobs[key];

const embed = new EmbedBuilder()
.setColor(0x0099ff)
.setTitle("🏢 JOB REQUEST")
.addFields(
{name:"USER",value:`<@${interaction.user.id}>`},
{name:"IGN",value:interaction.fields.getTextInputValue("ingame_name")},
{name:"ROLE",value:`<@&${job.roleId}>`},
{name:"DIRECTOR",value:"❌ NOT VERIFIED"},
{name:"STATUS",value:"🟡 WAITING"}
)
.setFooter({text:`JOB | ${job.roleId}`});

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("job_verify").setLabel("VERIFY").setStyle(ButtonStyle.Primary),
new ButtonBuilder().setCustomId("job_approve").setLabel("APPROVE").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("job_deny").setLabel("DENY").setStyle(ButtonStyle.Danger)
);

const ch = await interaction.client.channels.fetch(config.jobRequestChannelId).catch(()=>null);
if (!ch) return interaction.editReply("❌ Channel missing");

await ch.send({embeds:[embed],components:[row]});
return interaction.editReply("✅ Submitted");
}

/* ===== GANG REQUEST ===== */
if (interaction.customId.startsWith("gang_request:")) {

if (member.roles.cache.some(r => config.gangRoleIds.includes(r.id)))
  return interaction.editReply("❌ Already in gang.");

if (member.roles.cache.some(r => config.jobRoleIds.includes(r.id)))
  return interaction.editReply("❌ Remove job first.");

const key = interaction.customId.split(":")[1];
const gang = gangs[key];

const embed = new EmbedBuilder()
.setColor(0xff8800)
.setTitle("📄 GANG REQUEST")
.addFields(
{name:"USER",value:`<@${interaction.user.id}>`},
{name:"IGN",value:interaction.fields.getTextInputValue("ingame_name")},
{name:"ROLE",value:`<@&${gang.roleId}>`},
{name:"PATRON",value:"❌ NOT VERIFIED"},
{name:"STATUS",value:"🟡 WAITING"}
)
.setFooter({text:`GANG | ${gang.roleId}`});

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("gang_verify").setLabel("VERIFY").setStyle(ButtonStyle.Primary),
new ButtonBuilder().setCustomId("gang_approve").setLabel("APPROVE").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("gang_deny").setLabel("DENY").setStyle(ButtonStyle.Danger)
);

const ch = await interaction.client.channels.fetch(config.gangRequestChannelId).catch(()=>null);
if (!ch) return interaction.editReply("❌ Channel missing");

await ch.send({embeds:[embed],components:[row]});
return interaction.editReply("✅ Submitted");
}

});
}

/* ================= BUTTONS ================= */
if (!interaction.isButton()) return;

return safeExecute(interaction, async () => {

const embed = interaction.message.embeds[0];
if (!embed) return interaction.reply({content:"❌ No embed",flags:64});

const footer = embed.footer?.text;
if (!footer) return;

const [type, roleId] = footer.split("|").map(s=>s.trim());

const member = interaction.member;

/* ===== JOB ===== */
if (type === "JOB") {

const job = Object.values(jobs).find(j=>j.roleId===roleId);

if (interaction.customId === "job_verify") {

if (!member.roles.cache.has(job.directorRoleId))
  return interaction.reply({content:"❌ Director only",flags:64});

const newEmbed = EmbedBuilder.from(embed)
.spliceFields(3,1,{name:"DIRECTOR",value:`✅ ${interaction.user}`})
.spliceFields(4,1,{name:"STATUS",value:"🔵 READY"});

return interaction.message.edit({embeds:[newEmbed]});
}

if (interaction.customId === "job_approve") {

const verified = embed.fields[3].value.includes("✅");
if (!verified)
  return interaction.reply({content:"❌ Not verified",flags:64});

if (!config.adminRoleIds.some(id=>member.roles.cache.has(id)))
  return interaction.reply({content:"❌ Admin only",flags:64});

const userId = embed.fields[0].value.replace(/[^0-9]/g,"");
const target = await interaction.guild.members.fetch(userId);

for (const r of config.jobRoleIds) {
  if (target.roles.cache.has(r)) await target.roles.remove(r);
}

await target.roles.add(job.roleId);

const newEmbed = EmbedBuilder.from(embed)
.spliceFields(4,1,{name:"STATUS",value:`✅ APPROVED BY ${interaction.user}`});

await interaction.message.edit({embeds:[newEmbed],components:[]});
return interaction.reply({content:"✅ Approved",flags:64});
}

if (interaction.customId === "job_deny") {
return interaction.reply({content:"❌ Denied",flags:64});
}
}

/* ===== GANG ===== */
if (type === "GANG") {

const gang = Object.values(gangs).find(g=>g.roleId===roleId);

if (interaction.customId === "gang_verify") {

if (!member.roles.cache.some(r=>config.patronRoleIds.includes(r.id)))
  return interaction.reply({content:"❌ Patron only",flags:64});

const newEmbed = EmbedBuilder.from(embed)
.spliceFields(3,1,{name:"PATRON",value:`✅ ${interaction.user}`})
.spliceFields(4,1,{name:"STATUS",value:"🔵 READY"});

return interaction.message.edit({embeds:[newEmbed]});
}

if (interaction.customId === "gang_approve") {

const verified = embed.fields[3].value.includes("✅");
if (!verified)
  return interaction.reply({content:"❌ Not verified",flags:64});

if (!config.adminRoleIds.some(id=>member.roles.cache.has(id)))
  return interaction.reply({content:"❌ Admin only",flags:64});

const userId = embed.fields[0].value.replace(/[^0-9]/g,"");
const target = await interaction.guild.members.fetch(userId);

for (const r of config.gangRoleIds) {
  if (target.roles.cache.has(r)) await target.roles.remove(r);
}

await target.roles.add(gang.roleId);

const newEmbed = EmbedBuilder.from(embed)
.spliceFields(4,1,{name:"STATUS",value:`✅ APPROVED BY ${interaction.user}`});

await interaction.message.edit({embeds:[newEmbed],components:[]});
return interaction.reply({content:"✅ Approved",flags:64});
}

if (interaction.customId === "gang_deny") {
return interaction.reply({content:"❌ Denied",flags:64});
}
}

});
};
