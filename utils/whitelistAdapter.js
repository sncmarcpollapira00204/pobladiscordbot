function parseApplication(embed) {
  const isOld = embed.data.fields && embed.data.fields.length > 0;
  const isNew = embed.data.description?.includes("NEW WHITELIST APPLICATION");

  let userId = null;
  let characterName = null;

  // ✅ NEW SYSTEM
  if (isNew) {
    const match = embed.data.description.match(/<@(\d+)>/);
    if (match) userId = match[1];

    const nameMatch = embed.data.description.match(/IN-GAME NAME: (.*)/);
    if (nameMatch) characterName = nameMatch[1];
  }

  // ✅ OLD SYSTEM
  if (isOld) {
    const fields = embed.data.fields;

    const userField = fields.find(f => f.value?.includes("<@"));
    const match = userField?.value.match(/<@(\d+)>/);
    if (match) userId = match[1];

    const nameField = fields.find(f => f.value?.includes("Character Name:"));
    if (nameField) {
      characterName = nameField.value
        .split("Character Name:")[1]
        ?.trim();
    }
  }

  return {
    isOld,
    isNew,
    userId,
    characterName
  };
}

module.exports = { parseApplication };