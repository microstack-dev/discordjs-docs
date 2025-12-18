# MentionableSelectMenuBuilder

Create dropdown menus for selecting users or roles that can be mentioned.

## Overview

`MentionableSelectMenuBuilder` constructs select menus that allow users to choose from both server members and roles. These menus provide unified selection of mentionable entities with automatic filtering and permission checking.

## Basic Example

```js
import { MentionableSelectMenuBuilder, ActionRowBuilder, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('mention-target')
  .setDescription('Select a user or role to mention')

export async function execute(interaction) {
  const selectMenu = new MentionableSelectMenuBuilder()
    .setCustomId('mention_selection')
    .setPlaceholder('Choose a user or role to mention')
    .setMinValues(1)
    .setMaxValues(1)

  const row = new ActionRowBuilder().addComponents(selectMenu)

  await interaction.reply({
    content: 'Select who to mention:',
    components: [row]
  })
}
```

## Advanced Usage

### Notification Target Selection
```js
export function createNotificationTargetSelect(notificationType) {
  const selectMenu = new MentionableSelectMenuBuilder()
    .setCustomId(`notify_${notificationType}`)
    .setPlaceholder(`Select who to notify about ${notificationType}`)

  // Configure based on notification type
  switch (notificationType) {
    case 'updates':
      selectMenu.setMinValues(0).setMaxValues(10)
      break
    case 'alerts':
      selectMenu.setMinValues(1).setMaxValues(5)
      break
    case 'maintenance':
      selectMenu.setMinValues(1).setMaxValues(3)
      break
    default:
      selectMenu.setMinValues(1).setMaxValues(1)
  }

  return selectMenu
}

export async function execute(interaction) {
  const type = interaction.options.getString('notification_type')

  const selectMenu = createNotificationTargetSelect(type)
  const row = new ActionRowBuilder().addComponents(selectMenu)

  await interaction.reply({
    content: `Configure ${type} notifications:`,
    components: [row],
    ephemeral: true
  })
}
```

### Permission-Based Mention Selection
```js
export function createPermissionBasedMentionSelect(action, interaction) {
  const selectMenu = new MentionableSelectMenuBuilder()
    .setCustomId(`permission_${action}`)
    .setPlaceholder(`Select users/roles for ${action} permissions`)

  // Set selection limits based on action sensitivity
  const limits = {
    'view': { min: 0, max: 25 },
    'edit': { min: 1, max: 10 },
    'delete': { min: 1, max: 5 },
    'admin': { min: 1, max: 3 }
  }

  const limit = limits[action] || { min: 1, max: 1 }
  selectMenu.setMinValues(limit.min).setMaxValues(limit.max)

  // Set default values based on current permissions
  const currentEntities = getCurrentPermissionEntities(interaction.guild, action)
  if (currentEntities.length > 0) {
    selectMenu.setDefaultValues(currentEntities)
  }

  return selectMenu
}

export async function execute(interaction) {
  const action = interaction.options.getString('action')

  const selectMenu = createPermissionBasedMentionSelect(action, interaction)
  const row = new ActionRowBuilder().addComponents(selectMenu)

  await interaction.reply({
    content: `Select users/roles for ${action} permissions:`,
    components: [row],
    ephemeral: true
  })
}
```

## Limits & Constraints

### Selection Limits
- **Maximum 25 mentionable entities** can be selected at once
- **Minimum 0, maximum 25** for selection count
- **Default values**: Maximum 25 pre-selected entities

### Entity Types
- **Users**: All server members (subject to permissions)
- **Roles**: All server roles (subject to hierarchy)

### Custom ID Constraints
- **Maximum 100 characters**
- **Alphanumeric, hyphens, underscores only**

### Validation Examples
```js
// Valid mentionable select
const validSelect = new MentionableSelectMenuBuilder()
  .setCustomId('mention_selection')
  .setPlaceholder('Choose users or roles')
  .setMinValues(1)
  .setMaxValues(10)

// Error: Invalid selection range
const invalidRange = new MentionableSelectMenuBuilder()
  .setCustomId('invalid')
  .setMinValues(10)
  .setMaxValues(5) // Min > Max

// Error: Too many default values
const tooManyDefaults = new MentionableSelectMenuBuilder()
  .setCustomId('defaults')
  .setDefaultValues(Array(26).fill('entity_id')) // Exceeds 25 limit
```

## Best Practices

### Clear Context Communication
```js
// Good: Descriptive placeholders
const descriptiveSelect = new MentionableSelectMenuBuilder()
  .setCustomId('ping_support')
  .setPlaceholder('Select users/roles to ping for support requests')
  .setMinValues(1)
  .setMaxValues(5)

// Avoid: Unclear purpose
const vagueSelect = new MentionableSelectMenuBuilder()
  .setCustomId('select')
  .setPlaceholder('Choose something')
```

### Appropriate Selection Limits
```js
// Good: Limits based on use case
const notificationSelect = new MentionableSelectMenuBuilder()
  .setCustomId('notify_updates')
  .setMinValues(0) // Optional notifications
  .setMaxValues(10) // Reasonable limit

const assignmentSelect = new MentionableSelectMenuBuilder()
  .setCustomId('assign_task')
  .setMinValues(1) // Required assignment
  .setMaxValues(1) // Single assignee
```

### Permission-Aware Selection
```js
// Good: Only show mentionable entities
const mentionableSelect = new MentionableSelectMenuBuilder()
  .setCustomId('mention_target')
  .setPlaceholder('Select who to mention')

// Bot automatically filters to mentionable users/roles
```

## Common Mistakes

### Missing Selection Validation
```js
// Bad: Allows empty selection for required actions
const optionalSelect = new MentionableSelectMenuBuilder()
  .setCustomId('required_mention')
  .setMinValues(0) // Allows no selection
  .setMaxValues(5)

// Good: Require selection when needed
const requiredSelect = new MentionableSelectMenuBuilder()
  .setCustomId('required_mention')
  .setMinValues(1) // Requires at least one selection
  .setMaxValues(5)
```

### Ignoring Mention Permissions
```js
// Bad: Shows unmentionable entities
const unrestrictedSelect = new MentionableSelectMenuBuilder()
  .setCustomId('any_entity')
  .setPlaceholder('Select anything')

// Good: Only shows mentionable entities
const mentionableOnly = new MentionableSelectMenuBuilder()
  .setCustomId('mentionable_only')
  .setPlaceholder('Select users or roles to mention')
  // Bot automatically filters to mentionable entities
```

### Overly Broad Selection Ranges
```js
// Bad: Too many entities allowed
const excessiveSelect = new MentionableSelectMenuBuilder()
  .setCustomId('mass_mention')
  .setMinValues(1)
  .setMaxValues(100) // Too many for most mentions

// Good: Reasonable limits
const reasonableSelect = new MentionableSelectMenuBuilder()
  .setCustomId('bulk_mention')
  .setMinValues(1)
  .setMaxValues(25) // Balanced limit
```

## Next Steps

- [EmbedBuilder](/builders/embed-builder) - Create rich embed messages
- [AttachmentBuilder](/builders/attachment-builder) - Handle file attachments