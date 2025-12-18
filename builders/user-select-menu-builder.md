# UserSelectMenuBuilder

Create dropdown menus for selecting users from a server or context.

## Overview

`UserSelectMenuBuilder` constructs select menus that allow users to choose from server members or context-specific users. These menus provide type-safe user selection with automatic filtering and validation.

## Basic Example

```js
import { UserSelectMenuBuilder, ActionRowBuilder, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('select-user')
  .setDescription('Select a user for moderation')

export async function execute(interaction) {
  const selectMenu = new UserSelectMenuBuilder()
    .setCustomId('user_moderation')
    .setPlaceholder('Choose a user to moderate')
    .setMinValues(1)
    .setMaxValues(1)

  const row = new ActionRowBuilder().addComponents(selectMenu)

  await interaction.reply({
    content: 'Select a user to apply moderation to:',
    components: [row],
    ephemeral: true
  })
}
```

## Advanced Usage

### Multi-User Selection with Permissions
```js
export function createUserSelectWithPermissions(interaction, action) {
  const selectMenu = new UserSelectMenuBuilder()
    .setCustomId(`user_select_${action}`)
    .setPlaceholder(`Select users to ${action}`)

  // Set selection limits based on action
  switch (action) {
    case 'kick':
    case 'ban':
      selectMenu.setMinValues(1).setMaxValues(10)
      break
    case 'warn':
      selectMenu.setMinValues(1).setMaxValues(25)
      break
    case 'mute':
      selectMenu.setMinValues(1).setMaxValues(5)
      break
    default:
      selectMenu.setMinValues(1).setMaxValues(1)
  }

  // Add default values if applicable
  const preselectedUsers = getPreselectedUsers(interaction, action)
  if (preselectedUsers.length > 0) {
    selectMenu.setDefaultUsers(preselectedUsers)
  }

  return selectMenu
}

export async function execute(interaction) {
  const action = interaction.options.getString('action')

  if (!['kick', 'ban', 'warn', 'mute'].includes(action)) {
    return await interaction.reply({
      content: 'Invalid action specified.',
      ephemeral: true
    })
  }

  const selectMenu = createUserSelectWithPermissions(interaction, action)
  const row = new ActionRowBuilder().addComponents(selectMenu)

  await interaction.reply({
    content: `Select users to ${action}:`,
    components: [row],
    ephemeral: true
  })
}
```

### Filtered User Selection
```js
export function createFilteredUserSelect(filterType, context) {
  const selectMenu = new UserSelectMenuBuilder()
    .setCustomId(`filtered_users_${filterType}`)
    .setMinValues(1)
    .setMaxValues(1)

  switch (filterType) {
    case 'online':
      selectMenu.setPlaceholder('Select an online user')
      break
    case 'role':
      selectMenu.setPlaceholder(`Select user with ${context.roleName} role`)
      break
    case 'permission':
      selectMenu.setPlaceholder(`Select user with ${context.permission} permission`)
      break
    case 'activity':
      selectMenu.setPlaceholder(`Select user ${context.activityType}`)
      break
    default:
      selectMenu.setPlaceholder('Select a user')
  }

  return selectMenu
}

export async function execute(interaction) {
  const filter = interaction.options.getString('filter')
  const context = {}

  if (filter === 'role') {
    const role = interaction.options.getRole('role')
    context.roleName = role.name
  }

  const selectMenu = createFilteredUserSelect(filter, context)
  const row = new ActionRowBuilder().addComponents(selectMenu)

  await interaction.reply({
    content: 'Select a user matching the criteria:',
    components: [row],
    ephemeral: true
  })
}
```

## Limits & Constraints

### Selection Limits
- **Maximum 25 users** can be selected at once
- **Minimum 0, maximum 25** for selection count
- **Default values**: Maximum 25 pre-selected users

### User Availability
- Only shows users visible to the bot
- Respects server member intents
- Filters out bots if configured

### Custom ID Constraints
- **Maximum 100 characters**
- **Alphanumeric, hyphens, underscores only**

### Validation Examples
```js
// Valid user select
const validSelect = new UserSelectMenuBuilder()
  .setCustomId('user_selection')
  .setPlaceholder('Choose users')
  .setMinValues(1)
  .setMaxValues(5)

// Error: Invalid selection range
const invalidRange = new UserSelectMenuBuilder()
  .setCustomId('invalid')
  .setMinValues(10)
  .setMaxValues(5) // Min > Max

// Error: Too many default users
const tooManyDefaults = new UserSelectMenuBuilder()
  .setCustomId('defaults')
  .setDefaultUsers(Array(26).fill('user_id')) // Exceeds 25 limit
```

## Best Practices

### Clear Selection Intent
```js
// Good: Descriptive placeholders
const descriptiveSelect = new UserSelectMenuBuilder()
  .setCustomId('kick_users')
  .setPlaceholder('Select users to kick from the server')
  .setMinValues(1)
  .setMaxValues(10)

// Avoid: Vague placeholders
const vagueSelect = new UserSelectMenuBuilder()
  .setCustomId('select')
  .setPlaceholder('Choose users')
```

### Appropriate Selection Limits
```js
// Good: Reasonable limits for action type
const kickSelect = new UserSelectMenuBuilder()
  .setCustomId('kick_select')
  .setMinValues(1)
  .setMaxValues(5) // Reasonable for kicking

const warnSelect = new UserSelectMenuBuilder()
  .setCustomId('warn_select')
  .setMinValues(1)
  .setMaxValues(25) // Higher limit for warnings
```

### Permission-Aware Selection
```js
// Good: Check permissions before showing menu
const moderationSelect = new UserSelectMenuBuilder()
  .setCustomId('moderate_users')

if (interaction.member.permissions.has('KICK_MEMBERS')) {
  moderationSelect.setMaxValues(10)
} else {
  moderationSelect.setMaxValues(1)
}
```

## Common Mistakes

### Missing Selection Validation
```js
// Bad: No minimum selection
const noMinSelect = new UserSelectMenuBuilder()
  .setCustomId('optional_select')
  .setMinValues(0) // Allows empty selection
  .setMaxValues(5)

// Good: Require at least one selection
const requiredSelect = new UserSelectMenuBuilder()
  .setCustomId('required_select')
  .setMinValues(1)
  .setMaxValues(5)
```

### Ignoring User Permissions
```js
// Bad: Shows all users regardless of context
const unrestrictedSelect = new UserSelectMenuBuilder()
  .setCustomId('any_user')
  .setPlaceholder('Select any user')

// Good: Context-aware selection
const contextSelect = new UserSelectMenuBuilder()
  .setCustomId('moderation_target')
  .setPlaceholder('Select user to moderate')
  // Bot will only show selectable users
```

### Overly Broad Selection Ranges
```js
// Bad: Too many users allowed
const excessiveSelect = new UserSelectMenuBuilder()
  .setCustomId('mass_action')
  .setMinValues(1)
  .setMaxValues(100) // Too many for most actions

// Good: Reasonable limits
const reasonableSelect = new UserSelectMenuBuilder()
  .setCustomId('bulk_action')
  .setMinValues(1)
  .setMaxValues(25) // Balanced limit
```

## Next Steps

- [RoleSelectMenuBuilder](/builders/role-select-menu-builder) - Select roles from server
- [ChannelSelectMenuBuilder](/builders/channel-select-menu-builder) - Select channels from server