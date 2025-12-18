# Permissions Overview

Discord permission system controls user access to commands, channels, and server features. This section covers permission checking, role hierarchies, and secure command implementation.

## Permission Fundamentals

### Permission Types

- **Discord Permissions**: Built-in Discord permission flags
- **Role Permissions**: Permissions granted through roles
- **Channel Permissions**: Channel-specific overrides
- **Command Permissions**: Slash command access control

### PermissionBitField

```js
import { PermissionsBitField } from 'discord.js'

// Check specific permissions
const permissions = new PermissionsBitField([
  'SendMessages',
  'ReadMessageHistory',
  'UseExternalEmojis'
])

console.log(permissions.has('SendMessages')) // true
console.log(permissions.toArray()) // ['SendMessages', 'ReadMessageHistory', 'UseExternalEmojis']
```

## Basic Permission Checking

### Member Permission Check

```js
async function checkPermissions(interaction, requiredPermissions) {
  const member = interaction.member

  // Check if user has all required permissions
  const hasPermissions = member.permissions.has(requiredPermissions)

  if (!hasPermissions) {
    await interaction.reply({
      content: 'You do not have permission to use this command.',
      ephemeral: true
    })
    return false
  }

  return true
}

// Usage
client.on('interactionCreate', async (interaction) => {
  if (interaction.commandName === 'ban') {
    const hasPermission = await checkPermissions(interaction, ['BanMembers'])
    if (!hasPermission) return

    // Proceed with ban logic
  }
})
```

### Channel-Specific Permissions

```js
async function checkChannelPermissions(interaction, channel, requiredPermissions) {
  const member = interaction.member

  // Check permissions in specific channel
  const channelPermissions = channel.permissionsFor(member)

  if (!channelPermissions.has(requiredPermissions)) {
    await interaction.reply({
      content: `You do not have permission to perform this action in ${channel}.`,
      ephemeral: true
    })
    return false
  }

  return true
}

// Usage
client.on('interactionCreate', async (interaction) => {
  if (interaction.commandName === 'purge') {
    const channel = interaction.options.getChannel('channel') || interaction.channel
    const hasPermission = await checkChannelPermissions(interaction, channel, ['ManageMessages'])
    if (!hasPermission) return

    // Proceed with purge logic
  }
})
```

## Permission Flags

### Common Permission Flags

```js
const permissionFlags = {
  // General permissions
  CreateInstantInvite: 'Create instant invites',
  KickMembers: 'Kick members',
  BanMembers: 'Ban members',
  Administrator: 'Administrator',
  ManageChannels: 'Manage channels',
  ManageGuild: 'Manage server',
  AddReactions: 'Add reactions',
  ViewAuditLog: 'View audit log',
  PrioritySpeaker: 'Priority speaker',
  Stream: 'Video',
  ViewChannel: 'View channels',
  SendMessages: 'Send messages',
  SendTTSMessages: 'Send TTS messages',
  ManageMessages: 'Manage messages',
  EmbedLinks: 'Embed links',
  AttachFiles: 'Attach files',
  ReadMessageHistory: 'Read message history',
  MentionEveryone: 'Mention @everyone, @here, and all roles',
  UseExternalEmojis: 'Use external emojis',
  ViewGuildInsights: 'View server insights',
  Connect: 'Connect',
  Speak: 'Speak',
  MuteMembers: 'Mute members',
  DeafenMembers: 'Deafen members',
  MoveMembers: 'Move members',
  UseVAD: 'Use voice activity',
  ChangeNickname: 'Change nickname',
  ManageNicknames: 'Manage nicknames',
  ManageRoles: 'Manage roles',
  ManageWebhooks: 'Manage webhooks',
  ManageEmojisAndStickers: 'Manage emojis and stickers',
  UseApplicationCommands: 'Use application commands',
  RequestToSpeak: 'Request to speak',
  ManageEvents: 'Manage events',
  ManageThreads: 'Manage threads',
  CreatePublicThreads: 'Create public threads',
  CreatePrivateThreads: 'Create private threads',
  UseExternalStickers: 'Use external stickers',
  SendMessagesInThreads: 'Send messages in threads',
  UseEmbeddedActivities: 'Use embedded activities',
  ModerateMembers: 'Moderate members'
}
```

