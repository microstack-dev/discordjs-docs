# SlashCommandSubcommandBuilder

Create subcommand options for organizing complex slash command functionality.

## Overview

`SlashCommandSubcommandBuilder` constructs subcommand options that allow slash commands to have multiple distinct actions grouped under a single command name. Subcommands provide better organization for complex bots.

## Basic Example

```js
import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('user')
  .setDescription('User management commands')
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('info')
    .setDescription('Get user information')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('User to get info about')
        .setRequired(false)
    )
  )

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand()

  if (subcommand === 'info') {
    const target = interaction.options.getUser('target') || interaction.user

    const embed = new EmbedBuilder()
      .setTitle(`User Info: ${target.tag}`)
      .addFields(
        { name: 'ID', value: target.id, inline: true },
        { name: 'Created', value: target.createdAt.toDateString(), inline: true },
        { name: 'Bot', value: target.bot ? 'Yes' : 'No', inline: true }
      )
      .setThumbnail(target.displayAvatarURL({ size: 256 }))

    await interaction.reply({ embeds: [embed] })
  }
}
```

## Advanced Usage

### Multiple Subcommands with Shared Options
```js
export const data = new SlashCommandBuilder()
  .setName('moderation')
  .setDescription('Server moderation commands')
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for warning')
        .setRequired(false)
    )
  )
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for kick')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('delete_messages')
        .setDescription('Delete message history (days)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7)
    )
  )
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for ban')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('delete_messages')
        .setDescription('Delete message history (days)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7)
    )
  )

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand()
  const targetUser = interaction.options.getUser('user')
  const reason = interaction.options.getString('reason') || 'No reason provided'

  switch (subcommand) {
    case 'warn':
      // Handle warning logic
      await handleWarn(interaction, targetUser, reason)
      break

    case 'kick':
      const deleteDays = interaction.options.getInteger('delete_messages') || 0
      await handleKick(interaction, targetUser, reason, deleteDays)
      break

    case 'ban':
      const deleteDaysBan = interaction.options.getInteger('delete_messages') || 0
      await handleBan(interaction, targetUser, reason, deleteDaysBan)
      break
  }
}

async function handleWarn(interaction, user, reason) {
  // Warning logic here
  await interaction.reply(`Warned ${user.tag} for: ${reason}`)
}

async function handleKick(interaction, user, reason, deleteDays) {
  // Kick logic here
  await interaction.reply(`Kicked ${user.tag} for: ${reason}`)
}

async function handleBan(interaction, user, reason, deleteDays) {
  // Ban logic here
  await interaction.reply(`Banned ${user.tag} for: ${reason}`)
}
```

### Subcommand with Complex Options
```js
export const data = new SlashCommandBuilder()
  .setName('music')
  .setDescription('Music playback commands')
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('play')
    .setDescription('Play music from various sources')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Song name, URL, or playlist')
        .setRequired(true)
        .setMaxLength(200)
    )
    .addStringOption(option =>
      option
        .setName('source')
        .setDescription('Music source')
        .setRequired(false)
        .addChoices(
          { name: 'YouTube', value: 'youtube' },
          { name: 'Spotify', value: 'spotify' },
          { name: 'SoundCloud', value: 'soundcloud' },
          { name: 'Direct URL', value: 'url' }
        )
    )
  )
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('playlist')
    .setDescription('Manage playlists')
    .addStringOption(option =>
      option
        .setName('action')
        .setDescription('Playlist action')
        .setRequired(true)
        .addChoices(
          { name: 'Create', value: 'create' },
          { name: 'Add Current Song', value: 'add' },
          { name: 'Remove Song', value: 'remove' },
          { name: 'Show Playlist', value: 'show' },
          { name: 'Clear', value: 'clear' }
        )
    )
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('Playlist name (for create action)')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('position')
        .setDescription('Song position to remove (for remove action)')
        .setRequired(false)
        .setMinValue(1)
    )
  )

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand()

  if (subcommand === 'play') {
    const query = interaction.options.getString('query')
    const source = interaction.options.getString('source') || 'youtube'
    
    await handlePlay(interaction, query, source)
  } else if (subcommand === 'playlist') {
    const action = interaction.options.getString('action')
    const name = interaction.options.getString('name')
    const position = interaction.options.getInteger('position')
    
    await handlePlaylist(interaction, action, name, position)
  }
}
```

## Subcommand Structure

### Basic Subcommand
```js
const basicSubcommand = new SlashCommandSubcommandBuilder()
  .setName('action')
  .setDescription('Perform an action')
  .addStringOption(option =>
    option
      .setName('input')
      .setDescription('Input value')
      .setRequired(true)
  )
```

### Complex Subcommand with Multiple Options
```js
const complexSubcommand = new SlashCommandSubcommandBuilder()
  .setName('configure')
  .setDescription('Configure advanced settings')
  .addBooleanOption(option =>
    option
      .setName('enabled')
      .setDescription('Enable feature')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName('limit')
      .setDescription('Maximum value')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .addStringOption(option =>
    option
      .setName('mode')
      .setDescription('Operation mode')
      .setRequired(false)
      .addChoices(
        { name: 'Auto', value: 'auto' },
        { name: 'Manual', value: 'manual' },
        { name: 'Custom', value: 'custom' }
      )
  )
```

