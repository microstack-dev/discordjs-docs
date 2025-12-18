# Ephemeral Interactions

Ephemeral interactions provide private, user-specific responses that are only visible to the interaction initiator. Essential for sensitive information, confirmation dialogs, and personal settings.

## What Are Ephemeral Responses

Ephemeral responses are temporary messages visible only to the user who triggered the interaction. They automatically disappear when the user navigates away from the channel.

## Basic Usage

### Ephemeral Slash Command Response

```js
export const data = new SlashCommandBuilder()
  .setName('my-settings')
  .setDescription('View your personal settings')

export async function execute(interaction) {
  const settings = await getUserSettings(interaction.user.id)

  const embed = new EmbedBuilder()
    .setTitle('Your Settings')
    .setDescription('These settings are private to you')
    .addFields(
      { name: 'Theme', value: settings.theme, inline: true },
      { name: 'Language', value: settings.language, inline: true },
      { name: 'Notifications', value: settings.notifications ? 'On' : 'Off', inline: true }
    )
    .setColor('Blue')

  await interaction.reply({ embeds: [embed], ephemeral: true })
}
```

### Ephemeral Component Response

```js
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton() && interaction.customId === 'private-info') {
    const userData = await getSensitiveUserData(interaction.user.id)
    await interaction.reply(`Your data: ${userData}`, { ephemeral: true })
  }
})
```

## When to Use Ephemeral

### Sensitive Information
```js
if (interaction.commandName === 'profile') {
  const profile = await getUserProfile(interaction.user.id)
  await interaction.reply(`Email: ${profile.email}`, { ephemeral: true })
}
```

### Confirmation Dialogs
```js
if (interaction.commandName === 'delete-account') {
  const confirmButton = new ButtonBuilder()
    .setCustomId('confirm_delete')
    .setLabel('Yes, Delete My Account')
    .setStyle(ButtonStyle.Danger)

  await interaction.reply({
    content: 'Are you sure you want to delete your account?',
    components: [new ActionRowBuilder().addComponents(confirmButton)],
    ephemeral: true
  })
}
```

### Administrative Actions
```js
if (interaction.commandName === 'admin-panel') {
  if (!interaction.member.permissions.has('ADMINISTRATOR')) {
    return await interaction.reply('Access denied.', { ephemeral: true })
  }

  const embed = new EmbedBuilder()
    .setTitle('Admin Panel')
    .setDescription('Administrative controls')
    .setColor('Red')

  await interaction.reply({ embeds: [embed], ephemeral: true })
}
```

## Ephemeral vs Public Responses

### Public Response (Default)
```js
await interaction.reply('This is public!')
```

### Ephemeral Response
```js
await interaction.reply('This is private', { ephemeral: true })
```

## Advanced Ephemeral Patterns

### Multi-Step Private Flows

```js
class PrivateWizard {
  constructor() {
    this.sessions = new Map()
  }

  startSession(userId, interaction) {
    this.sessions.set(userId, {
      step: 1,
      data: {},
      interaction: interaction
    })
  }

  async nextStep(userId, input) {
    const session = this.sessions.get(userId)
    if (!session) return

    session.data[`step_${session.step}`] = input
    session.step++

    const nextPrompt = this.getStepPrompt(session.step)

    if (nextPrompt) {
      await session.interaction.editReply({
        content: nextPrompt,
        ephemeral: true
      })
    } else {
      await this.completeWizard(userId, session.data)
    }
  }

  async completeWizard(userId, data) {
    const session = this.sessions.get(userId)
    await session.interaction.editReply('Wizard completed!', { ephemeral: true })
    this.sessions.delete(userId)
  }
}
```

## Ephemeral Limitations

### Component Restrictions

Ephemeral messages cannot contain:
- Buttons with URLs (link buttons)
- Select menus that create public interactions

```js
// Valid in ephemeral
const button = new ButtonBuilder()
  .setCustomId('private_action')
  .setLabel('Private Action')

// Invalid in ephemeral
const linkButton = new ButtonBuilder()
  .setURL('https://example.com')
  .setLabel('Link')
```

## Best Practices

### Appropriate Use Cases
- Personal settings and preferences
- Sensitive information (API keys, emails)
- Confirmation dialogs for destructive actions
- Administrative panels and controls
- Error messages with sensitive details

### Response Strategy
```js
function shouldBeEphemeral(interaction, content) {
  if (['profile', 'settings', 'admin'].includes(interaction.commandName)) {
    return true
  }
  if (content.includes('API key') || content.includes('password')) {
    return true
  }
  return false
}

await interaction.reply({
  content: responseContent,
  ephemeral: shouldBeEphemeral(interaction, responseContent)
})
```

## Common Mistakes

### Forgetting Ephemeral Flag
```js
await interaction.reply(`API Key: ${userApiKey}`)
// Missing ephemeral: true - exposes sensitive data
```

### Invalid Components in Ephemeral
```js
await interaction.reply({
  content: 'Link:',
  components: [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setURL('https://example.com').setLabel('Link')
  )],
  ephemeral: true
}) // Fails - link buttons not allowed in ephemeral
```

### Overusing Ephemeral
```js
if (interaction.commandName === 'help') {
  await interaction.reply('Help info...', { ephemeral: true })
} // Unnecessary - help should be public
```

## Next Steps

- [Error Handling](/interactions/error-handling) - Robust error management