# ContextMenuCommandBuilder

Create context menu commands for users and messages with type-safe options.

## Overview

`ContextMenuCommandBuilder` constructs context menu commands that appear when right-clicking users or messages. These commands provide quick actions and are essential for user-specific or message-specific operations.

## Basic Example

```js
import { ContextMenuCommandBuilder, ApplicationCommandType, SlashCommandBuilder } from 'discord.js'

export const data = new ContextMenuCommandBuilder()
  .setName('Get User Info')
  .setType(ApplicationCommandType.User)

export async function execute(interaction) {
  const targetUser = interaction.targetUser

  const embed = new EmbedBuilder()
    .setTitle(`User Info: ${targetUser.tag}`)
    .addFields(
      { name: 'ID', value: targetUser.id, inline: true },
      { name: 'Created', value: targetUser.createdAt.toDateString(), inline: true },
      { name: 'Bot', value: targetUser.bot ? 'Yes' : 'No', inline: true }
    )
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setColor('Blue')

  await interaction.reply({ embeds: [embed], ephemeral: true })
}
```

## Advanced Usage

### Message Context Menu with Moderation
```js
export const data = new ContextMenuCommandBuilder()
  .setName('Moderate Message')
  .setType(ApplicationCommandType.Message)
  .setDefaultMemberPermissions('0') // Admin only

export async function execute(interaction) {
  const targetMessage = interaction.targetMessage
  const moderator = interaction.user

  // Create moderation embed
  const embed = new EmbedBuilder()
    .setTitle('Message Moderation')
    .setDescription(`Reviewing message from ${targetMessage.author.tag}`)
    .addFields(
      { name: 'Author', value: targetMessage.author.toString(), inline: true },
      { name: 'Channel', value: targetMessage.channel.toString(), inline: true },
      { name: 'Created', value: targetMessage.createdAt.toDateString(), inline: true },
      { name: 'Content', value: targetMessage.content.substring(0, 1024), inline: false }
    )
    .setColor('Orange')
    .setTimestamp()

  // Create action buttons
  const actionRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`delete_${targetMessage.id}`)
        .setLabel('Delete Message')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`warn_${targetMessage.author.id}`)
        .setLabel('Warn Author')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`report_${targetMessage.id}`)
        .setLabel('Report')
        .setStyle(ButtonStyle.Primary)
    )

  await interaction.reply({
    embeds: [embed],
    components: [actionRow],
    ephemeral: true
  })
}
```

### User Context Menu with Multiple Actions
```js
export const data = new ContextMenuCommandBuilder()
  .setName('User Actions')
  .setType(ApplicationCommandType.User)

export async function execute(interaction) {
  const targetUser = interaction.targetUser
  const targetMember = interaction.targetMember

  // Check permissions for different actions
  const canKick = interaction.member.permissions.has('KICK_MEMBERS')
  const canBan = interaction.member.permissions.has('BAN_MEMBERS')
  const canMute = interaction.member.permissions.has('MODERATE_MEMBERS')

  // Create user info embed
  const embed = new EmbedBuilder()
    .setTitle(`Actions for ${targetUser.tag}`)
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'Joined Server', value: targetMember?.joinedAt?.toDateString() || 'Not a member', inline: true },
      { name: 'Roles', value: targetMember?.roles?.cache?.size?.toString() || '0', inline: true },
      { name: 'Status', value: getUserStatus(targetMember), inline: true }
    )
    .setColor('Blue')

  // Create action buttons based on permissions
  const buttons = []

  if (canKick && targetMember && !targetMember.permissions.has('ADMINISTRATOR')) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`kick_${targetUser.id}`)
        .setLabel('Kick User')
        .setStyle(ButtonStyle.Danger)
    )
  }

  if (canBan && !targetMember.permissions.has('ADMINISTRATOR')) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`ban_${targetUser.id}`)
        .setLabel('Ban User')
        .setStyle(ButtonStyle.Danger)
    )
  }

  if (canMute && targetMember) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`mute_${targetUser.id}`)
        .setLabel('Timeout User')
        .setStyle(ButtonStyle.Secondary)
    )
  }

  // Always available actions
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`profile_${targetUser.id}`)
      .setLabel('View Profile')
      .setStyle(ButtonStyle.Primary)
  )

  // Create rows (max 5 buttons per row)
  const rows = []
  for (let i = 0; i < buttons.length; i += 5) {
    const rowButtons = buttons.slice(i, i + 5)
    rows.push(new ActionRowBuilder().addComponents(rowButtons))
  }

  await interaction.reply({
    embeds: [embed],
    components: rows,
    ephemeral: true
  })
}

function getUserStatus(member) {
  if (!member) return 'Not in server'
  
  const presence = member.presence
  if (!presence) return 'Offline'
  
  return presence.status.charAt(0).toUpperCase() + presence.status.slice(1)
}
```

