# ChannelSelectMenuBuilder

Create dropdown menus for selecting channels from a server.

## Overview

`ChannelSelectMenuBuilder` constructs select menus that allow users to choose from server channels. These menus provide filtered channel selection with automatic type checking and permission validation.

## Basic Example

```js
import { ChannelSelectMenuBuilder, ActionRowBuilder, SlashCommandBuilder, ChannelType } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('select-channel')
  .setDescription('Select a channel for configuration')

export async function execute(interaction) {
  const selectMenu = new ChannelSelectMenuBuilder()
    .setCustomId('channel_config')
    .setPlaceholder('Choose a channel')
    .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
    .setMinValues(1)
    .setMaxValues(1)

  const row = new ActionRowBuilder().addComponents(selectMenu)

  await interaction.reply({
    content: 'Select a channel to configure:',
    components: [row],
    ephemeral: true
  })
}
```

## Advanced Usage

### Type-Filtered Channel Selection
```js
export function createChannelSelectByType(channelType, action) {
  const selectMenu = new ChannelSelectMenuBuilder()
    .setCustomId(`channel_${action}_${channelType}`)
    .setMinValues(1)
    .setMaxValues(1)

  // Configure based on channel type and action
  switch (channelType) {
    case 'text':
      selectMenu
        .setPlaceholder(`Select a text channel to ${action}`)
        .addChannelTypes(ChannelType.GuildText)
      break

    case 'voice':
      selectMenu
        .setPlaceholder(`Select a voice channel to ${action}`)
        .addChannelTypes(ChannelType.GuildVoice)
      break

    case 'announcement':
      selectMenu
        .setPlaceholder(`Select an announcement channel to ${action}`)
        .addChannelTypes(ChannelType.GuildAnnouncement)
      break

    case 'forum':
      selectMenu
        .setPlaceholder(`Select a forum channel to ${action}`)
        .addChannelTypes(ChannelType.GuildForum)
      break

    default:
      selectMenu
        .setPlaceholder(`Select a channel to ${action}`)
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildVoice,
          ChannelType.GuildAnnouncement
        )
  }

  return selectMenu
}

export async function execute(interaction) {
  const type = interaction.options.getString('type')
  const action = interaction.options.getString('action')

  const selectMenu = createChannelSelectByType(type, action)
  const row = new ActionRowBuilder().addComponents(selectMenu)

  await interaction.reply({
    content: `Select a ${type} channel to ${action}:`,
    components: [row],
    ephemeral: true
  })
}
```

### Multi-Channel Selection with Defaults
```js
export function createMultiChannelSelect(interaction, purpose) {
  const selectMenu = new ChannelSelectMenuBuilder()
    .setCustomId(`multi_channel_${purpose}`)
    .setPlaceholder(`Select channels for ${purpose}`)

  // Set selection limits based on purpose
  switch (purpose) {
    case 'moderation':
      selectMenu
        .setMinValues(1)
        .setMaxValues(5)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      break

    case 'logging':
      selectMenu
        .setMinValues(1)
        .setMaxValues(3)
        .addChannelTypes(ChannelType.GuildText)
      break

    case 'welcome':
      selectMenu
        .setMinValues(1)
        .setMaxValues(1)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      break

    default:
      selectMenu
        .setMinValues(1)
        .setMaxValues(10)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
  }

  // Set default channels if they exist
  const defaultChannels = getDefaultChannels(interaction.guild, purpose)
  if (defaultChannels.length > 0) {
    selectMenu.setDefaultChannels(defaultChannels)
  }

  return selectMenu
}

export async function execute(interaction) {
  const purpose = interaction.options.getString('purpose')

  const selectMenu = createMultiChannelSelect(interaction, purpose)
  const row = new ActionRowBuilder().addComponents(selectMenu)

  await interaction.reply({
    content: `Select channels for ${purpose}:`,
    components: [row],
    ephemeral: true
  })
}
```

## Limits & Constraints