### Permission Groups

```js
const permissionGroups = {
  moderation: [
    'KickMembers',
    'BanMembers',
    'ManageMessages',
    'ModerateMembers',
    'ManageNicknames'
  ],

  administration: [
    'Administrator',
    'ManageGuild',
    'ManageChannels',
    'ManageRoles',
    'ManageWebhooks',
    'ViewAuditLog'
  ],

  voice: [
    'Connect',
    'Speak',
    'MuteMembers',
    'DeafenMembers',
    'MoveMembers',
    'UseVAD'
  ],

  text: [
    'SendMessages',
    'SendTTSMessages',
    'EmbedLinks',
    'AttachFiles',
    'ReadMessageHistory',
    'MentionEveryone',
    'UseExternalEmojis',
    'ManageMessages'
  ]
}

// Check if user has any permission from a group
function hasAnyPermission(member, permissionGroup) {
  return permissionGroups[permissionGroup].some(permission =>
    member.permissions.has(permission)
  )
}

// Check if user has all permissions from a group
function hasAllPermissions(member, permissionGroup) {
  return permissionGroups[permissionGroup].every(permission =>
    member.permissions.has(permission)
  )
}
```

## Role Hierarchy

### Understanding Role Hierarchy

```js
class RoleHierarchyManager {
  constructor(guild) {
    this.guild = guild
  }

  // Get user's highest role
  getHighestRole(member) {
    return member.roles.cache.reduce((highest, role) => {
      return role.position > highest.position ? role : highest
    })
  }

  // Check if user can manage target user
  canManageUser(manager, target) {
    if (manager.id === this.guild.ownerId) return true
    if (target.id === this.guild.ownerId) return false

    const managerHighest = this.getHighestRole(manager)
    const targetHighest = this.getHighestRole(target)

    return managerHighest.position > targetHighest.position
  }

  // Check if user can manage role
  canManageRole(member, role) {
    if (member.id === this.guild.ownerId) return true

    const memberHighest = this.getHighestRole(member)
    return memberHighest.position > role.position
  }

  // Get manageable roles for user
  getManageableRoles(member) {
    if (member.id === this.guild.ownerId) {
      return this.guild.roles.cache
    }

    const memberHighest = this.getHighestRole(member)
    return this.guild.roles.cache.filter(role =>
      role.position < memberHighest.position
    )
  }
}

// Usage
const hierarchyManager = new RoleHierarchyManager(interaction.guild)

if (!hierarchyManager.canManageUser(interaction.member, targetMember)) {
  await interaction.reply({
    content: 'You cannot manage this user due to role hierarchy.',
    ephemeral: true
  })
  return
}
```

## Slash Command Permissions

### Command-Level Permissions

```js
// Set default permissions for a command
const banCommand = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Ban a user')
  .setDefaultMemberPermissions('4') // BanMembers permission
  .addUserOption(option =>
    option.setName('user').setDescription('User to ban').setRequired(true)
  )
  .addStringOption(option =>
    option.setName('reason').setDescription('Ban reason').setRequired(false)
  )

// Guild-specific permission overrides
const guildCommandPermissions = [
  {
    id: banCommand.id,
    permissions: [
      {
        id: moderatorRoleId,
        type: 'ROLE',
        permission: true
      },
      {
        id: specificUserId,
        type: 'USER',
        permission: false // Deny for this specific user
      }
    ]
  }
]

// Apply permissions
await interaction.guild.commands.permissions.set({
  fullPermissions: guildCommandPermissions
})
```

### Dynamic Permission Checking

```js
async function checkCommandPermissions(interaction, commandName) {
  const command = await interaction.guild.commands.fetch()
    .then(commands => commands.find(cmd => cmd.name === commandName))

  if (!command) return false

  const permissions = await command.permissions.fetch()

  // Check if user has permission
  const userPermission = permissions.find(perm =>
    perm.id === interaction.user.id && perm.type === 'USER'
  )

  if (userPermission) {
    return userPermission.permission
  }

  // Check role permissions
  const memberRoles = interaction.member.roles.cache
  const rolePermission = permissions.find(perm =>
    memberRoles.has(perm.id) && perm.type === 'ROLE'
  )

  return rolePermission ? rolePermission.permission : false
}

// Usage
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const hasPermission = await checkCommandPermissions(interaction, interaction.commandName)

    if (!hasPermission) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true
      })
      return
    }

    // Proceed with command execution
  }
})
```