### Message Context Menu with Quick Actions
```js
export const data = new ContextMenuCommandBuilder()
  .setName('Quick Reply')
  .setType(ApplicationCommandType.Message)

export async function execute(interaction) {
  const targetMessage = interaction.targetMessage

  // Create quick reply embed
  const embed = new EmbedBuilder()
    .setTitle('Quick Reply')
    .setDescription(`Replying to ${targetMessage.author.tag}'s message`)
    .addFields(
      { name: 'Original Message', value: targetMessage.content.substring(0, 512), inline: false }
    )
    .setColor('Green')

  // Create reply type buttons
  const replyRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`reply_thanks_${targetMessage.id}`)
        .setLabel('👍 Thanks!')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reply_agree_${targetMessage.id}`)
        .setLabel('✅ Agree')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reply_help_${targetMessage.id}`)
        .setLabel('🤔 Need Help?')
        .setStyle(ButtonStyle.Secondary)
    )

  const actionRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`reply_custom_${targetMessage.id}`)
        .setLabel('💬 Custom Reply')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`cancel_reply_${targetMessage.id}`)
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Secondary)
    )

  await interaction.reply({
    embeds: [embed],
    components: [replyRow, actionRow],
    ephemeral: true
  })
}
```

## Command Types

### User Commands
```js
const userCommand = new ContextMenuCommandBuilder()
  .setName('User Info')
  .setType(ApplicationCommandType.User)
  .setDefaultMemberPermissions('0') // Optional permissions
```

### Message Commands
```js
const messageCommand = new ContextMenuCommandBuilder()
  .setName('Translate Message')
  .setType(ApplicationCommandType.Message)
```

## Limits & Constraints

### Name Limits
- **Maximum Length**: 32 characters
- **Allowed Characters**: Alphanumeric, spaces, hyphens, underscores
- **Uniqueness**: Must be unique per application

### Permission Limits
- **Default Permissions**: Valid permission bitfield or '0' for admin-only
- **Guild Permissions**: Can override default permissions per guild

### Type Constraints
- **Valid Types**: `ApplicationCommandType.User` or `ApplicationCommandType.Message`
- **No Options**: Context menu commands don't support options

### Validation Examples
```js
// Valid context menu command
const validCommand = new ContextMenuCommandBuilder()
  .setName('User Info')
  .setType(ApplicationCommandType.User)

// Error: Invalid name
const invalidName = new ContextMenuCommandBuilder()
  .setName('This name is way too long for a context menu command')
  .setType(ApplicationCommandType.User)

// Error: Missing type
const missingType = new ContextMenuCommandBuilder()
  .setName('Command Name')
// Missing .setType()
```

## Best Practices

### Descriptive Command Names
```js
// Good: Clear, action-oriented names
const goodCommands = [
  new ContextMenuCommandBuilder().setName('Get User Info').setType(ApplicationCommandType.User),
  new ContextMenuCommandBuilder().setName('Report Message').setType(ApplicationCommandType.Message),
  new ContextMenuCommandBuilder().setName('Translate Message').setType(ApplicationCommandType.Message)
]

// Avoid: Generic or unclear names
const badCommands = [
  new ContextMenuCommandBuilder().setName('Action').setType(ApplicationCommandType.User),
  new ContextMenuCommandBuilder().setName('Do Something').setType(ApplicationCommandType.Message)
]
```

### Appropriate Permission Settings
```js
// Good: Proper permission scoping
const adminCommand = new ContextMenuCommandBuilder()
  .setName('Ban User')
  .setType(ApplicationCommandType.User)
  .setDefaultMemberPermissions('4') // BAN_MEMBERS permission

const publicCommand = new ContextMenuCommandBuilder()
  .setName('View Profile')
  .setType(ApplicationCommandType.User)
  // No default permissions - available to all
```

### Context-Aware Actions
```js
// Good: Actions appropriate for context type
const userCommand = new ContextMenuCommandBuilder()
  .setName('Moderate User')
  .setType(ApplicationCommandType.User)
// User-specific actions like kick, ban, mute

const messageCommand = new ContextMenuCommandBuilder()
  .setName('Pin Message')
  .setType(ApplicationCommandType.Message)
// Message-specific actions like pin, delete, react
```

## Common Mistakes

### Missing Type Specification
```js
// Bad: No command type specified
const brokenCommand = new ContextMenuCommandBuilder()
  .setName('Broken Command')
// Missing .setType() - will cause registration errors

// Good: Proper type specification
const workingCommand = new ContextMenuCommandBuilder()
  .setName('Working Command')
  .setType(ApplicationCommandType.User)
```

### Inappropriate Command Scope
```js
// Bad: User command trying to access message data
export async function execute(interaction) {
  const targetMessage = interaction.targetMessage // Will be undefined for user commands
  // This code will fail
}

// Good: Proper scope usage
export async function execute(interaction) {
  if (interaction.commandType === ApplicationCommandType.User) {
    const targetUser = interaction.targetUser
    // User-specific logic
  } else {
    const targetMessage = interaction.targetMessage
    // Message-specific logic
  }
}
```

### Ignoring Permission Checks
```js
// Bad: No runtime permission validation
export async function execute(interaction) {
  const targetUser = interaction.targetUser
  await interaction.guild.members.ban(targetUser) // Could fail without permissions
}

// Good: Proper permission checking
export async function execute(interaction) {
  const targetUser = interaction.targetUser
  
  if (!interaction.member.permissions.has('BAN_MEMBERS')) {
    return await interaction.reply({
      content: 'You do not have permission to ban users.',
      ephemeral: true
    })
  }
  
  await interaction.guild.members.ban(targetUser)
  await interaction.reply({
    content: 'User banned successfully.',
    ephemeral: true
  })
}
```

## Next Steps

- [SlashCommandSubcommandBuilder](/builders/slash-command-subcommand-builder) - Create subcommand options
- [SlashCommandSubcommandGroupBuilder](/builders/slash-command-subcommand-group-builder) - Organize subcommands into groups