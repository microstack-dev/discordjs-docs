# SlashCommandSubcommandGroupBuilder

Organize subcommands into hierarchical groups for complex command structures.

## Overview

`SlashCommandSubcommandGroupBuilder` creates subcommand groups that organize related subcommands into logical categories. Groups provide better command organization for bots with extensive functionality.

## Basic Example

```js
import { SlashCommandBuilder, SlashCommandSubcommandGroupBuilder, SlashCommandSubcommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('Server settings management')
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('user')
    .setDescription('User-related settings')
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName('welcome')
      .setDescription('Configure welcome messages')
      .addStringOption(option =>
        option
          .setName('message')
          .setDescription('Welcome message template')
          .setRequired(true)
      )
    )
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName('roles')
      .setDescription('Configure auto-assigned roles')
      .addRoleOption(option =>
        option
          .setName('role')
          .setDescription('Role to auto-assign')
          .setRequired(true)
      )
    )
  )

export async function execute(interaction) {
  const group = interaction.options.getSubcommandGroup()
  const subcommand = interaction.options.getSubcommand()

  if (group === 'user') {
    if (subcommand === 'welcome') {
      const message = interaction.options.getString('message')
      // Handle welcome message configuration
      await interaction.reply(`Welcome message set to: ${message}`)
    } else if (subcommand === 'roles') {
      const role = interaction.options.getRole('role')
      // Handle auto-role configuration
      await interaction.reply(`Auto-role set to: ${role.name}`)
    }
  }
}
```

## Advanced Usage

### Multi-Group Command Structure
```js
export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Administrative commands')
  .setDefaultMemberPermissions('0') // Admin only
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('moderation')
    .setDescription('Moderation tools')
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName('ban')
      .setDescription('Ban a user')
      .addUserOption(option =>
        option.setName('user').setDescription('User to ban').setRequired(true)
      )
      .addStringOption(option =>
        option.setName('reason').setDescription('Ban reason').setRequired(false)
      )
    )
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName('kick')
      .setDescription('Kick a user')
      .addUserOption(option =>
        option.setName('user').setDescription('User to kick').setRequired(true)
      )
      .addStringOption(option =>
        option.setName('reason').setDescription('Kick reason').setRequired(false)
      )
    )
  )
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('server')
    .setDescription('Server management')
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName('settings')
      .setDescription('View server settings')
    )
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName('config')
      .setDescription('Configure server settings')
      .addStringOption(option =>
        option.setName('setting').setDescription('Setting to configure').setRequired(true)
          .addChoices(
            { name: 'Prefix', value: 'prefix' },
            { name: 'Language', value: 'language' },
            { name: 'Welcome Channel', value: 'welcome_channel' }
          )
      )
      .addStringOption(option =>
        option.setName('value').setDescription('New value').setRequired(true)
      )
    )
  )

export async function execute(interaction) {
  const group = interaction.options.getSubcommandGroup()
  const subcommand = interaction.options.getSubcommand()

  switch (group) {
    case 'moderation':
      await handleModeration(interaction, subcommand)
      break
    case 'server':
      await handleServer(interaction, subcommand)
      break
  }
}

async function handleModeration(interaction, subcommand) {
  const targetUser = interaction.options.getUser('user')
  const reason = interaction.options.getString('reason') || 'No reason provided'

  if (subcommand === 'ban') {
    // Ban logic
    await interaction.reply(`Banned ${targetUser.tag} for: ${reason}`)
  } else if (subcommand === 'kick') {
    // Kick logic
    await interaction.reply(`Kicked ${targetUser.tag} for: ${reason}`)
  }
}

async function handleServer(interaction, subcommand) {
  if (subcommand === 'settings') {
    // Show settings
    const embed = new EmbedBuilder()
      .setTitle('Server Settings')
      .addFields(
        { name: 'Setting 1', value: 'Value 1', inline: true },
        { name: 'Setting 2', value: 'Value 2', inline: true }
      )
    await interaction.reply({ embeds: [embed] })
  } else if (subcommand === 'config') {
    const setting = interaction.options.getString('setting')
    const value = interaction.options.getString('value')
    // Config logic
    await interaction.reply(`Set ${setting} to: ${value}`)
  }
}
```

