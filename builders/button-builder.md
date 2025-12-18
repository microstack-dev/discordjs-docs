# ButtonBuilder

Create interactive buttons for user actions and navigation.

## Overview

`ButtonBuilder` constructs clickable buttons that trigger interactions. Buttons provide immediate user feedback and enable complex workflows through custom interaction handling.

## Basic Example

```js
import { ButtonBuilder, ButtonStyle, ActionRowBuilder, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Create a voting poll')

export async function execute(interaction) {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('vote_yes')
        .setLabel('Yes')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('vote_no')
        .setLabel('No')
        .setStyle(ButtonStyle.Danger)
    )

  await interaction.reply({
    content: 'Should we implement dark mode?',
    components: [row]
  })
}
```

## Advanced Usage

### Multi-State Button Workflow
```js
export async function createApprovalWorkflow(interaction) {
  const approvalRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('approve_request')
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId('deny_request')
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌'),
      new ButtonBuilder()
        .setCustomId('request_info')
        .setLabel('Request More Info')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❓')
    )

  const managementRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('edit_request')
        .setLabel('Edit Request')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true), // Initially disabled
      new ButtonBuilder()
        .setCustomId('archive_request')
        .setLabel('Archive')
        .setStyle(ButtonStyle.Secondary)
    )

  await interaction.reply({
    content: 'Request Approval Required',
    embeds: [requestEmbed],
    components: [approvalRow, managementRow]
  })
}
```

### Dynamic Button States with User Context
```js
export function createUserActionButtons(user, targetUser) {
  const buttons = []

  // Basic interaction buttons
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`profile_${targetUser.id}`)
      .setLabel('View Profile')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('👤')
  )

  // Friendship buttons based on relationship
  if (user.id !== targetUser.id) {
    const isFriend = checkFriendship(user.id, targetUser.id)

    buttons.push(
      new ButtonBuilder()
        .setCustomId(isFriend ? `unfriend_${targetUser.id}` : `friend_${targetUser.id}`)
        .setLabel(isFriend ? 'Remove Friend' : 'Add Friend')
        .setStyle(isFriend ? ButtonStyle.Secondary : ButtonStyle.Success)
    )
  }

  // Administrative buttons
  if (userHasPermission(user, 'MODERATE_MEMBERS')) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`moderate_${targetUser.id}`)
        .setLabel('Moderate')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⚠️')
    )
  }

  return buttons
}

export async function execute(interaction) {
  const targetUser = interaction.options.getUser('user')
  const buttons = createUserActionButtons(interaction.user, targetUser)

  // Group buttons into rows (max 5 per row)
  const rows = []
  for (let i = 0; i < buttons.length; i += 5) {
    const rowButtons = buttons.slice(i, i + 5)
    rows.push(new ActionRowBuilder().addComponents(rowButtons))
  }

  await interaction.reply({
    content: `Actions for ${targetUser.tag}`,
    components: rows,
    ephemeral: true
  })
}
```

## Limits & Constraints

### Button Text Limits
- **Label**: Maximum 80 characters
- **Emoji**: Must be valid Unicode emoji or custom emoji

### Custom ID Limits
- **Length**: Maximum 100 characters
- **Characters**: Alphanumeric, hyphens, underscores only
- **Uniqueness**: Must be unique per message

### URL Button Constraints
- **URL**: Must be valid HTTPS URL
- **Length**: Maximum 512 characters
- **Domains**: Some domains may be restricted

### Validation Examples
```js
// Valid button
const validButton = new ButtonBuilder()
  .setCustomId('action_123')
  .setLabel('Click Me')
  .setStyle(ButtonStyle.Primary)

// Error: Invalid customId characters
const invalidButton = new ButtonBuilder()
  .setCustomId('action@special#chars') // Invalid characters
  .setLabel('Action')

// Error: Label too long
const longLabelButton = new ButtonBuilder()
  .setCustomId('action')
  .setLabel('This label is way too long and exceeds the maximum character limit allowed for button labels') // Too long
```

## Best Practices

### Descriptive Custom IDs
```js
// Good: Action + identifier pattern
const button = new ButtonBuilder()
  .setCustomId('approve_request_12345')
  .setLabel('Approve')

// Avoid: Generic IDs
const badButton = new ButtonBuilder()
  .setCustomId('btn1') // Not descriptive
```

### Consistent Button Styles
```js
// Good: Consistent meaning across styles
const buttons = [
  new ButtonBuilder().setCustomId('save').setLabel('Save').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('delete').setLabel('Delete').setStyle(ButtonStyle.Danger)
]
```

### Accessible Button Labels
```js
// Good: Clear, descriptive labels
const accessibleButtons = [
  new ButtonBuilder().setCustomId('edit_profile').setLabel('Edit Profile').setEmoji('✏️'),
  new ButtonBuilder().setCustomId('view_history').setLabel('View History').setEmoji('📋')
]

// Avoid: Unclear labels
const unclearButtons = [
  new ButtonBuilder().setCustomId('action1').setLabel('Do It'), // Not descriptive
  new ButtonBuilder().setCustomId('btn').setLabel('Click') // Too generic
]
```

## Common Mistakes

### Incorrect Button Styles
```js
// Bad: Wrong style for action type
const confusingButtons = [
  new ButtonBuilder().setCustomId('delete').setLabel('Delete').setStyle(ButtonStyle.Success), // Should be Danger
  new ButtonBuilder().setCustomId('save').setLabel('Save').setStyle(ButtonStyle.Danger) // Should be Success
]

// Good: Appropriate styles
const clearButtons = [
  new ButtonBuilder().setCustomId('delete').setLabel('Delete').setStyle(ButtonStyle.Danger),
  new ButtonBuilder().setCustomId('save').setLabel('Save').setStyle(ButtonStyle.Success)
]
```

### Missing Interaction Handlers
```js
// Bad: Button without handler
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    // Missing handler for 'unhandled_button'
  }
})

// Good: Handle all button interactions
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    const [action, id] = interaction.customId.split('_')

    switch (action) {
      case 'approve':
        await handleApproval(interaction, id)
        break
      case 'deny':
        await handleDenial(interaction, id)
        break
      default:
        await interaction.reply({ content: 'Unknown action', ephemeral: true })
    }
  }
})
```

### URL Button Security Issues
```js
// Bad: Unsafe URL
const unsafeButton = new ButtonBuilder()
  .setURL('javascript:alert("xss")') // Dangerous
  .setLabel('Click Me')

// Good: Safe URL
const safeButton = new ButtonBuilder()
  .setURL('https://trusted-domain.com/page')
  .setLabel('Visit Site')
```

## Next Steps

- [StringSelectMenuBuilder](/builders/string-select-menu-builder) - Create string selection menus
- [ActionRowBuilder](/builders/action-row-builder) - Organize buttons in rows