## Limits & Constraints

### Subcommand Limits
- **Name Length**: Maximum 32 characters
- **Description Length**: Maximum 100 characters
- **Options per Subcommand**: Maximum 25 options
- **Subcommands per Command**: Maximum 25 (including groups)

### Option Limits
- **Name Length**: Maximum 32 characters
- **Description Length**: Maximum 100 characters
- **Choices per Option**: Maximum 25 choices

### Validation Examples
```js
// Valid subcommand
const validSubcommand = new SlashCommandSubcommandBuilder()
  .setName('valid_action')
  .setDescription('A valid subcommand')
  .addStringOption(option =>
    option.setName('input').setDescription('Input').setRequired(true)
  )

// Error: Name too long
const invalidName = new SlashCommandSubcommandBuilder()
  .setName('this_subcommand_name_is_way_too_long_and_exceeds_limits')
  .setDescription('Valid description')

// Error: Too many options
const tooManyOptions = new SlashCommandSubcommandBuilder()
  .setName('many_options')

// Adding 26 options will throw an error
for (let i = 0; i < 26; i++) {
  tooManyOptions.addStringOption(option =>
    option.setName(`opt${i}`).setDescription(`Option ${i}`)
  )
}
```

## Best Practices

### Logical Subcommand Grouping
```js
// Good: Related actions grouped together
const userCommand = new SlashCommandBuilder()
  .setName('user')
  .setDescription('User management')
  .addSubcommand(/* info subcommand */)
  .addSubcommand(/* profile subcommand */)
  .addSubcommand(/* settings subcommand */)

// Avoid: Unrelated actions in same command
const mixedCommand = new SlashCommandBuilder()
  .setName('utils')
  .setDescription('Utilities')
  .addSubcommand(/* user info */)
  .addSubcommand(/* play music */)
  .addSubcommand(/* calculate math */)
```

### Consistent Option Patterns
```js
// Good: Consistent option naming across subcommands
const consistentCommand = new SlashCommandBuilder()
  .setName('manage')
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('users')
    .addUserOption(option =>
      option.setName('target').setDescription('Target user').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason').setRequired(false)
    )
  )
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('roles')
    .addRoleOption(option =>
      option.setName('target').setDescription('Target role').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason').setRequired(false)
    )
  )
```

### Appropriate Option Requirements
```js
// Good: Required options for essential parameters
const goodSubcommand = new SlashCommandSubcommandBuilder()
  .setName('create')
  .setDescription('Create new item')
  .addStringOption(option =>
    option.setName('name').setDescription('Item name').setRequired(true)
  )
  .addStringOption(option =>
    option.setName('description').setDescription('Item description').setRequired(false)
  )

// Avoid: Making everything required
const overRequired = new SlashCommandSubcommandBuilder()
  .setName('update')
  .setDescription('Update item')
  .addStringOption(option =>
    option.setName('name').setDescription('New name').setRequired(true)
  )
  .addStringOption(option =>
    option.setName('description').setDescription('New description').setRequired(true)
  )
  .addBooleanOption(option =>
    option.setName('enabled').setDescription('Enabled status').setRequired(true)
  )
```

## Common Mistakes

### Missing Subcommand Handler
```js
// Bad: No subcommand differentiation
export async function execute(interaction) {
  // This will fail for commands with subcommands
  const user = interaction.options.getUser('user')
  await interaction.reply(`User: ${user.tag}`)
}

// Good: Proper subcommand handling
export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand()
  
  if (subcommand === 'info') {
    const user = interaction.options.getUser('user')
    await interaction.reply(`User: ${user.tag}`)
  } else if (subcommand === 'settings') {
    // Handle settings subcommand
  }
}
```

### Inconsistent Option Availability
```js
// Bad: Options available in wrong subcommands
const brokenCommand = new SlashCommandBuilder()
  .setName('music')
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('play')
    .addStringOption(option =>
      option.setName('query').setDescription('Song to play').setRequired(true)
    )
  )
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('stop')
    .addStringOption(option =>
      option.setName('query').setDescription('Unused option').setRequired(true) // Wrong context
    )
  )

// Good: Appropriate options for each subcommand
const fixedCommand = new SlashCommandBuilder()
  .setName('music')
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('play')
    .addStringOption(option =>
      option.setName('query').setDescription('Song to play').setRequired(true)
    )
  )
  .addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('stop')
    // No options needed for stop command
  )
```

### Ignoring Subcommand Limits
```js
// Bad: Too many subcommands
const tooManySubs = new SlashCommandBuilder()
  .setName('admin')

// Adding 26 subcommands will throw an error
for (let i = 0; i < 26; i++) {
  tooManySubs.addSubcommand(new SlashCommandSubcommandBuilder()
    .setName(`action${i}`)
    .setDescription(`Action ${i}`)
  )
}

// Good: Use subcommand groups for organization
const organizedSubs = new SlashCommandBuilder()
  .setName('admin')
  .addSubcommandGroup(/* user management group */)
  .addSubcommandGroup(/* server management group */)
```

## Next Steps

- [SlashCommandSubcommandGroupBuilder](/builders/slash-command-subcommand-group-builder) - Organize subcommands into groups
- [ContextMenuCommandBuilder](/builders/context-menu-command-builder) - Create context menu commands