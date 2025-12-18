# Slash Command Permissions

Configure access control for slash commands at the guild and user level.

## Command Permission Types

### Default Permissions

Set base permissions that apply to all guilds:

```js
const command = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Ban a user')
  .setDefaultMemberPermissions('4') // BanMembers permission
```

### Guild-Specific Permissions

Override default permissions per guild:

```js
const guildPermissions = [
  {
    id: commandId,
    permissions: [
      {
        id: moderatorRoleId,
        type: 'ROLE',
        permission: true
      },
      {
        id: specificUserId,
        type: 'USER',
        permission: false // Deny for this user
      }
    ]
  }
]

await guild.commands.permissions.set({
  fullPermissions: guildPermissions
})
```

## Permission Checking

### Client-Side Validation

```js
async function validateCommandPermissions(interaction) {
  const command = interaction.commandName
  const member = interaction.member

  // Check default permissions
  const defaultPerms = getCommandDefaultPermissions(command)
  if (defaultPerms && !member.permissions.has(defaultPerms)) {
    return false
  }

  // Check guild overrides
  const guildPerms = await interaction.guild.commands.permissions.fetch()
  const commandPerms = guildPerms.find(perm => perm.command.name === command)

  if (commandPerms) {
    // Check user-specific permissions
    const userPerm = commandPerms.permissions.find(p =>
      p.id === interaction.user.id && p.type === 'USER'
    )

    if (userPerm) {
      return userPerm.permission
    }

    // Check role permissions
    const rolePerm = commandPerms.permissions.find(p =>
      member.roles.cache.has(p.id) && p.type === 'ROLE'
    )

    if (rolePerm) {
      return rolePerm.permission
    }
  }

  return true
}
```

### Permission Manager Class

```js
class CommandPermissionManager {
  constructor(client) {
    this.client = client
    this.permissions = new Map()
  }

  setDefaultPermissions(commandName, permissions) {
    this.permissions.set(commandName, {
      default: permissions,
      overrides: new Map()
    })
  }

  setGuildOverride(guildId, commandName, permissions) {
    if (!this.permissions.has(commandName)) {
      this.setDefaultPermissions(commandName, [])
    }

    this.permissions.get(commandName).overrides.set(guildId, permissions)
  }

  async checkPermissions(interaction) {
    const commandName = interaction.commandName
    const guildId = interaction.guild.id
    const member = interaction.member

    // Get permission config
    const config = this.permissions.get(commandName)
    if (!config) return true // No restrictions

    // Check default permissions
    if (config.default.length > 0 && !member.permissions.has(config.default)) {
      return false
    }

    // Check guild overrides
    const overrides = config.overrides.get(guildId)
    if (overrides) {
      return this.evaluateOverrides(member, overrides)
    }

    return true
  }

  evaluateOverrides(member, overrides) {
    // User-specific permissions take precedence
    const userOverride = overrides.find(o =>
      o.id === member.id && o.type === 'USER'
    )

    if (userOverride) {
      return userOverride.permission
    }

    // Check role permissions
    const roleOverride = overrides.find(o =>
      member.roles.cache.has(o.id) && o.type === 'ROLE'
    )

    return roleOverride ? roleOverride.permission : true
  }

  async syncGuildPermissions(guild) {
    const fullPermissions = []

    for (const [commandName, config] of this.permissions) {
      const command = guild.commands.cache.find(cmd => cmd.name === commandName)
      if (!command) continue

      const overrides = config.overrides.get(guild.id) || []

      fullPermissions.push({
        id: command.id,
        permissions: overrides
      })
    }

    if (fullPermissions.length > 0) {
      await guild.commands.permissions.set({ fullPermissions })
    }
  }
}
```

## Permission Application

### Command Registration with Permissions

```js
const permissionManager = new CommandPermissionManager(client)

// Set default permissions
permissionManager.setDefaultPermissions('ban', ['BanMembers'])
permissionManager.setDefaultPermissions('kick', ['KickMembers'])
permissionManager.setDefaultPermissions('admin', ['Administrator'])

// Set guild-specific overrides
permissionManager.setGuildOverride('guild_id', 'ban', [
  { id: 'moderator_role_id', type: 'ROLE', permission: true },
  { id: 'specific_user_id', type: 'USER', permission: false }
])

// Apply permissions when registering commands
client.on('ready', async () => {
  for (const guild of client.guilds.cache.values()) {
    await permissionManager.syncGuildPermissions(guild)
  }
})
```

### Runtime Permission Checking

```js
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  // Check permissions
  const hasPermission = await permissionManager.checkPermissions(interaction)

  if (!hasPermission) {
    await interaction.reply({
      content: 'You do not have permission to use this command.',
      ephemeral: true
    })
    return
  }

  // Execute command
  await executeCommand(interaction)
})
```

## Permission Inheritance

### Role-Based Inheritance

```js
function calculateInheritedPermissions(member) {
  const permissions = new PermissionsBitField()

  // Add permissions from all roles
  member.roles.cache.forEach(role => {
    permissions.add(role.permissions)
  })

  return permissions
}

// Check if member has permission through any role
function hasInheritedPermission(member, permission) {
  return calculateInheritedPermissions(member).has(permission)
}
```

### Permission Caching

```js
class PermissionCache {
  constructor(ttl = 300000) { // 5 minutes
    this.cache = new Map()
    this.ttl = ttl
  }

  set(userId, guildId, permissions) {
    const key = `${userId}:${guildId}`
    this.cache.set(key, {
      permissions,
      timestamp: Date.now()
    })
  }

  get(userId, guildId) {
    const key = `${userId}:${guildId}`
    const entry = this.cache.get(key)

    if (!entry) return null

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.permissions
  }

  invalidate(userId, guildId) {
    const key = `${userId}:${guildId}`
    this.cache.delete(key)
  }
}

const permissionCache = new PermissionCache()
```

## Best Practices

### Permission Levels

```js
const permissionLevels = {
  USER: 0,
  MODERATOR: 1,
  ADMIN: 2,
  OWNER: 3
}

function getPermissionLevel(member) {
  if (member.id === member.guild.ownerId) return permissionLevels.OWNER
  if (member.permissions.has('Administrator')) return permissionLevels.ADMIN
  if (member.permissions.has(['KickMembers', 'BanMembers'])) return permissionLevels.MODERATOR
  return permissionLevels.USER
}

function requiresLevel(command, level) {
  return getPermissionLevel(command.member) >= level
}
```

### Clear Permission Messages

```js
const permissionMessages = {
  'BanMembers': 'You need the "Ban Members" permission to use this command.',
  'Administrator': 'This command requires administrator privileges.',
  'ManageMessages': 'You need the "Manage Messages" permission.'
}

async function sendPermissionError(interaction, permission) {
  const message = permissionMessages[permission] ||
    `You need the "${permission}" permission to use this command.`

  await interaction.reply({
    content: message,
    ephemeral: true
  })
}
```

## Next Steps

- [Secure Admin Commands](/permissions/secure-admin-commands) - Safe administrative operations