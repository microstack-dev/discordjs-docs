# RoleSelectMenuBuilder

Create dropdown menus for selecting roles from a server.

## Overview

`RoleSelectMenuBuilder` constructs select menus that allow users to choose from server roles. These menus provide hierarchical role selection with automatic permission checking and role filtering.

## Basic Example

```js
import { RoleSelectMenuBuilder, ActionRowBuilder, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('assign-role')
  .setDescription('Assign a role to a user')

export async function execute(interaction) {
  const selectMenu = new RoleSelectMenuBuilder()
    .setCustomId('role_assignment')
    .setPlaceholder('Choose a role to assign')
    .setMinValues(1)
    .setMaxValues(1)

  const row = new ActionRowBuilder().addComponents(selectMenu)

  await interaction.reply({
    content: 'Select a role to assign:',
    components: [row],
    ephemeral: true
  })
}
```

## Advanced Usage

### Permission-Based Role Selection
```js
export function createRoleSelectByPermission(interaction, requiredPermission) {
  const selectMenu = new RoleSelectMenuBuilder()
    .setCustomId(`role_select_${requiredPermission}`)
    .setPlaceholder(`Select roles with ${requiredPermission} permission`)

  // Filter roles that have the required permission
  const availableRoles = interaction.guild.roles.cache.filter(role => {
    // Check if role has the required permission
    return role.permissions.has(requiredPermission)
  })

  // Set default roles if user already has them
  const userRoles = interaction.member.roles.cache
  const defaultRoles = userRoles.filter(role =>
    role.permissions.has(requiredPermission)
  )

  if (defaultRoles.size > 0) {
    selectMenu.setDefaultRoles(defaultRoles.map(role => role.id))
  }

  return selectMenu
}

export async function execute(interaction) {
  const permission = interaction.options.getString('permission')

  const selectMenu = createRoleSelectByPermission(interaction, permission)
  const row = new ActionRowBuilder().addComponents(selectMenu)

  await interaction.reply({
    content: `Select roles with ${permission} permission:`,
    components: [row],
    ephemeral: true
  })
}
```

### Hierarchical Role Management
```js
export function createRoleHierarchySelect(action) {
  const selectMenu = new RoleSelectMenuBuilder()
    .setCustomId(`hierarchy_${action}`)
    .setPlaceholder(`Select role(s) to ${action}`)

  // Set selection limits based on action
  switch (action) {
    case 'assign':
      selectMenu.setMinValues(1).setMaxValues(5)
      break
    case 'remove':
      selectMenu.setMinValues(1).setMaxValues(10)
      break
    case 'modify':
      selectMenu.setMinValues(1).setMaxValues(1)
      break
    default:
      selectMenu.setMinValues(1).setMaxValues(1)
  }

  return selectMenu
}

export async function execute(interaction) {
  const action = interaction.options.getString('action')
  const targetUser = interaction.options.getUser('user')

  const selectMenu = createRoleHierarchySelect(action)
  const row = new ActionRowBuilder().addComponents(selectMenu)

  await interaction.reply({
    content: `Select role(s) to ${action} for ${targetUser.tag}:`,
    components: [row],
    ephemeral: true
  })
}
```

## Limits & Constraints

### Selection Limits
- **Maximum 25 roles** can be selected at once
- **Minimum 0, maximum 25** for selection count
- **Default roles**: Maximum 25 pre-selected roles

### Role Availability
- Only shows roles visible to the bot
- Respects role hierarchy and permissions
- Filters based on user's manageable roles

### Custom ID Constraints
- **Maximum 100 characters**
- **Alphanumeric, hyphens, underscores only**

### Validation Examples
```js
// Valid role select
const validSelect = new RoleSelectMenuBuilder()
  .setCustomId('role_selection')
  .setPlaceholder('Choose roles')
  .setMinValues(1)
  .setMaxValues(5)

// Error: Invalid selection range
const invalidRange = new RoleSelectMenuBuilder()
  .setCustomId('invalid')
  .setMinValues(5)
  .setMaxValues(3) // Min > Max

// Error: Too many default roles
const tooManyDefaults = new RoleSelectMenuBuilder()
  .setCustomId('defaults')
  .setDefaultRoles(Array(26).fill('role_id')) // Exceeds 25 limit
```

## Best Practices

### Permission-Respecting Selection
```js
// Good: Only show manageable roles
const manageableSelect = new RoleSelectMenuBuilder()
  .setCustomId('manage_roles')
  .setPlaceholder('Select roles you can manage')

// Bot automatically filters to manageable roles
```

### Clear Action Context
```js
// Good: Descriptive placeholders
const descriptiveSelect = new RoleSelectMenuBuilder()
  .setCustomId('assign_moderator')
  .setPlaceholder('Select moderator roles to assign')
  .setMinValues(1)
  .setMaxValues(3)

// Avoid: Generic placeholders
const genericSelect = new RoleSelectMenuBuilder()
  .setCustomId('roles')
  .setPlaceholder('Choose roles')
```

### Reasonable Selection Limits
```js
// Good: Appropriate limits for different actions
const singleRoleSelect = new RoleSelectMenuBuilder()
  .setCustomId('set_primary_role')
  .setMinValues(1)
  .setMaxValues(1) // Only one primary role

const multipleRoleSelect = new RoleSelectMenuBuilder()
  .setCustomId('assign_secondary_roles')
  .setMinValues(0)
  .setMaxValues(10) // Multiple secondary roles allowed
```

## Common Mistakes

### Ignoring Role Hierarchy
```js
// Bad: Shows all roles regardless of hierarchy
const unrestrictedSelect = new RoleSelectMenuBuilder()
  .setCustomId('any_role')
  .setPlaceholder('Select any role')

// Good: Respects role hierarchy
const hierarchySelect = new RoleSelectMenuBuilder()
  .setCustomId('manageable_roles')
  .setPlaceholder('Select roles you can manage')
  // Bot automatically filters based on user's role hierarchy
```

### Overly Broad Permissions
```js
// Bad: Allows selection of admin roles by non-admins
const dangerousSelect = new RoleSelectMenuBuilder()
  .setCustomId('admin_roles')
  .setPlaceholder('Select admin roles')

// Good: Permission-aware selection
const safeSelect = new RoleSelectMenuBuilder()
  .setCustomId('assignable_roles')
  .setPlaceholder('Select roles you can assign')
  // Bot filters out roles user cannot assign
```

### Missing Validation
```js
// Bad: No minimum selection for required actions
const optionalSelect = new RoleSelectMenuBuilder()
  .setCustomId('required_role')
  .setMinValues(0) // Allows no selection
  .setMaxValues(5)

// Good: Require selection when needed
const requiredSelect = new RoleSelectMenuBuilder()
  .setCustomId('required_role')
  .setMinValues(1) // Requires at least one selection
  .setMaxValues(5)
```

## Next Steps

- [ChannelSelectMenuBuilder](/builders/channel-select-menu-builder) - Select channels from server
- [MentionableSelectMenuBuilder](/builders/mentionable-select-menu-builder) - Select users or roles