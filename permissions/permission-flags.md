# Permission Flags

Complete reference of Discord permission flags and their usage in Discord.js v14.25.1.

## General Permissions

| Flag | Value | Description |
|------|-------|-------------|
| `CreateInstantInvite` | 1 | Create instant invites |
| `KickMembers` | 2 | Kick members |
| `BanMembers` | 4 | Ban members |
| `Administrator` | 8 | Administrator |
| `ManageChannels` | 16 | Manage channels |
| `ManageGuild` | 32 | Manage server |
| `AddReactions` | 64 | Add reactions |
| `ViewAuditLog` | 128 | View audit log |
| `PrioritySpeaker` | 256 | Priority speaker |
| `Stream` | 512 | Video |
| `ViewChannel` | 1024 | View channels |
| `SendMessages` | 2048 | Send messages |
| `SendTTSMessages` | 4096 | Send TTS messages |
| `ManageMessages` | 8192 | Manage messages |
| `EmbedLinks` | 16384 | Embed links |
| `AttachFiles` | 32768 | Attach files |
| `ReadMessageHistory` | 65536 | Read message history |
| `MentionEveryone` | 131072 | Mention @everyone |
| `UseExternalEmojis` | 262144 | Use external emojis |
| `ViewGuildInsights` | 524288 | View server insights |

## Voice Permissions

| Flag | Value | Description |
|------|-------|-------------|
| `Connect` | 1048576 | Connect |
| `Speak` | 2097152 | Speak |
| `MuteMembers` | 4194304 | Mute members |
| `DeafenMembers` | 8388608 | Deafen members |
| `MoveMembers` | 16777216 | Move members |
| `UseVAD` | 33554432 | Use voice activity |

## Text Permissions

| Flag | Value | Description |
|------|-------|-------------|
| `ChangeNickname` | 67108864 | Change nickname |
| `ManageNicknames` | 134217728 | Manage nicknames |
| `ManageRoles` | 268435456 | Manage roles |
| `ManageWebhooks` | 536870912 | Manage webhooks |
| `ManageEmojisAndStickers` | 1073741824 | Manage emojis |
| `UseApplicationCommands` | 2147483648 | Use slash commands |
| `RequestToSpeak` | 4294967296 | Request to speak |
| `ManageEvents` | 8589934592 | Manage events |
| `ManageThreads` | 17179869184 | Manage threads |
| `CreatePublicThreads` | 34359738368 | Create public threads |
| `CreatePrivateThreads` | 68719476736 | Create private threads |
| `UseExternalStickers` | 137438953472 | Use external stickers |
| `SendMessagesInThreads` | 274877906944 | Send in threads |
| `UseEmbeddedActivities` | 549755813888 | Use activities |
| `ModerateMembers` | 1099511627776 | Moderate members |

## Permission Checking

### Basic Permission Check

```js
const hasPermission = member.permissions.has('BanMembers')

// Check multiple permissions
const hasAllPermissions = member.permissions.has(['BanMembers', 'KickMembers'])

// Check any permission
const hasAnyPermission = ['BanMembers', 'KickMembers'].some(perm =>
  member.permissions.has(perm)
)
```

### Bitwise Operations

```js
// Add permissions
const newPermissions = oldPermissions.add('BanMembers')

// Remove permissions
const reducedPermissions = oldPermissions.remove('KickMembers')

// Check exact permissions
const hasExactPermissions = permissions.equals(['SendMessages', 'ReadMessageHistory'])
```

### Permission Serialization

```js
// To array
const permissionArray = permissions.toArray()

// To bitfield
const bitfield = permissions.bitfield

// From array
const fromArray = new PermissionsBitField(['SendMessages', 'ReadMessageHistory'])
```

## Common Permission Patterns

### Moderation Permissions

```js
const moderationPermissions = [
  'KickMembers',
  'BanMembers',
  'ManageMessages',
  'ModerateMembers',
  'ManageNicknames'
]

function hasModerationPermissions(member) {
  return moderationPermissions.some(perm => member.permissions.has(perm))
}
```

### Administrative Permissions

```js
const adminPermissions = [
  'Administrator',
  'ManageGuild',
  'ManageChannels',
  'ManageRoles'
]

function hasAdminPermissions(member) {
  return member.permissions.has('Administrator') ||
         adminPermissions.some(perm => member.permissions.has(perm))
}
```

### Voice Permissions

```js
const voicePermissions = [
  'Connect',
  'Speak',
  'MuteMembers',
  'DeafenMembers',
  'MoveMembers'
]

function hasVoicePermissions(member) {
  return voicePermissions.every(perm => member.permissions.has(perm))
}
```

## Permission Overrides

### Channel Overrides

```js
// Check permissions in specific channel
const channelPermissions = channel.permissionsFor(member)

// Override check
if (channelPermissions.has('SendMessages')) {
  // Can send in this channel despite role restrictions
}
```

### Role Permission Calculation

```js
function calculateEffectivePermissions(member) {
  let permissions = new PermissionsBitField()

  // Add permissions from all roles
  member.roles.cache.forEach(role => {
    permissions = permissions.add(role.permissions)
  })

  // Apply channel overrides
  // (Complex logic for allow/deny overrides)

  return permissions
}
```

## Permission Validation

### Input Validation

```js
function validatePermissionInput(input) {
  const validPermissions = Object.keys(PermissionsBitField.Flags)

  if (!validPermissions.includes(input)) {
    throw new Error(`Invalid permission: ${input}`)
  }

  return input
}
```

### Permission Requirements

```js
const commandRequirements = {
  ban: ['BanMembers'],
  kick: ['KickMembers'],
  mute: ['ModerateMembers'],
  manage: ['ManageGuild']
}

function validateCommandAccess(interaction, commandName) {
  const requirements = commandRequirements[commandName]
  if (!requirements) return true

  return interaction.member.permissions.has(requirements)
}
```

## Permission Best Practices

### Least Privilege Principle

```js
// Grant minimum required permissions
const rolePermissions = new PermissionsBitField([
  'SendMessages',
  'ReadMessageHistory',
  'UseExternalEmojis'
  // Don't add unnecessary permissions
])
```

### Permission Checking Order

```js
// Check simple permissions first
function checkAccess(interaction) {
  // 1. Basic permission check
  if (!interaction.member.permissions.has('SendMessages')) {
    return false
  }

  // 2. Channel-specific check
  const channelPerms = interaction.channel.permissionsFor(interaction.member)
  if (!channelPerms.has('SendMessages')) {
    return false
  }

  // 3. Complex validation last
  return validateComplexCondition(interaction)
}
```

### Error Handling

```js
try {
  if (!member.permissions.has(requiredPermission)) {
    throw new PermissionError(`Missing ${requiredPermission}`)
  }
} catch (error) {
  if (error instanceof PermissionError) {
    await interaction.reply({
      content: error.message,
      ephemeral: true
    })
  }
}
```

## Next Steps

- [Role Hierarchy](/permissions/role-hierarchy) - Understanding role positioning
- [Slash Command Permissions](/permissions/slash-command-permissions) - Command access control