### Selection Limits
- **Maximum 25 channels** can be selected at once
- **Minimum 0, maximum 25** for selection count
- **Default channels**: Maximum 25 pre-selected channels

### Channel Types
- **Text Channels**: GuildText, GuildAnnouncement, GuildForum
- **Voice Channels**: GuildVoice, GuildStageVoice
- **Private Channels**: Requires appropriate permissions

### Custom ID Constraints
- **Maximum 100 characters**
- **Alphanumeric, hyphens, underscores only**

### Validation Examples
```js
// Valid channel select
const validSelect = new ChannelSelectMenuBuilder()
  .setCustomId('channel_selection')
  .setPlaceholder('Choose channels')
  .addChannelTypes(ChannelType.GuildText)
  .setMinValues(1)
  .setMaxValues(5)

// Error: Invalid selection range
const invalidRange = new ChannelSelectMenuBuilder()
  .setCustomId('invalid')
  .setMinValues(10)
  .setMaxValues(5) // Min > Max

// Error: Too many default channels
const tooManyDefaults = new ChannelSelectMenuBuilder()
  .setCustomId('defaults')
  .setDefaultChannels(Array(26).fill('channel_id')) // Exceeds 25 limit
```

## Best Practices

### Type-Specific Selection
```js
// Good: Appropriate channel types for action
const textChannelSelect = new ChannelSelectMenuBuilder()
  .setCustomId('send_message')
  .setPlaceholder('Select text channel to send message')
  .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)

const voiceChannelSelect = new ChannelSelectMenuBuilder()
  .setCustomId('move_users')
  .setPlaceholder('Select voice channel to move users to')
  .addChannelTypes(ChannelType.GuildVoice)
```

### Permission-Aware Filtering
```js
// Good: Only show accessible channels
const accessibleSelect = new ChannelSelectMenuBuilder()
  .setCustomId('manage_channel')
  .setPlaceholder('Select channel you can manage')

// Bot automatically filters to manageable channels
```

### Clear Purpose Communication
```js
// Good: Descriptive placeholders
const descriptiveSelect = new ChannelSelectMenuBuilder()
  .setCustomId('log_channel')
  .setPlaceholder('Select channel for moderation logs')
  .addChannelTypes(ChannelType.GuildText)

// Avoid: Unclear purpose
const unclearSelect = new ChannelSelectMenuBuilder()
  .setCustomId('select_channel')
  .setPlaceholder('Choose a channel')
```

## Common Mistakes

### Missing Channel Type Filtering
```js
// Bad: Shows all channel types
const unfilteredSelect = new ChannelSelectMenuBuilder()
  .setCustomId('any_channel')
  .setPlaceholder('Select any channel')

// Good: Filter to appropriate types
const filteredSelect = new ChannelSelectMenuBuilder()
  .setCustomId('text_channel')
  .setPlaceholder('Select a text channel')
  .addChannelTypes(ChannelType.GuildText)
```

### Ignoring Permission Requirements
```js
// Bad: Shows channels user can't access
const unrestrictedSelect = new ChannelSelectMenuBuilder()
  .setCustomId('private_channel')
  .setPlaceholder('Select private channel')

// Good: Respects channel permissions
const permissionedSelect = new ChannelSelectMenuBuilder()
  .setCustomId('accessible_channel')
  .setPlaceholder('Select channel you can access')
  // Bot filters to accessible channels
```

### Overly Broad Selection Ranges
```js
// Bad: Too many channels allowed
const excessiveSelect = new ChannelSelectMenuBuilder()
  .setCustomId('mass_select')
  .setMinValues(1)
  .setMaxValues(100) // Too many for most actions

// Good: Reasonable limits
const reasonableSelect = new ChannelSelectMenuBuilder()
  .setCustomId('bulk_action')
  .setMinValues(1)
  .setMaxValues(25) // Balanced limit
```

## Next Steps

- [MentionableSelectMenuBuilder](/builders/mentionable-select-menu-builder) - Select users or roles
- [StringSelectMenuBuilder](/builders/string-select-menu-builder) - Create custom string menus