## Secure Admin Commands

### Admin Command Template

```js
class SecureAdminCommand {
  constructor(requiredPermissions = ['Administrator']) {
    this.requiredPermissions = requiredPermissions
  }

  async validateAccess(interaction) {
    // Check if command is being used in DM
    if (!interaction.guild) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true
      })
      return false
    }

    // Check bot permissions
    const botPermissions = interaction.guild.members.me.permissions
    const missingBotPerms = this.requiredPermissions.filter(perm =>
      !botPermissions.has(perm)
    )

    if (missingBotPerms.length > 0) {
      await interaction.reply({
        content: `I am missing the following permissions: ${missingBotPerms.join(', ')}`,
        ephemeral: true
      })
      return false
    }

    // Check user permissions
    const userPermissions = interaction.member.permissions
    const hasPermission = this.requiredPermissions.some(perm =>
      userPermissions.has(perm)
    )

    if (!hasPermission) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true
      })

      // Log unauthorized access attempt
      console.warn(`Unauthorized access attempt: ${interaction.user.tag} tried to use ${interaction.commandName}`)
      return false
    }

    return true
  }

  async executeSafe(interaction, executeFn) {
    if (!(await this.validateAccess(interaction))) {
      return
    }

    try {
      await executeFn(interaction)
    } catch (error) {
      console.error('Admin command error:', error)

      await interaction.reply({
        content: 'An error occurred while executing this command. Please try again later.',
        ephemeral: true
      })
    }
  }
}

// Usage
const adminCommand = new SecureAdminCommand(['Administrator'])

client.on('interactionCreate', async (interaction) => {
  if (interaction.commandName === 'admin-ban') {
    await adminCommand.executeSafe(interaction, async (interaction) => {
      const user = interaction.options.getUser('user')
      const reason = interaction.options.getString('reason')

      await interaction.guild.members.ban(user, { reason })
      await interaction.reply(`Successfully banned ${user.tag}`)
    })
  }
})
```

## Best Practices

### Permission Validation Order

```js
// Check permissions in order of cost/complexity
async function validateAccess(interaction) {
  // 1. Fast checks first
  if (!interaction.guild) return false

  // 2. Permission checks
  if (!interaction.member.permissions.has('ManageGuild')) {
    return false
  }

  // 3. Complex validation last
  const isValidContext = await validateContext(interaction)
  return isValidContext
}
```

### Permission Error Messages

```js
const permissionErrors = {
  'BanMembers': 'You need the "Ban Members" permission to use this command.',
  'Administrator': 'This command requires administrator privileges.',
  'ManageMessages': 'You need the "Manage Messages" permission to use this command.'
}

function getPermissionError(permission) {
  return permissionErrors[permission] || `You need the "${permission}" permission to use this command.`
}

// Usage
if (!member.permissions.has(requiredPermission)) {
  await interaction.reply({
    content: getPermissionError(requiredPermission),
    ephemeral: true
  })
}
```

### Audit Logging

```js
async function logPermissionUse(interaction, action, target = null) {
  const logEntry = {
    timestamp: new Date(),
    user: interaction.user.id,
    action: action,
    command: interaction.commandName,
    channel: interaction.channel.id,
    guild: interaction.guild.id
  }

  if (target) {
    logEntry.target = target.id
    logEntry.targetType = target.constructor.name
  }

  // Save to database or log file
  await saveAuditLog(logEntry)
}

// Usage
client.on('interactionCreate', async (interaction) => {
  if (interaction.commandName === 'ban') {
    const target = interaction.options.getUser('user')

    // Log before action
    await logPermissionUse(interaction, 'ban', target)

    // Perform action
    await interaction.guild.members.ban(target)
  }
})
```

## Next Steps

- [Permission Flags](/permissions/permission-flags) - Detailed permission flag reference
- [Role Hierarchy](/permissions/role-hierarchy) - Understanding role positioning
- [Slash Command Permissions](/permissions/slash-command-permissions) - Command-level access control