### Hierarchical Permission Management
```js
export const data = new SlashCommandBuilder()
  .setName('permissions')
  .setDescription('Permission management system')
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('user')
    .setDescription('User permission management')
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName('grant')
      .setDescription('Grant permission to user')
      .addUserOption(option =>
        option.setName('user').setDescription('Target user').setRequired(true)
      )
      .addStringOption(option =>
        option.setName('permission').setDescription('Permission to grant').setRequired(true)
          .addChoices(
            { name: 'Read Messages', value: 'read_messages' },
            { name: 'Send Messages', value: 'send_messages' },
            { name: 'Manage Roles', value: 'manage_roles' }
          )
      )
    )
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName('revoke')
      .setDescription('Revoke permission from user')
      .addUserOption(option =>
        option.setName('user').setDescription('Target user').setRequired(true)
      )
      .addStringOption(option =>
        option.setName('permission').setDescription('Permission to revoke').setRequired(true)
          .addChoices(
            { name: 'Read Messages', value: 'read_messages' },
            { name: 'Send Messages', value: 'send_messages' },
            { name: 'Manage Roles', value: 'manage_roles' }
          )
      )
    )
  )
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('role')
    .setDescription('Role permission management')
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName('add')
      .setDescription('Add permission to role')
      .addRoleOption(option =>
        option.setName('role').setDescription('Target role').setRequired(true)
      )
      .addStringOption(option =>
        option.setName('permission').setDescription('Permission to add').setRequired(true)
          .addChoices(
            { name: 'View Channel', value: 'view_channel' },
            { name: 'Send Messages', value: 'send_messages' },
            { name: 'Embed Links', value: 'embed_links' }
          )
      )
    )
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName('remove')
      .setDescription('Remove permission from role')
      .addRoleOption(option =>
        option.setName('role').setDescription('Target role').setRequired(true)
      )
      .addStringOption(option =>
        option.setName('permission').setDescription('Permission to remove').setRequired(true)
          .addChoices(
            { name: 'View Channel', value: 'view_channel' },
            { name: 'Send Messages', value: 'send_messages' },
            { name: 'Embed Links', value: 'embed_links' }
          )
      )
    )
  )
```

## Group Structure

### Basic Group with Subcommands
```js
const basicGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('category')
  .setDescription('Category description')
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('action1')
    .setDescription('First action')
  )
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('action2')
    .setDescription('Second action')
  )
```

### Complex Group with Options
```js
const complexGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('advanced')
  .setDescription('Advanced operations')
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('configure')
    .setDescription('Configure advanced settings')
    .addStringOption(option =>
      option.setName('setting').setDescription('Setting name').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('value').setDescription('Setting value').setRequired(true)
    )
  )
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('reset')
    .setDescription('Reset to defaults')
    .addBooleanOption(option =>
      option.setName('confirm').setDescription('Confirm reset').setRequired(true)
    )
  )
```

## Limits & Constraints

### Group Limits
- **Name Length**: Maximum 32 characters
- **Description Length**: Maximum 100 characters
- **Groups per Command**: Maximum 25 groups
- **Subcommands per Group**: Maximum 25 subcommands

### Combined Limits
- **Total Subcommands**: Maximum 25 (including non-grouped subcommands)
- **Total Options**: All subcommands share the 25 option limit per command

### Validation Examples
```js
// Valid subcommand group
const validGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('valid_group')
  .setDescription('Valid group description')
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('action')
    .setDescription('Action description')
  )

// Error: Name too long
const invalidName = new SlashCommandSubcommandGroupBuilder()
  .setName('this_group_name_is_way_too_long_and_exceeds_the_character_limit')
  .setDescription('Valid description')

// Error: Too many subcommands in group
const tooManySubs = new SlashCommandSubcommandGroupBuilder()
  .setName('large_group')

// Adding 26 subcommands will throw an error
for (let i = 0; i < 26; i++) {
  tooManySubs.addSubcommand(new SlashCommandSubcommandBuilder()
    .setName(`sub${i}`)
    .setDescription(`Subcommand ${i}`)
  )
}
```

