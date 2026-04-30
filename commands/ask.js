const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Groq = require("groq-sdk");
const rules = require("../data/serverRules");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const cooldown = new Map();

// 🔧 normalize text
const clean = (str) =>
  str.toLowerCase().replace(/[^a-z0-9\s]/g, "");

// 🔧 basic keywords (extend anytime)
const KEYWORDS = [
  "vdm", "rdm", "rob", "kidnap", "hostage",
  "highground", "traphouse", "raid", "scam"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask server rules")
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("Your question")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const questionRaw = interaction.options.getString("question");
    const question = clean(questionRaw);

    // ⏳ cooldown
    if (cooldown.has(userId)) {
      const time = cooldown.get(userId);
      if (Date.now() < time) {
        return interaction.reply({
          content: "⏳ Wait before asking again.",
          flags: 64
        });
      }
    }
    cooldown.set(userId, Date.now() + 5000);

    if (!process.env.GROQ_API_KEY) {
      return interaction.reply({
        content: "❌ Groq API key not set.",
        flags: 64
      });
    }

    try {
      await interaction.deferReply();

      // 🔍 MATCHING (accurate + tolerant)
      const lines = rules.split("\n");
      const words = question.split(" ").filter(Boolean);

      const matched = lines.filter(line => {
        const lower = clean(line);

        return (
          // keyword boost
          KEYWORDS.some(k =>
            question.includes(k) && lower.includes(k)
          ) ||
          // word match + plural tolerance
          words.some(word =>
            lower.includes(word) ||
            lower.includes(word.replace(/s$/, ""))
          )
        );
      });

      // 🔥 context (STRICT but safe fallback)
      const context =
        matched.length > 0
          ? matched.slice(0, 20).join("\n")
          : ""; // IMPORTANT: empty = forces DEPENDE

      // 🧠 PERFECT ACCURACY PROMPT
      const prompt = `
      you can answer everything using your brain
      answer everything questions

      You are a Roleplay Server Rules AI Assistant.

      Your task is to answer user questions STRICTLY based on the server rules provided. You must NOT assume, invent, or use outside knowledge.

      GUIDELINES:
      - Only use the exact rules given.
      - Always cite the specific rule (Article and Section).
      - If no rule applies, say: "No specific rule found regarding this."
      - If the situation is unclear, say: "Depends on scenario" and explain both sides based on rules.
      - Do not guess or make up punishments unless stated in the rules.
      - Keep answers clear, direct, and professional.

      RESPONSE FORMAT:

      Verdict: (Allowed / Not Allowed / Depends)

      Rule Basis:
      (Quote exact rule: Article and Section)

      Explanation:
      (Explain in simple terms why it is allowed or not)

      Notes:
      (Optional — add clarifications if needed)

      IMPORTANT:
      - Stay neutral at all times.
      - Do not add opinions.
      - Focus only on rule-based judgment.      

HERE'S THE RULE

By joining POBLACION ROLEPLAY, you agree to read and follow all the rules provided. These guidelines are here to ensure a safe, respectful, and enjoyable space for everyone. Failure to comply may result in warnings, sanctions, and bans depending on the severity of the violation.

𝐂𝐈𝐓𝐘 𝐋𝐀𝐖 𝐍𝐎. 1:

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 1:

▸ Section 1.1 Trash talk is fine in the spirit of the game, but any form of discrimination, hate speech, toxic behavior, or harassment will not be tolerated and may result in permanent ban.
▸ Section 2.1 Posting / Spamming any +18 content (NSFW or nudity), suspicious links/downloads, and potential virus will result in permanent ban.
▸ Section 3.1 Distribution of personal information (OOC name, address, pictures, etc.) is strictly prohibited.
▸ Section 4.1 Advertising contents that are not related to Poblacion Roleplay is forbidden.
▸ Section 5.1 Your server nickname and Discord role should be in accord with your RP persona.
▸ Section 6.1 Any form of disrespect/threat made towards Poblacion Roleplay and its management will result in permanent ban from this server.
▸ Section 7.1 The person you have vouched for whitelist is your responsibility. Once they have been caught using 3rd party softwares / illegal mod files, you will be automatically sanctioned.


𝐂𝐈𝐓𝐘 𝐋𝐀𝐖 𝐍𝐎. 2

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 1:

𝐁𝐔𝐆 𝐄𝐗𝐏𝐋𝐎𝐈𝐓𝐈𝐍𝐆

Intentionally using game features and/or bugs inside the city to gain an advantage over others will not be tolerated. This includes, but is not limited to:

▸ Section 1.1 Abusing game mechanics, glitches, and bugs inside the city
▸ Section 1.2 Hold/spam radio
▸ Section 1.3 Cancel emote
▸ Section 1.4 Magic bunot

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 2:

𝐒𝐄𝐗𝐔𝐀𝐋 𝐑𝐎𝐋𝐄𝐏𝐋𝐀𝐘

Any roleplay involving any form of sexual harassment/rape/sex will be strictly prohibited without consent. This includes, but is not limited to:

▸ Section 2.1 Explicit emotes.
▸ Section 2.2 Sexual favors.
▸ Section 2.3 Unpleasant advances.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 3:

𝐎𝐅𝐅𝐄𝐍𝐒𝐈𝐕𝐄 𝐑𝐎𝐋𝐄𝐏𝐋𝐀𝐘

Roleplay that are considered as offensive may include torture, dismemberment, or any other roleplay that may disgust other players are considered as offensive roleplay.

▸ Section 3.1 Any form of racial discrimination, prejudice, or offensive language based on race that intentionally degrades someone.
▸ Section 3.2 Use of homophobic or racial slurs.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 4:

𝐈𝐋𝐋𝐄𝐆𝐀𝐋 𝐌𝐎𝐃𝐒 𝐀𝐍𝐃 𝐓𝐇𝐈𝐑𝐃-𝐏𝐀𝐑𝐓𝐘 𝐒𝐎𝐅𝐓𝐖𝐀𝐑𝐄
Note: Illegal mods include, but is not limited to:

▸ Section 4.1 No Water/Bush/Trees/Props.
▸ Section 4.2 Bullet Penetration.
▸ Section 4.3 Better Movement and Any Illegal RPF.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 4.1:

Players caught using any type of Third-Party Software will be automatically banned from the city. Sanctions will also be given for the following:

▸ Section 4.4 Using another device during PC check.
▸ Section 4.5 Traces of using a cleaner prior to a PC check.
▸ Section 4.6 Reformatting the device before a PC check.
▸ Section 4.7 Clean Registry before a PC check.
▸ Section 4.8 No FiveM traces before a PC check .

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 5:

𝐁𝐔𝐒𝐈𝐍𝐄𝐒𝐒 𝐑𝐔𝐋𝐄𝐒

▸ Section 5.1 Businesses found to have pricing significantly above or below the established city economy will receive a formal warning. Repeated violations may result in further administrative action.
▸ Section 5.2 No business location will be designated as a Safe Zone. All businesses are subject to deep roleplay scenarios, including those that may escalate into shootouts.
▸ Section 5.3 Businesses have the right to ban gangs, individuals, or even members of the Police and Sheriff departments.
▸ Section 5.4 Police and Sheriffs may assist businesses in resolving issues with gangs, but they cannot side with gangs against business owners.
▸ Section 5.5 Gangs can be connected to businesses through RP if there's a proven connection.
▸ Section 5.6 Gangs are allowed to draw weapons inside business premises.
▸ Section 5.7 Shootouts inside businesses are allowed as long as consequences are handled properly, such as being banned from the business or being flagged as wanted by police.
▸ Section 5.8 Hold-ups inside businesses after 6:00 PM are strictly prohibited.
▸ Section 5.9 Kidnapping after 6:00 PM is still permitted as a form of roleplay scenario, but direct hold-ups or robberies within business premises during this time will not be allowed.
▸ Section 5.10 If someone is on duty but not inside / around the establishment, it is considered as metable and may result to fail roleplay.
▸ Section 5.11 If it is proven that there are employees on duty but not within the business vicinity, the business employee will be held accountable for the sanction.
▸ Section 5.12 Stash cars located outside the businesses can be robbed /taken without roleplay. Verbal roleplay is only required for actions taking place inside the business premises.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 6:

𝐎𝐔𝐓𝐒𝐈𝐃𝐄 𝐂𝐈𝐓𝐘 𝐁𝐎𝐔𝐍𝐃𝐀𝐑𝐈𝐄𝐒

▸ Section 6.1 Class 3 weapons are only permitted for use during engagements that occur outside city limits and hostage taking inside City limits.
▸ Section 6.2 Wearing of helmets are only permitted during engagements or illegal grindings occurring outside the city. This applies to all Police, Sheriff, Gang Members, and Civilians.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 7:

𝐈𝐌𝐌𝐔𝐍𝐈𝐓𝐘 𝐂𝐀𝐑𝐃 𝐑𝐔𝐋𝐄𝐒

▸ Section 7.1 What is an Immunity Card?
An Immunity Card is given to new players to allow them time to settle into the city and adapt to roleplay.

▸ Section 7.2 You CANNOT:
▸Rob, harm, or engage in violence against players with an Immunity Card.
▸ Force a new player into an RP scenario that could lead to them being robbed or injured.

▸ Section 7.3 Your Immunity Card is VOIDED if:
▸ You initiate violence or engage in hostile actions first.
▸ You actively participate in criminal activities that would logically make you a target.

▸ Section 7.4 An Immunity Card does NOT protect against hostage-taking or kidnappings, as long as their money and items remain untouched.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 8:

𝐋𝐎𝐎𝐓𝐈𝐍𝐆/𝐕𝐔𝐋𝐓𝐔𝐑𝐄

▸ Section 8.1 EMS must check vitals before police can loot.
▸ Section 8.2 Police may only loot illegal items, not clean money, food, or meds.
▸ Section 8.3 EMS on duty cannot be looted.
▸ Section 8.3 Do not loot corpses in body bags.
▸ Section 8.3 Vulture looting is allowed but if caught and killed, it cannot be reported.
▸ Section 8.4 You’re not allowed to loot in a gang-to-gang war if you're not involved in the fight.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 9:

𝐍𝐄𝐖 𝐂𝐈𝐓𝐈𝐙𝐄𝐍/𝐁𝐀𝐆𝐎𝐍𝐆 𝐒𝐈𝐋𝐀𝐍𝐆

▸ Section 9.1 New Citizens will not have any immunity against rules and sanctions imposed by the management so please make sure that you have read the guidebook.
▸ Section 9.2 Harming new citizens within their first day is strictly prohibited unless they engage first.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 10:

𝐂𝐎𝐌𝐁𝐀𝐓 𝐋𝐎𝐆𝐆𝐈𝐍𝐆

▸ Section 10.1 Disconnecting to avoid death, arrest, or item loss is not allowed. Provide proof (screenshots, clips) if disconnection was accidental.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 11:

𝐁𝐑𝐄𝐀𝐊𝐈𝐍𝐆 𝐑𝐎𝐋𝐄𝐏𝐋𝐀𝐘

▸ Section 11.1 Players are required to stay in-character at all times while in the server.
▸ Section 11.2 The roleplay must be completed and concluded before any complaints or reports can be filed.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 13:

𝐕𝐄𝐇𝐈𝐂𝐋𝐄 𝐃𝐄𝐀𝐓𝐇𝐌𝐀𝐓𝐂𝐇 (𝐕𝐃𝐌)

▸ Section 13.1 Using a vehicle with the intent to deliberately hit, injure, or kill another player without valid roleplay reason or proper initiation is strictly prohibited. Vehicles should not be used as weapons unless the scenario is logically supported by roleplay (e.g., a high-speed police chase or life-threatening situation).
▸ Section 13.2 Randomly running over players, ramming cars without RP justification, or abusing vehicles to gain advantage in combat is considered VDM and will result in punishment.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 14:

𝐌𝐄𝐓𝐀𝐆𝐀𝐌𝐈𝐍𝐆

▸ Section 14.1 Metagaming happens when a player uses information that their character could not realistically know in the roleplay environment. It’s when out-of-character (OOC) knowledge, such as what you hear on Discord, Livestreams, or OOC chat, is used in-character (IC). This breaks immersion and gives unfair advantages because your character should only act on what they personally experience or learn within the roleplay world.
▸ Section 14.2 Face recognition is not considered as metagaming.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 15:

𝐍𝐎𝐓 𝐎𝐍𝐄 𝐒𝐘𝐍𝐂 𝐏𝐎𝐋𝐈𝐂𝐘

▸ Section 15.1 Please be guided by the following rules regarding Not One Sync reports:
▸ Section 15.2 Any Not One Sync report will NOT be entertained if the person who posted does not have their respective role in the City Discord.
▸ Section 15.3 Likewise, if you are the one being reported and you do not have any gang role or One Sync role in the City Discord, your side will NOT be entertained.
▸ Section 15.4 STRICT COMPLIANCE: Once you are posted under Not One Sync, you are required to proceed immediately for cleaning (linis), regardless if you are in an ongoing roleplay, operation, or even live streaming.
Note: No delays. No excuses. No one is exempt from this rule.

IMPORTANT NOTE:
If the reported individual is confirmed Not One Sync and found guilty, the corresponding sanction will be TRIPLED.

ADMIN NOTICE:
There may be slight delays in issuing sanctions or comserv due to workload and multiple reports being handled. Please be advised that we may occasionally overlook the channel, but rest assured that all valid reports will be reviewed and sanctions will be given accordingly.

▸ Section 15.5 Ensure that your Steam/FiveM name, In-Game name, Discord nickname, and Discord role are properly synchronized. Any mismatch may result in nullification of your report.
▸ Section 15.6 If the reported individual is confirmed Not One Sync and found guilty, the corresponding sanction will be tripled.


𝐂𝐈𝐓𝐘 𝐋𝐀𝐖 𝐍𝐎. 3:

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 1:

𝐆𝐄𝐍𝐄𝐑𝐀𝐋 𝐑𝐄𝐃 / 𝐃𝐀𝐍𝐆𝐄𝐑 𝐙𝐎𝐍𝐄 𝐑𝐔𝐋𝐄𝐒

Red or Danger Zones are designated Kill-On-Sight (KOS) areas—combat can be initiated without verbal communication. Please be advised of the following rules._

▸ Section 1.1 Players inside the Red Zone can shoot players outside the Red Zone.
▸ Section 1.2 Players outside the Red Zone cannot shoot players inside the Red Zone.
▸ Section 1.3 If both players are outside the Red Zone, shooting is not allowed unless proper verbal initiation is made.
▸ Section 1.4 Wearing full-face masks is strictly prohibited.
▸ Section 1.5 Wearing of helmets are allowed outside the City RP engagements. This applies to all Poblacion Police and Sheriff Department, Gang Members, and Civilians.
▸ Section 1.6 For Turf and Airdrop: Once inside the zone, players may still engage in combat even after the timer has expired or when the red dome is no longer visible.
▸ Section 1.7 For Traphouse, shooting each other is not allowed unless it has been triggered.
▸ Section 1.8 Wearing of helmets are permitted during illegal grindings inside and outside the City. However, for City illegal grindings: within a two-block radius, including the specific illegal area, helmets may be used.
▸ Section 1.9 Unli balik is allowed in illegal grindings.
▸ Section 1.10 For illegal activities, the use of motor vehicles is not allowed.
▸ Section 3.20 Gangs are allowed to use Sunrise with your gang color or any local 4-door non-bulletproof or any sedan car that is not considered powergaming, andprovided that the vehicle clearly represents their gang’s color. This means the primary color of the car should match or strongly reflect the official color associated with the gang.
▸ Section 1.12 A maximum of two units, or up to eight civilians, are allowed to participate in illegal grinding activities, and all participants must wear the same uniform or outfit.

Designated Red Zones:
▸ Section 1.13 Turfwar.
▸ Section 1.14 Trap Houses.
▸ Section 1.15 Gang Bases (including up to 2 blocks away from the exact postal).
▸ Section 1.16 Airdrop Areas.
▸ Section 1.17 Illegal Grinding Spots.

Note: All rules apply unless implied otherwise. Ignorance of the rules is not an excuse. Trying to find loopholes or bending the rules to gain advantage is strictly prohibited. No one will be exempted from the law.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 2:

𝐆𝐑𝐄𝐄𝐍 / 𝐒𝐀𝐅𝐄𝐙𝐎𝐍𝐄

▸ Section 2.1 All criminal activities are strictly prohibited within Green / Safe Zone areas.
▸ Section 2.2 Bringing or carrying an AFK individual outside of a Safe Zone with the intent to kill, steal, or take hostage is strictly forbidden.
▸ Section 2.3 Stealing vehicles and their contents (Trunkmaster) is not allowed and will result in extreme sanctions.
▸ Section 2.4 Any act of killing in front of HP, carried out without meaningful engagement and resulting in toxicity (or canceran), will result in an automatic sanction of 3000 community service for each individual involved.
▸ Section 2.5 If you die due to your own negligence, it cannot be reported since it’s your own lapses — for example, dying from hunger or illness.

Designated Safe Zones include:
▸ Section 2.6 Hospital.
▸ Section 2.7 Legal Grinding Spots.
▸ Section 2.8 Safezone spawn points.
▸ Section 2.9 Recmats and recmats market / selling.
▸ Section 2.10 Morgue.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 3:

𝐓𝐔𝐑𝐅𝐖𝐀𝐑 𝐑𝐔𝐋𝐄𝐒

▸ Section 3.1 Class 1 weapons only inside the City.
▸ Section 3.2 Class 1-3 weapons for outside City boundaries.
▸ Section 3.3 Helmets are allowed for all.
▸ Section 3.4 All gangs and POBLACION Taskforce can participate in the said shootout. Civilians are not allowed.
▸ Section 3.5 Drive-by is not allowed.
▸ Section 3.6 No EMS required.
▸ Section 3.7 Everyone must wear their respective uniforms.
▸ Section 3.8 Wearing of full-face masks is not allowed.
▸ Section 3.9 Wearing of costumes such as alien suits, cockroach outfits, Among Us characters, ghillie suits, wing accessories, etc., is strictly prohibited.
▸ Section 3.10 Once you enter the area, you are not allowed to get out of the zone as you will die instantly.
▸ Section 3.11 Using any object or vehicle to block an entry point will be considered as power gaming.
▸ Section 3.12 Unlimited respawn (unli balik) is allowed while the dome / zone is still active.
▸ Section 3.13 You are not allowed to return in the vicinity once the zone / dome expires, this may lead to RDM sanction automatically.
▸ Section 3.14 If a shootout has already started while the redzone is active, the engagement remains valid even if the redzone disappears during the encounter. All involved parties are still considered part of an active gunfight. Therefore, killing or being killed within the continuation of that same engagement is allowed.
▸ Section 3.15 If the job is not set to the designated gang and that gang is caught claiming the turf, it will result in a gang sanction.
▸ Section 3.16 Poblacion Police and Sheriff is not allowed to use any helicopters or riot truck in any turf wars.
▸ Section 3.17 You are only allowed to use ANY CAR as a getaway vehicle strictly from TURF WAR, AIRDROP, and TRAPHOUSE. If you are caught using this rule as an excuse outside of these situations, you will be penalized.
▸ Section 3.18 If asked for proof, you must provide a clip clearly showing that you came directly from a TURF WAR, AIRDROP, or TRAPHOUSE. Failure to provide a valid clip will result in sanctions.
▸ Section 3.19 Failure to follow or send the proper template stating that a gang will be intercepting a turf will lead to possible demerits. Please ensure that the correct procedure and template are followed before conducting any interception.
▸ Section 3.20 Gangs are allowed to use any locally available 4-door vehicle, provided that the vehicle clearly represents their gang’s color. This means the primary color of the car should match or strongly reflect the official color associated with the gang.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 4:

𝐓𝐑𝐀𝐏𝐇𝐎𝐔𝐒𝐄 𝐑𝐔𝐋𝐄𝐒

▸ Section 4.1 Class 1 weapons only.
▸ Section 4.2 Anyone can trigger and intercept (maximum of 4 civilians).
▸ Section 4.3 Drive-by is prohibited once you are on a hold-up point or while inside the Traphouse.
▸ Section 4.4 Strictly no back-ups and alliances.
▸ Section 4.5 Police officers and Sheriffs are not allowed to trigger or intercept if the trap house has not been triggered (maximum of 6 police officers only).
▸ Section 4.6 Third comms is allowed in traphouse.
▸ Section 4.7 Police officers and sheriffs are not allowed to use riot cars, riot shields, and BZ gas.
▸ Section 4.8 Naked body, topless, bottomless, invisible hands, body, and legs are not allowed.
▸ Section 4.9 Civilians in the same team must wear the same clothing (color and style).
▸ Section 4.10 Wearing of gang rep is not allowed.
▸ Section 4.11 Wearing of full face mask and headgear (under the helmet category) is not allowed.
▸ Section 4.12 Wearing of costumes (alien, cockroach, among us, ghillie, wing accessories, etc.) is not allowed.
▸ Section 4.13 You are allowed to use any local four door car.
▸ Section 4.14 Using of gang cars is not allowed. Gangs can only use the plain cars provided at their garage.
▸ Section 4.15 You can return to the vicinity as many times as you want until the trigger ends. (Unli balik)
▸ Section 4.16 Areas such as rooftops, elevated platforms, or any high location that require a ladder, climbing, or the use of hands/jumping to access are considered high grounds.
▸ Section 4.17 If a shootout has already started while the redzone is active, the engagement remains valid even if the redzone disappears during the encounter. All involved parties are still considered part of an active gunfight. Therefore, killing or being killed within the continuation of that same engagement is allowed.
▸ Section 4.18 Any attempt to use the disappearance of the redzone as a reason to void the ongoing fight will not be entertained.
▸ Section 4.19 Traphouse redzone will be removed 2 minutes after the winner is announced as “CLAIMED.” This is to prevent players from entering the area late just to claim the prize unfairly.
▸ Section 4.20 Once you enter an active traphouse within the redzone, you are not allowed to leave the redzone area. Exiting the redzone while the traphouse is still active will result in a health deduction
▸ Section 4.21 You are only allowed to use ANY CAR as a getaway vehicle strictly from TURF WAR, AIRDROP, and TRAPHOUSE. If you are caught using this rule as an excuse outside of these situations, you will be penalized.
▸ Section 4.22 If asked for proof, you must provide a clip clearly showing that you came directly from a TURF WAR, AIRDROP, or TRAPHOUSE. Failure to provide a valid clip will result in sanctions.
▸ Section 4.23 Poblacion Police and Sheriff is not allowed to use any helicopters or riot truck in any traphouse.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 5:

𝐀𝐈𝐑𝐃𝐑𝐎𝐏 𝐑𝐔𝐋𝐄𝐒

▸ Section 5.1 Class 1 weapons only inside the City.
▸ Section 5.2 Class 1-3 weapons for outside City boundaries.
▸ Section 5.3 Helmets are allowed for all.
▸ Section 5.4 Airdrop will drop every 4 hours. There will be designated drop zones where airdrops can appear during the event.
▸ Section 5.5 All Gangs, Police and Sheriffs are allowed to join. Everyone must wear their respective uniforms. Civilians are NOT Allowed to join,
▸ Section 5.6 No EMS required.
▸ Section 5.7 Gang alliances are strictly forbidden.
▸ Section 5.8 Teaming up with other gangs, Police and Sheriff is strictly prohibited.
▸ Section 5.9 Wearing of full-face masks is not allowed.
▸ Section 5.10 Wearing of costumes such as alien suits, cockroach outfits, Among Us characters, ghillie suits, wing accessories, etc., is strictly prohibited.
▸ Section 5.11 If the airdrop is not visible to you, you are not allowed to participate.
▸ Section 5.12 Once you enter the area, you are not allowed to get out of the zone as you will die instantly.
▸ Section 5.13 Using any object or vehicle to block an entry point will be considered as power gaming.
▸ Section 5.14 Unlimited respawn (unli balik) is allowed while the dome / zone is still active.
▸ Section 5.15 You are not allowed to return in the vicinity once the zone / dome expires, this may lead to RDM sanction automatically.
▸ Section 5.16 If a shootout has already started while the redzone is active, the engagement remains valid even if the redzone disappears during the encounter. All involved parties are still considered part of an active gunfight. Therefore, killing or being killed within the continuation of that same engagement is allowed.
▸ Section 5.17 Engaging in conflict during or after the airdrop is over is considered RP stacking and is strictly prohibited.
▸ Section 5.18 Poblacion Police and Sheriff is NOT allowed to use any helicopters or riot truck in any turf wars.
▸ Section 5.19 You are only allowed to use ANY CAR as a getaway vehicle strictly from TURF WAR, AIRDROP, and TRAPHOUSE. If you are caught using this rule as an excuse outside of these situations, you will be penalized.
▸ Section 5.20 If asked for proof, you must provide a clip clearly showing that you came directly from a TURF WAR, AIRDROP, or TRAPHOUSE. Failure to provide a valid clip will result in sanctions.
▸ Section 5.21 Failure to follow or send the proper template stating that a gang will be intercepting a turf will lead to possible demerits. Please ensure that the correct procedure and template are followed before conducting any interception.
▸ Section 5.22Gangs are allowed to use any locally available 4-door vehicle, provided that the vehicle clearly represents their gang’s color. This means the primary color of the car should match or strongly reflect the official color associated with the gang.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 6:

DIVISION OF CITY LIMITS AND OUTSIDE CITY LIMITS

▸ Section 6.1 In terms of City Limits, only the rules written in the Rulebook/Bible will be followed. Whatever is stated there is final, and players must comply strictly within the city boundaries.

▸ Section 6.2 For Outside City Limits, Class 1 to 3 weapons are allowed in scenarios such as hostage situations, street activities, and similar engagements.

▸Section 6.3 However, for small store robberies, traphouse robberies, and other specific activities where Class 3 weapons are not allowed, the individual activity rules that are posted must still be followed, not the outside city limits rules.

▸Section 6.4 Please be advised that Palmer Station Turf is now included under the Outside City Limits area. Kindly take note of this update and follow the corresponding rules that apply to the said zone. Thank you.

IN SHORT:
▸ City Limits = Rules are already posted or written
▸ Outside City Limits = Class 1–3 allowed (only for allowed scenarios)
▸ Small Store Robberies, Traphouse, and etc outside City limits  = Follow posted rules even if outside city limits


𝐂𝐈𝐓𝐘 𝐋𝐀𝐖 𝐍𝐎. 4:

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 1:

𝐆𝐄𝐍𝐄𝐑𝐀𝐋 𝐆𝐀𝐍𝐆 𝐑𝐔𝐋𝐄𝐒
Patrons and Higher Ups will be held responsible for any misconduct committed by their members if they fail to identify the reported individual.

▸ Section 1.1 All gang members must wear their full gang uniform or gang colors during any gang-related activity. Partial outfits (e.g., missing bottoms) are not allowed. Bandanas, “pandong,” or masks alone are not considered valid gang representation.
▸ Section 1.2 Wearing costumes such as alien suits, cockroach outfits, Among Us characters, ghillie suits, or wing accessories is strictly prohibited.
▸ Section 1.3 Police, Sheriff, Civilians or Gang members wearing civilian clothing are prohibited to use a gang's car.
▸ Section 1.4 Gang members are prohibited to use another gang's car.
▸ Section 1.5 Civilians and gang members are not permitted to use police, EMS, or mechanic vehicles under any circumstances.
▸ Section 1.6 Gang members must not lure enemies into their gang bases.
▸ Section 1.7 If you are wearing a civilian attire before an engagement (e.g., during a car chase), you may not return to your gang base for cover or retaliation.
▸ Section 1.8 Gang members must use in-game radio for communication. Using third-party communication platforms (e.g., Discord, Messenger, etc.) during gang operations is strictly prohibited.
▸ Section 1.9 Gang hopping (transferring to another gang without a cooldown period) is prohibited. Patrons and Higher Ups who approve or facilitate illegal transfers will also be sanctioned. Cooldown period for transfers is 3 days (72 hours).

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 2:

𝐆𝐀𝐍𝐆 𝐖𝐀𝐑

The terms of the war are entirely up to the two gangs to decide. However, if either side breaks the agreement, and there is video evidence (clip) or a credible witness to confirm, sanctions will be given.

▸ Section 2.1 Gang war can be initiated any time of the day even if there are no EMS on duty.
▸ Section 2.2 Any gang can request for a meetup as long as there is a prior engagement or conflict. Gang war can be initiated on gang activities, including scam rp, hostage rp, black market location or in any other engagement (except during capture the flag and inside the traphouse or illegal activities) provided that both parties are wearing their respective gang rep.
▸ Section 2.3 Gang wars can happen anywhere up to the Paleto Bay..
▸ Section 2.4 Gang wars must not be initiated 30 mins before server restart.
▸ Section 2.5 Meetups may only be requested through Birdy, our city’s official platform. Invited gangs must acknowledge the request and proceed to the meet up location provided by the requestor——if, for any reason, they choose not to proceed to the family war, a valid reason and demand must be provided during the meet up. Failure to do so will be considered as evading RP.
▸ Section 2.6 If a shootout occurs during the meetup, any rules set between the gangs will be disregarded.
▸ Section 2.7 Location and number of waves should be discussed by Patrons using phones (can be through a phone call or Birdy).
▸ Section 2.8 Gangs are allowed to use Sunrise with your gang color or any local 4-door non-bulletproof or any sedan car that is not considered powergaming, and make sure that the vehicle clearly represents their gang’s color. This means the primary color of the car should match or strongly reflect the official color associated with the gang. Using of helicopters, motorcycles, exclusive and modded cars is prohibited.
▸ Section 2.9 Discussion of waves must be done through Birdy.Returning to your gang base during an ongoing roleplay or shootout will be considered as evading roleplayGang wars must not be initiated 30 mins before server restart.
▸ Section 2.10 Luring your enemies to your gang base is strictly prohibited.
▸ Section 2.11 Parties involve must conclude via meetup in order to end the war.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 3:

𝐒𝐓𝐑𝐄𝐄𝐓 𝐖𝐀𝐑 𝐑𝐔𝐋𝐄𝐒

▸ Section 3.1 Class 1 weapons only.
▸ Section 3.2 No template needed for street wars. Posting announcements while rollin' is sanctionable.
▸ Section 3.3 Wearing of full-face masks and headgears (under the helmet category) is not allowed for citizens/gang members
▸ Section 3.4 Police officers and Sheriffs are allowed to use helmets.
▸ Section 3.5 Gangs are allowed to use Sunrise with your gang color or any local 4-door non-bulletproof or any sedan car that is not considered powergaming, and make sure that the vehicle clearly represents their gang’s color. This means the primary color of the car should match or strongly reflect the official color associated with the gang. Using of helicopters, motorcycles, exclusive and modded cars is prohibited.
▸ Section 3.6 Wearing of costumes (alien, ghillie, wing accessories, etc.) is not allowed
▸ Section 3.7 Please make sure to turn your voice proximity to 'Shouting' before engaging as the primary.
▸ Section 3.8 During daytime (6:01 AM – 17:59 PM), engage in proper verbal communication with at least 3 sentences including a verbal threat before initiating a shootout.
▸ Section 3.9 During nighttime/hold-up hours (18:00 PM – 6:00 AM), a clear declaration must be present before initiating a shootout
▸ Section 3.10 4-man rule when initiating a hold-up roleplay. Backup of gangs are only allowed if they are against with another gang (street war) and if the person you’re robbing is wearing a gang rep.
▸ Section 3.11 Initiators must allow the targeted individuals to comply before shooting
▸ Section 3.12 In the case of fail RP caused by the primary, only the individual who failed to provide proper engagement will receive a sanction
▸ Section 3.13 No other gang is allowed to interfere or participate once two gangs have already initiated a conversation. Third-party interference in any form (verbal communication, shootout, car ramming) is prohibited
▸ Section 3.14 Backup must not be seen around the vicinity of the initiators
▸ Section 3.15 Returning to your gang base during an ongoing roleplay or shootout will be considered as evading roleplay
▸ Section 3.16 Luring your enemies to your gang base is strictly prohibited.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 4:

𝐊𝐈𝐋𝐋-𝐎𝐍-𝐒𝐈𝐆𝐇𝐓 (𝐊𝐎𝐒)

▸ Section 4.1 KOS requires prior engagement and follows strict time and communication guidelines.
▸ Section 4.2 Gangs are allowed to use Sunrise with your gang color or any local 4-door non-bulletproof or any sedan car that is not considered powergaming, and make sure that the vehicle clearly represents their gang’s color. This means the primary color of the car should match or strongly reflect the official color associated with the gang. Using of helicopters, motorcycles, exclusive and modded cars is prohibited.
▸ Section 4.3 Acknowledgement is not required during KOS.
▸ Section 4.4 Provide a 10-15 minute notice via proper template.
▸ Section 4.5 Defending gang must acknowledge the raid with a template. If they don’t, the raid proceeds and is considered Evading RP.
▸ Section 4.6 The only way to end a KOS is either through Danyos, concluding to a peace talk or base raid.
▸ Section 4.7 Roaming around the vicinity of another gang's base is not allowed if there is no base raid intended.
▸ Section 4.8 Returning to your gang base during an ongoing roleplay or shootout will be considered as evading roleplay
▸ Section 4.9 Luring your enemies to your gang base is strictly prohibited.
▸ Section 4.10 If a Kill-On-Sight (KOS) situation escalates into a base raid, all ongoing roleplay between the gangs involved will be considered cut RP.
▸ Section 4.11 The cooldown for KOS will be from server restart to server restart, meaning once the activity ends and the roleplay is concluded, the next wave will be the only time you can declare KOS again on the gang that was previously involved.
▸ Section 4.12 There should be a peace talk or the situation must be resolved 30 minutes before tsunami.

Example KOS Template:
(Gang A Color) is declaring Kill On Sight (KOS) against (Gang B Color) . Anyone seen using their gang vehicle or colors will be shot.

Example Base Raid Notice:
You can’t hide, (Gang B Color)! We will be raiding your base in 15 minutes.
(Gang A Color) is now raiding (Gang B Color)'s base.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 5:

𝐀𝐈𝐑𝐃𝐑𝐎𝐏 𝐑𝐔𝐋𝐄𝐒

▸ Section 5.1 Airdrop will drop every 4 hours. There will be designated drop zones where airdrops can appear during the event.
▸ Section 5.2 If the airdrop lands within the city parameters, participants are only allowed to use single-fire pistols.
▸ Section 5.31 If the airdrop lands outside the city parameters, all weapon classes are allowed.
▸ Section 5.4 Wearing of helmet in City boundaries airdrop is allowed.
▸ Section 5.5 All Gangs, Police and Sheriffs are allowed to join. Everyone must wear their respective uniforms.
▸ Section 5.6 Teaming up with other gangs, Police and Sheriff is strictly prohibited.
▸ Section 5.7 Gang alliances are strictly forbidden.
▸ Section 5.8 The battle continues non-stop (unli balik) until the airdrop loot is depleted / dome expires.
▸ Section 5.9 If the airdrop is not visible to you, you are not allowed to participate.
▸ Section 5.10 Sunrise with your gang color or any local 4-door non-bulletproof or any sedan car that is not considered powergaming are the only cars you can use.
▸ Section 5.11 Wearing of full face mask and headgear (under the helmet category) is not allowed (if the airdrop is within the city parameters).
▸ Section 5.12 Wearing of costumes such as alien suits, cockroach outfits, Among Us characters, ghillie suits, wing accessories, etc., is strictly prohibited.
▸ Section 5.14 Engaging in conflict during or after the airdrop is over is considered RP stacking and is strictly prohibited.
▸ Section 5.15 Poblacion Police and Sheriff is allowed to intercept the airdrop, whether it drops inside or outside City boundaries.
▸ Section 5.17 Poblacion Police and Sheriff is not allowed to use any helicopters or riot truck in any airdrop.
▸ Section 5.18 You are only allowed to use ANY CAR as a getaway vehicle strictly from TURF WAR, AIRDROP, and TRAPHOUSE. If you are caught using this rule as an excuse outside of these situations, you will be penalized.
▸ Section 5.19 If asked for proof, you must provide a clip clearly showing that you came directly from a TURF WAR, AIRDROP, or TRAPHOUSE. Failure to provide a valid clip will result in sanctions.
▸ Section 5.20 Gangs are allowed to use Sunrise with your gang color or any local 4-door non-bulletproof or any sedan car that is not considered powergaming, and make sure that the vehicle clearly represents their gang’s color. This means the primary color of the car should match or strongly reflect the official color associated with the gang. Using of helicopters, motorcycles, exclusive and modded cars is prohibited.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 6:

𝐆𝐀𝐍𝐆 𝐁𝐀𝐒𝐄 𝐑𝐀𝐈𝐃

▸ Section 6.1 Class 1 to 3 weapons are allowed.
▸ Section 6.2 Gangs are allowed to use Sunrise with your gang color or any local 4-door non-bulletproof or any sedan car that is not considered powergaming, and make sure that the vehicle clearly represents their gang’s color. This means the primary color of the car should match or strongly reflect the official color associated with the gang. Using of helicopters, motorcycles, exclusive and modded cars is prohibited.
▸ Section 6.3 Must start with a valid storyline and verbal engagement.
▸ Section 6.4 Use proper template at least 10-15 minutes before initiating.
▸ Section 6.5 Defenders must remain within gang base boundaries.
▸ Section 6.6 Blocking entry points with objects or vehicles is Powergaming.
▸ Section 6.7 Rebirth (STL) is strictly prohibited.
▸ Section 6.8 Police may not interfere in gang base raids.
▸ Section 6.9 Luring your enemies to your gang base is strictly prohibited.
▸ Section 6.10 Helmets are allowed during gang base raids.
▸ Section 6.11 Either the defender or the attacker can declare base raid.
▸ Section 6.12 Attackers must be physically inside the base when initiating a base raid — killing someone even if they are two blocks away is not allowed.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 7:

𝐑𝐀𝐈𝐃𝐈𝐍𝐆 𝐓𝐇𝐄 𝐏𝐎𝐋𝐈𝐂𝐄/𝐒𝐇𝐄𝐑𝐈𝐅𝐅 𝐃𝐄𝐏𝐀𝐑𝐓𝐌𝐄𝐍𝐓

▸ Section 7.1 All weapons are allowed.
▸ Section 7.2 All gang members must wear their gang uniform.
▸ Section 7.3 Gangs are allowed to use Sunrise with your gang color or any local 4-door non-bulletproof or any sedan car that is not considered powergaming, and make sure that the vehicle clearly represents their gang’s color. This means the primary color of the car should match or strongly reflect the official color associated with the gang. Using of helicopters, motorcycles, exclusive and modded cars is prohibited.
▸ Section 7.4 A minimum of 12 police officers must be on duty to initiate
▸ Section 7.5 The city must be under a “City is Safe” status.
▸ Section 7.6 Helmets are allowed for this raid.
▸ Section 7.7 Raids must begin with a verbal storyline.
▸ Section 7.8 If there is PD raid and only a certain number of Police officers were on duty at that time, newly clocked-in officers are not allowed to join the chase.
▸ Section 7.9 Template must be sent at least 10-15 minutes prior to initiating.
▸ Section 7.10 The Military Police is a Red Zone — KOS is allowed.
▸ Section 7.11 Rebirth (STL) is not allowed during the raid.
▸ Section 7.12 After Code 4, surviving gang members must leave the area immediately.
▸ Section 7.13 A minimum of 2 to 3 EMS must be on duty before a raid can be conducted.

Example Raid Template:
Attention officers! We will be raiding your department in 10 minutes.

(Gang Color) is now raiding the Military Police.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 8:

𝐒𝐂𝐄𝐍𝐀𝐑𝐈𝐎𝐒 𝐓𝐇𝐀𝐓 𝐌𝐀𝐘 𝐋𝐄𝐀𝐃 𝐓𝐎 𝐆𝐀𝐍𝐆 𝐒𝐀𝐍𝐂𝐓𝐈𝐎𝐍𝐒 (𝐍𝐎𝐓 𝐋𝐈𝐌𝐈𝐓𝐄𝐃 𝐓𝐎):

▸ Section 8.1 Not complying with the gang templates.
▸ Section 8.2 Gang base raid without templates.

Note: Attackers must be physically inside the base when initiating a base raid — killing someone even if they are two blocks away is not allowed.

▸ Section 8.3 Claiming turf with different jobs.
▸ Section 8.4 Third Party Engagement (interfering in an ongoing situation without proper initiation, involvement, or valid roleplay reason.).

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 9:

𝐃𝐄𝐌𝐀𝐍𝐃 𝐈𝐓𝐄𝐌𝐒 𝐅𝐎𝐑 𝐃𝐄𝐂𝐋𝐈𝐍𝐈𝐍𝐆 𝐀 𝐆𝐀𝐍𝐆 𝐖𝐀𝐑

(Only choose 1 demand)
▸ 50 Pistol
▸ 50K Money
▸ 50 Meth/Cocaine/Weed (1 illegal medicine only)

𝐂𝐈𝐓𝐘 𝐋𝐀𝐖 𝐍𝐎. 5:

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 1:

𝐖𝐇𝐈𝐓𝐄𝐋𝐈𝐒𝐓𝐄𝐃 𝐑𝐔𝐋𝐄𝐒

Dirty Cops and Dirty EMS are strictly prohibited. Anyone found hoarding items from the Police Department or Medical Center will result to immediate termination, have their characters wiped, and face 3,000 community service.

▸ Section 1.1 Hoarding guns, ammo, or any gear from the Police Department and Sheriff Department
▸ Section 1.2 Hoarding gauze, bandages, or stresstabs from the Medical Center
▸ Section 1.3 Receiving free treatment from EMS without proper roleplay
▸ Section 1.4 Performing illegal activities while on duty (e.g., healing or reviving gang members during roleplay)
▸ Section 1.5 Accomplices of dirty jobs will be sanctioned depending on the number of items/services received
▸ Section 1.6 Going on-duty solely to assist family/peers, then immediately going off-duty
▸ Section 1.7 Replenishing job stash and going off-duty afterward is not allowed
▸ Section 1.8 Looting during robberies even when police/robbers are still present is prohibited
▸ Section 1.9 Hiding a downed family member/peer during police processing to avoid arrest
▸ Section 1.10 Off-duty EMS/PD/Sheriff are only allowed to engage at Traphouse scenarios, and no other illegal activities.
▸ Section 1.11 All citizens will be searched before entering the Police Department.
▸ Section 1.12 Officers may search individuals found within an ongoing investigation area.
▸ Section 1.13 Officers may impound illegally parked or unlawfully owned vehicles. Arrests can follow if the user is not the rightful owner or lacks permission.
▸ Section 1.14 If a citizen draws a weapon near Police or civilians, officers must issue a warning. Ignoring the warning permits arrest or necessary response.
▸ Section 1.15 Police may open fire if a weapon is aimed at them or civilians.
▸ Section 1.16 Civilians caught using PD-issued weapons will receive additional jail time.
▸ Section 1.17 You may not initiate holdups, hostage situations, or open fire near the PD. Doing so is considered No Fear of Life and Fail RP, as the area is presumed to be secure and well-guarded.
▸ Section 1.18 Police/Sheriff must not lure their enemies back to their department.
▸ Section 1.19 Returning to your department during an ongoing roleplay or shootout will be considered as evading roleplay
▸ Section 1.20 The WANTED status issued by the Police/Sheriff Department shall remain in effect for a maximum duration of 2 hours only.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 2:

𝐏𝐎𝐁𝐋𝐀𝐂𝐈𝐎𝐍 𝐏𝐎𝐋𝐈𝐂𝐄 𝐃𝐄𝐏𝐀𝐑𝐓𝐌𝐄𝐍𝐓 𝐑𝐔𝐋𝐄𝐒

This will serve as the official rules of the Poblacion City Police Department Rules.

▸Section 2.0 There should be NO SILLY DEMANDS. Some demands cannot and should not be made, particularly because this function serves as a tool or authority reserved for the Police Department (PD). It is important to recognize that certain powers, responsibilities, or resources are exclusively designated for the PD, and attempting to demand or overstep into these areas would be inappropriate and beyond the proper scope of authority. Respecting these boundaries ensures order, fairness, and proper use of the system in place.

▸Section 2.1 What is Silly Demands? It is any demand or action that is unrealistic, non-serious, or disrupts immersion during police RP scenarios will be considered a silly demand and may result in sanctions.

These are the list of Silly Demands

▸Section 2.3 No police vitamins.
▸Section 2.4 No class 2 & 3.
▸Section 2.5 No helmet.
▸Section 2.6 Anything that is not in the official rules.

▸ Section 2.7 Demanding food, money, or items during arrest
▸ Example: “Bigyan mo muna ako burger bago ako sumuko.”
▸ Unrealistic and disrupts serious RP scenarios.

▸ Section 2.8 Forcing officers to follow non-logical commands
▸ Example: “Sumayaw ka muna bago ako bumaba ng kotse.”
▸ Not grounded in real-life law enforcement behavior.

▸ Section 2.9 Requesting immunity or release without valid RP reason
▸ Example: “Pakawalan mo ako kasi first time ko lang.”
▸ Decisions should be based on RP evidence and process.

▸ Section 2.10 Stalling using nonsense excuses
▸ Example: “Wait lang may tatawag lang ako sa mama ko.”
▸ Used to delay RP unfairly.

▸ Section 2.11 Demanding unrealistic negotiations
▸ Example: Asking for helicopters, tanks, or millions for release.
▸ Should remain within believable RP limits.

▸ Section 2.12 Breaking character to avoid consequences
▸ Example: “AFK ako bigla, bawal niyo ako hulihin.”
▸ Considered fail RP.

▸ Section 2.13 Using OOC excuses during active RP
▸ Example: “Lag ako kaya di niyo ako nahuli.”
▸ Should be handled after the scenario, not during.

▸ Section 2.14 Ordering police like subordinates
▸ Example: “Ikaw, alis ka dito ngayon din.”
▸ Unless justified (e.g., hostage with leverage), it's invalid.

▸ Section 2.15 Fake surrender tactics
▸ Example: Surrendering then suddenly running or shooting.
▸ Breaks trust and realism.

▸ Section 2.16 Unrealistic hostage demands
▸ Example: Asking for absurd trades like “10 supercars kapalit ng hostage.”
▸ Should be reasonable and RP-driven.

▸ Section 2.17 Using memes or trolling behavior in serious situations
▸ Example: Playing loud music, dancing mid-arrest.
▸ Ruins immersion.

▸ Section 2.18 Ignoring injuries or situation seriousness
▸ Example: Acting normal after getting shot multiple times.
▸ Violates realistic roleplay standards.

𝐎𝐔𝐓𝐍𝐔𝐌𝐁𝐄𝐑𝐄𝐃 𝐏𝐄𝐑𝐒𝐎𝐍𝐍𝐄𝐋𝐒
▸ If PD is outnumbered from the suspects/tangos or there are 2 or more gang that are wanted, they are allowed to use class 3 weapons on the street.

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 3:

𝐖𝐇𝐈𝐓𝐄𝐋𝐈𝐒𝐓𝐄𝐃 𝐕𝐄𝐇𝐈𝐂𝐋𝐄𝐒

Section 3.1 Gangs and Civilians Civilians are NOT allowed to use any other GANG/EMS/POLICE/MECHANIC Vehicles.

Section 3.2 You are strictly prohibited from using any other gang vehicle or any whitelisted vehicle as a getaway car. You are only allowed to use ANY CAR as a getaway vehicle strictly from TURF WAR, AIRDROP, and TRAPHOUSE. If you are caught using this rule as an excuse outside of these situations, you will be penalized.

Note: When submitting a report for this kind of offense, you must identify or get the name of the individual using the car.

𝐂𝐈𝐓𝐘 𝐋𝐀𝐖 𝐍𝐎. 6:

𝐀𝐑𝐓𝐈𝐂𝐋𝐄 1:

𝐒𝐄𝐂𝐓𝐈𝐎𝐍 1:

𝐒𝐌𝐀𝐋𝐋 𝐒𝐓𝐎𝐑𝐄 / 𝐋𝐈𝐐𝐔𝐎𝐑 𝐒𝐓𝐎𝐑𝐄

▸ Section 1.1 Minimum of 1, maximum of 4 robbers.
▸ Section 1.2 Minimum of 2 Military Police on-duty (Military Police is +1)
▸ Section 1.3 Minimum of 1 EMS on-duty.
▸ Section 1.4 Class 1 only.
▸ Section 1.5 Negotiation is a must, one- or two-word sentence is not allowed in negotiation.
▸ Section 1.6 Robbers must be inside the premises of the robbery.
▸ Section 1.7 Robbers are required to wear a mask.
▸ Section 1.8 Robbers must not block all the entrance.
▸ Section 1.9 Both parties are not allowed to use emotes it will be considered as power gaming.
▸ Section 1.10 Helmets are not allowed.
▸ Section 1.11 Robbers can have a maximum of 2 Hostages.
▸ Section 1.12 First shot (greenlight) must come from the robbers only.
▸ Section 1.13 You cannot greenlight on the head of a Military Police Officer during robberies.

𝐒𝐄𝐂𝐓𝐈𝐎𝐍 2:

𝐂𝐋𝐔𝐂𝐊𝐈𝐍 𝐁𝐄𝐋𝐋 𝐇𝐄𝐈𝐒𝐓

▸ Section 2.1 Minimum of 4, maximum of 6 robbers.
▸ Section 2.2 Minimum of 6 Military Police-on duty. (Police is +2)
▸ Section 2.3 Minimum of 1 EMS on duty
▸ Section 2.4 Class 1 and Class 2 weapons only
▸ Section 2.5 2 throwables are allowed (2 mins interval)
▸ Section 2.6 Negotiation is a must, one- or two-word sentence is not allowed in negotiation.
▸ Section 2.7 Robbers must be inside the premises of the robbery.
▸ Section 2.8 Robbers are required to wear a mask.
▸ Section 2.9 Robbers must not block all the entrance.
▸ Section 2.10 Both parties are not allowed to use emotes it will be considered as power gaming.
▸ Section 2.11 Helmets are allowed.
▸ Section 2.12 Robbers can have a maximum of 2 Hostages.
▸ Section 2.13 First shot (greenlight) must come from the robbers only.
▸ Section 2.14 You cannot greenlight on the head of a Military Police officer during robberies.
▸ Section 2.15 Poblacion Military Police can use +2 riot shields.

𝐒𝐄𝐂𝐓𝐈𝐎𝐍 3:

𝐋𝐈𝐅𝐄 𝐈𝐍𝐕𝐀𝐃𝐄𝐑 𝐇𝐄𝐈𝐒𝐓

▸ Section 3.1 Minimum of 7 robbers.
▸ Section 3.2 Minimum of 10 Military Police-on duty. (Police is +3)
▸ Section 3.3 Minimum of 1 EMS on duty
▸ Section 3.4 Class 1, 2 and Class 3 weapons.
▸ Section 3.4 2 throwables are allowed (2 mins interval)
▸ Section 3.5 Negotiation is a must only if robbers has a hostage, one- or two-word sentence is not allowed in negotiation.
▸ Section 3.6 Robbers must be inside the premises of the robbery.
▸ Section 3.7 Robbers are required to wear a mask.
▸ Section 3.8 Robbers must not block all the entrance.
▸ Section 3.9 Both parties are not allowed to use emotes it will be considered as power gaming.
▸ Section 3.10 Helmets are allowed.
▸ Section 3.11 Robbers can have a maximum of 2 Hostages.
▸ Section 3.12 First shot (greenlight) must come from the robbers only. (green light only applies to Section 6.2).
▸ Section 3.13 You cannot greenlight on the head of a police officer during robberies.
▸ Section 3.13 Poblacion Military Police can use +2 riot shields.

𝐒𝐄𝐂𝐓𝐈𝐎𝐍 4:

𝐉𝐄𝐖𝐄𝐋𝐑𝐘

▸ Section 4.1 Minimum of 6 robbers. Maximum of 8
▸ Section 4.2 Minimum of 10 Police-on duty. (Police is +2)
▸ Section 4.3 Minimum of 1 ems on duty
▸ Section 4.5 Class 1 and Class 2 weapons only.
▸ Section 4.6 3 throwables are allowed (2 mins interval)
▸ Section 4.7 Negotiation is a must only if robbers has a hostage, one- or two-word sentence is not allowed in negotiation.
▸ Section 4.8 Robbers must be inside the premises of the robbery.
▸ Section 4.9 Robbers are required to wear a mask.
▸ Section 4.10 Robbers must not block all the entrance.
▸ Section 4.11 Both parties are not allowed to use emotes it will be considered as power gaming.
▸ Section 4.12 Helmets are allowed.
▸ Section 4.13 Robbers can have a maximum of 2 Hostages.
▸ Section 4.14 First shot (greenlight) must come from the robbers only. (green light only applies to Section 6.2).
▸ Section 4.15 You cannot greenlight on the head of a police officer during robberies.
▸ Section 4.16 Poblacion Police and Sheriffs can use +2 riot shields.

𝐒𝐄𝐂𝐓𝐈𝐎𝐍 5:

𝐁𝐈𝐆 𝐁𝐀𝐍𝐊

▸ Section 5.1 Minimum of 10 robbers.
▸ Section 5.2 POBLACION Police and Sheriffs should be at least 18 and must not exceed the numbers on duty.
▸ Section 5.3 Minimum of 2 EMS on-duty.
▸ Section 5.4 All class weapons are allowed. (1, 2 and 3)
▸ Section 5.5 3 throwables are allowed (2 mins interval)
▸ Section 5.6 POBLACION Police and Sheriffs can use +3 riot shields.
▸ Section 5.7 Robbers must be inside the premises of the triggered robbery / heist.
▸ Section 5.8 Robbers are required to wear a mask.
▸ Section 5.9 Robbers must not block all the entrance.
▸ Section 5.10 Both parties are not allowed to use emotes it will be considered as power gaming.
▸ Section 5.11 Helmets are allowed.
▸ Section 5.12 Robbers can have a maximum of 2 Hostages.
▸ Section 5.13 First shot (greenlight) must come from the robbers only. (only applicable when robbers has a hostage)
▸ Section 5.14 No negotiations will be allowed. Any initiation will automatically result in a shootout scenario, unless robbers has a hostage then negotiation is a must.
▸ Section 5.15 If the Big Heist is already triggered and only a certain number of Police officers were on duty at that time, newly clocked-in officers are not allowed to join the chase. However, the +4 rule for Police response is still applicable.

𝐒𝐄𝐂𝐓𝐈𝐎𝐍 6:

𝐇𝐔𝐌𝐀𝐍𝐄 𝐋𝐀𝐁𝐒

▸ Section 6.1 Minimum of 10 robbers.
▸ Section 6.2 POBLACION Military Police should be at least 18 and must not exceed the numbers on duty.
▸ Section 6.3 Minimum of 2 EMS on-duty.
▸ Section 6.4 All class weapons are allowed. (1, 2 and 3)
▸ Section 6.5 3 throwables are allowed (2 mins interval)
▸ Section 6.6 POBLACION Military Police can use +3 riot shields.
▸ Section 6.7 Robbers must be inside the premises of the triggered robbery / heist.
▸ Section 6.8 Robbers are required to wear a mask.
▸ Section 6.9 Robbers must not block all the entrance.
▸ Section 6.10 Both parties are not allowed to use emotes it will be considered as power gaming.
▸ Section 6.11 Helmets are allowed.
▸ Section 6.12 Robbers can have a maximum of 2 Hostages.
▸ Section 6.13 First shot (greenlight) must come from the robbers only. (only applicable when robbers has a hostage)
▸ Section 6.14 No negotiations will be allowed. Any initiation will automatically result in a shootout scenario, unless robbers has a hostage then negotiation is a must.
▸ Section 6.15 If the Big Heist is already triggered and only a certain number of Military Police officers were on duty at that time, newly clocked-in officers are not allowed to join the chase. However, the +4 rule for Police response is still applicable.

𝐒𝐄𝐂𝐓𝐈𝐎𝐍 7:

𝐘𝐀𝐂𝐇𝐓 𝐑𝐎𝐁𝐁𝐄𝐑𝐘

▸ Section 7.1 Minimum of 10 robbers.
▸ Section 7.2 POBLACION Taskforce should be at least 18 and must not exceed the numbers on duty.
▸ Section 7.3 Minimum of 2 EMS on-duty.
▸ Section 7.4 All class weapons are allowed. (1, 2 and 3)
▸ Section 7.5 3 throwables are allowed (2 mins interval)
▸ Section 7.6 POBLACION Taskforce can use +3 riot shields.
▸ Section 7.7 Robbers must be inside the premises of the triggered robbery / heist.
▸ Section 7.8 Robbers are required to wear a mask.
▸ Section 7.9 Robbers must not block all the entrance.
▸ Section 7.10 Both parties are not allowed to use emotes it will be considered as power gaming.
▸ Section 7.11 Helmets are allowed.
▸ Section 7.12 Robbers can have a maximum of 2 Hostages.
▸ Section 7.13 First shot (greenlight) must come from the robbers only. (only applicable when robbers has a hostage)
▸ Section 7.14 No negotiations will be allowed. Any initiation will automatically result in a shootout scenario, unless robbers has a hostage then negotiation is a must.
▸ Section 7.15 If the Big Heist is already triggered and only a certain number of Police officers were on duty at that time, newly clocked-in officers are not allowed to join the chase. However, the +4 rule for Police response is still applicable.

𝐒𝐄𝐂𝐓𝐈𝐎𝐍 8:

𝐇𝐎𝐋𝐃 𝐔𝐏 𝐑𝐔𝐋𝐄𝐒

▸ Section 8.1 Class 1 Weapons Only
▸ Section 8.2 Wearing full-face masks and headgear (under the helmet category) is not allowed for citizens/gang members.
▸ Section 8.3 Military Police officers are allowed to use helmets.
▸ Section 8.4 Normal citizens are not allowed to use gang/EMS/police/mechanic cars.
▸ Section 8.5 Only use local four-door cars. (If Citizen, please use local cars. If Poblacion rp, please use your designated gangcars).
▸ Section 8.6 Using helicopters, motorcycles, exclusive, and modded cars is prohibited.
▸ Section 8.7 Wearing costumes (alien, cockroach, Among Us, ghillie, wing accessories, etc.) is not allowed.
▸ Section 8.8 During nighttime/hold-up hours (6:00 PM - 6:00 AM), a verbal threat must be present before initiating a shootout.
▸ Section 8.9 4-man rule should be implemented when initiating a hold-up roleplay including gang members who intend to initiate an interaction with normal citizens. Backup of gangs are only allowed if they are against with another gang (street war) and if the person you’re robbing is wearing a gang rep.
▸ Section 8.10 Hold-ups must only be initiated when your team has equal or greater numbers than the target group.
▸ Section 8.11 Do not engage in a hold-up if your team is outnumbered by the target party.
▸ Section 8.12 Hold-ups are not allowed within the vicinity of red /danger zone areas.
▸ Section 8.13 Initiators must allow the targeted individuals 10 seconds to comply and exit the vehicle before shooting.
▸ Section 8.14 If the victim perfectly complies with the hold-up scenario, they are not allowed to be killed.
▸ Section 8.15 When declaring a hold-up, your in-game proximity voice must be set to "shout" to ensure that all involved parties can clearly hear your intentions.
▸ Section 8.16 Once a hold-up has been initiated and roleplay is actively ongoing, the victim is not allowed to drive away or leave the scene without proper RP. It will be considered evading RP.
▸ Section 8.17 Before declaring a hold-up, there must be proper verbal roleplay to establish interaction and intent. Immediate or “instant” hold-ups without prior verbal engagement are not allowed and will be considered Fail RP.
▸ Section 8.18 During any hold-up scenario, the firearm must be visibly aimed at the target at all times while declaring and conducting the RP.
▸ Section 8.19 Backup is not allowed for normal citizens.
▸ Section 8.20 Citizens are no longer allowed to lock their vehicles during an ongoing hold-up. Doing so will be considered FAIL RP, as it falls under unrealistic roleplay.
▸ Section 8.21 You are not allowed to holdap someone who is already in the middle of holdap roleplay. Let the ongoing roleplay finish first, and observe a 2-minute cooldown before engaging in any verbal confrontation.
▸ Section 8.22 Garage areas outside businesses are not safe zones, but holdups here must only happen during holdup hours and require proper verbal RP.

HOLD UP RULES
COMBAT: (Victim vs Holdupper)

- 4vs4 = Valid
- 3vs4 = Valid (The greater number of civilian must inititate)
- 3vs3 = Valid
- 2vs3 = Valid (The greater number of civilian must  initiate)
- 1vs2 = Valid (The greater number of civilian must initiate)
- 1vs1 = Valid

- 1vs3, 2vs4 and 1vs4 = Automatic No Fear of Life. 

𝐒𝐄𝐂𝐓𝐈𝐎𝐍 9:

𝐇𝐎𝐋𝐃 𝐔𝐏 𝐑𝐔𝐋𝐄𝐒

For New Player Rules:
▸ Section 9.1 If a new player is robbed (with immunity card) and their belongings are taken — they may later file a report to in accordance with City rules.
▸ Section 9.2 New players are not allowed to verbally announce or use their “immunity card” as a way to avoid or stop ongoing roleplay. The roleplay must be allowed to flow naturally.
▸ Section 9.3 If someone is held up and their belongings are taken, or if they are killed and it is proven that they have an immunity card, a sanction will be given.
▸ Section 9.4 Holdups cannot be initiated in crowded areas due to risk of civilian intervention.

For Whitelisted Employees:
▸ Section 9.5 Before initiating a hold-up towards EMS, police officers, or mechanics, there must be a minimum of 6 police officers on duty.
▸ Section 9.6 EMS and mechanics cannot be robbed when they are attending to distress calls.
▸ Section 9.7 Police / Sheriff cannot be robbed or holdup while on-going.

𝐒𝐄𝐂𝐓𝐈𝐎𝐍 10:

𝐂𝐀𝐑 𝐂𝐇𝐀𝐒𝐄 𝐑𝐔𝐋𝐄𝐒

▸ Section 10.1 1 demand per hostage.
▸ Section 10.2 2–4 robbers
▸ Section 10.3 1 getaway vehicle = Maximum of 3 police units in pursuit
▸ Section 10.4 2 or more getaway vehicles = All units are allowed to respond
▸ Section 10.5 Wearing of full-face masks is prohibited.
▸ Section 10.6 Only police officers/sheriff are allowed to use helmets
▸ Section 10.7 Wearing of costumes (alien, cockroach, Among Us, ghillie, wing accessories, etc.) is not allowed
▸ Section 10.8 Only use four-door cars; use of helicopters, motorcycles, exclusive, and modded cars is prohibited
▸ Section 10.9 For medium to big heists, police officers are allowed to use helicopters
▸ Section 10.10 All car chases that lead to a shootout will be considered a street war.
▸ Section 10.11 If robbers or civilians damage three (3) government properties, Police and Sheriff officers are allowed to ram the suspect’s vehicle.
▸ Section 10.12 Car chases should last 10–15 minutes before issuing the next level of warning. A total of three (3) verbal warnings must be given before officers are permitted to shoot the vehicle’s tires. After the third warning, a drive-by shootout is allowed, but officers must aim for the tires only — headshots are strictly prohibited.
▸ Section 10.13 You cannot hostage your Gang Members or Friends. (If you do, they will be arrested too for being an accomplice)
▸ Section 10.14 If the getaway vehicle is a motorcycle, police department are allowed to used motorcycles.

𝐒𝐄𝐂𝐓𝐈𝐎𝐍 11:

𝐊𝐈𝐃𝐍𝐀𝐏 / 𝐇𝐎𝐒𝐓𝐀𝐆𝐄 𝐓𝐀𝐊𝐈𝐍𝐆

▸ Section 11.1 Before initiating a hostage taking towards Poblacion Taskforce / Civillian there must be a minimum of 15 POBLACION Military Police on duty and members of hostage takers must not exceed the numbers of Poblacion Military Police on duty.
▸ Section 11.2 Before initiating a hostage taking towards EMS, there must be a minimum of 5 EMS before you can hostage an EMS.
▸ Section 11.3 All weapon classes are allowed.
▸ Section 11.4 Wearing of full-face masks and headgear (under the helmet category) is not allowed for citizens/gang members.
▸ Section 11.5 Helmets are allowed during hostage taking outside City boundaries.
▸ Section 11.6 Poblacion Military Police are allowed to use helmets inside and outside City boundaries.
▸ Section 11.7 Wearing of costumes (alien, cockroach, Among Us, ghillie, wing accessories, etc.) is not allowed.
▸ Section 11.8 Using your friend or fellow gang members as hostages is prohibited.
▸ Section 11.9 When the victim is a normal /whitelisted citizen, Poblacion Military Police must respond in all units.
▸ Section 11.10 When the victim is a member of a gang, fellow gang members must respond.
▸ Section 11.11 Negotiation is a must before declaring a shootout.
▸ Section 11.12 Hostages should comply as backup is ready.
▸ Section 11.13 Killing the victim or negotiator immediately without proper verbal communication is prohibited.
▸ Section 11.14 Any gunshot heard during negotiation will be considered a green light.
▸ Section 11.15 Kidnappers/hostage takers may not kill the victim once the demand has been given.
▸ Section 11.16 A shootout may still occur even after demands have been fulfilled and the hostage has been safely released.
▸ Section 11.17 Using any object or vehicle to block an entry point will be considered power gaming.
▸ Section 11.18 Players are not allowed to initiate a any hostage taking directly in front of the Poblacion Military Police Department, or within the gang’s own hood/territory.
▸ Section 11.19 Hostage-taking is strictly prohibited while priority status is in progress.
▸ Section 11.20 When engaging in a hostage-taking during a gang-to-gang situation, there must first be proper engagement before taking a hostage. Additionally, you cannot take hostage a gang member who just came from STL/Morgue and is on their way back to their base.

𝐒𝐄𝐂𝐓𝐈𝐎𝐍 12:

𝐃𝐄𝐌𝐀𝐍𝐃 𝐈𝐓𝐄𝐌𝐒 𝐅𝐎𝐑 𝐂𝐈𝐓𝐈𝐙𝐄𝐍 / 𝐖𝐇𝐈𝐓𝐄𝐋𝐈𝐒𝐓𝐄𝐃 (𝐀𝐍𝐘 𝐑𝐀𝐍𝐊)

▸ Section 12.1 For Citizen hostage.
▸ Section 12.2 maximum of 50k clean money. (Per head)

▸ Section 12.3 For whitelisted personnel.
▸ Section 12.4 70k clean money. (Per head)
▸ Section 12.5 100k clean money for Directors and High ranking personnel. (Per head)

▸ Section 12.6 Maximum of 3 Combat Pistols if 1 hostage.
▸ Section 12.7 Maximum of 5 if 2 hostages.
▸ Section 12.8 For Directors and high ranking personnel: automatic 5 combat pistols.

▸ Section 12.9 No helicopter.
▸ Section 12.10 No BZ, no flashbang.
▸ Section 12.11 Five second head start
▸ Section 12.12 No Ramming unless you hit a maximum of 3 Government properties.
▸ Section 12.13 FREE PASSAGE.
▸ Section 12.14 Riot shields cannot be used as a demand during hostage situations. NO RIOT SHIELD demand is only applicable for ANY BIG/MEDIUM HEIST such as Big Bank, Humane, Life Invader, Cluckin' Bell, Jewelry, Yacht.

Note: These are the only things you can demand, what is not written is not allowed!














      Question:
      ${questionRaw}
      `;

      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "You are a strict rule-only judge." },
          { role: "user", content: prompt }
        ],
        temperature: 0, // 🔥 removes creativity (important)
        max_tokens: 300
      });

      let aiReply =
        completion.choices?.[0]?.message?.content || "";

      // 🔥 FAILSAFE (NO BLANK EVER)
      if (!aiReply || aiReply.trim() === "") {
        aiReply = "Verdict: DEPENDE\nBasis:\n- No exact matching rule found.";
      }

      // 🧱 EMBED OUTPUT
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("📜 Server Rule Verdict")
        .addFields(
          { name: "❓ Question", value: questionRaw },
          { name: "⚖️ Result", value: aiReply.slice(0, 1024) }
        )
        .setFooter({ text: "Accurate Rule System • No Guessing" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("Groq Error:", err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "❌ System error. Please try again."
        );
      } else {
        await interaction.reply({
          content: "❌ System error. Please try again.",
          flags: 64
        });
      }
    }
  }
};