## Best Practices

### Logical Group Organization
```js
// Good: Related functionality grouped together
const organizedCommand = new SlashCommandBuilder()
  .setName('manage')
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('users')
    .setDescription('User management')
    // User-related subcommands
  )
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('channels')
    .setDescription('Channel management')
    // Channel-related subcommands
  )

// Avoid: Random grouping
const disorganizedCommand = new SlashCommandBuilder()
  .setName('tools')
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('misc')
    .setDescription('Miscellaneous tools')
    // Unrelated subcommands mixed together
  )
```

### Consistent Naming Patterns
```js
// Good: Consistent group and subcommand naming
const consistentCommand = new SlashCommandBuilder()
  .setName('config')
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('database')
    .setDescription('Database configuration')
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName('connect')
      .setDescription('Connect to database')
    )
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName('disconnect')
      .setDescription('Disconnect from database')
    )
  )

// Avoid: Inconsistent naming
const inconsistentCommand = new SlashCommandBuilder()
  .setName('setup')
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('db_config')
    .setDescription('Database stuff')
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName('db_connect')
      .setDescription('Connect to DB')
    )
  )
```

### Appropriate Group Granularity
```js
// Good: Balanced group sizes
const balancedCommand = new SlashCommandBuilder()
  .setName('music')
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('playback')
    .setDescription('Playback controls')
    // 3-5 related subcommands
  )
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('playlist')
    .setDescription('Playlist management')
    // 3-5 related subcommands
  )

// Avoid: Too many small groups
const fragmentedCommand = new SlashCommandBuilder()
  .setName('utils')
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('text')
    .setDescription('Text utilities')
    .addSubcommand(/* only 1 subcommand */)
  )
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('math')
    .setDescription('Math utilities')
    .addSubcommand(/* only 1 subcommand */)
  )
```

## Common Mistakes

### Missing Group Handler Logic
```js
// Bad: Not handling groups properly
export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand()
  // Missing group differentiation
  if (subcommand === 'ban') {
    // This could be in different groups
  }
}

// Good: Proper group and subcommand handling
export async function execute(interaction) {
  const group = interaction.options.getSubcommandGroup()
  const subcommand = interaction.options.getSubcommand()
  
  if (group === 'moderation' && subcommand === 'ban') {
    // Handle moderation ban
  } else if (group === 'server' && subcommand === 'ban') {
    // Handle server ban (different logic)
  }
}
```

### Mixing Groups and Non-Grouped Subcommands
```js
// Bad: Incompatible structure
const brokenCommand = new SlashCommandBuilder()
  .setName('broken')
  .addSubcommand(/* standalone subcommand */)
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('group')
    // Grouped subcommands
  )

// Good: Choose one structure
const groupedOnly = new SlashCommandBuilder()
  .setName('grouped')
  .addSubcommandGroup(/* groups only */)

const ungroupedOnly = new SlashCommandBuilder()
  .setName('ungrouped')
  .addSubcommand(/* subcommands only */)
```

### Ignoring Permission Scoping
```js
// Bad: Same permissions for all groups
const badPermissions = new SlashCommandBuilder()
  .setName('admin')
  .setDefaultMemberPermissions('0') // All admin
  .addSubcommandGroup(/* basic admin tasks */)
  .addSubcommandGroup(/* dangerous operations */)

// Good: Appropriate permissions per group context
const goodPermissions = new SlashCommandBuilder()
  .setName('admin')
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('basic')
    .setDescription('Basic admin tasks')
    // Less restrictive permissions
  )
  .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
    .setName('dangerous')
    .setDescription('Dangerous operations')
    .setDefaultMemberPermissions('0') // Full admin only
  )
```

## Next Steps

- [ContextMenuCommandBuilder](/builders/context-menu-command-builder) - Create context menu commands
- [TextInputBuilder](/builders/text-input-builder) - Create modal text inputs