# Role Hierarchy

Understanding Discord's role hierarchy system and its implications for permission management.

## Hierarchy Fundamentals

### Role Positioning

Roles are ordered by position (0-250), with higher positions having more authority:

- **Position 0**: @everyone role (base permissions)
- **Higher numbers**: More authority
- **Server Owner**: Always has full permissions

### Hierarchy Rules

1. **Higher roles can manage lower roles**
2. **Users inherit permissions from all their roles**
3. **Role position determines management ability**
4. **Server owner overrides all hierarchy**

## Position Calculation

### Role Position Comparison

```js
function compareRolePositions(role1, role2) {
  return role1.position - role2.position
}

// Higher position = more authority
function hasHigherRole(user, target) {
  const userHighest = getHighestRole(user)
  const targetHighest = getHighestRole(target)

  return userHighest.position > targetHighest.position
}

function getHighestRole(member) {
  return member.roles.cache.reduce((highest, role) =>
    role.position > highest.position ? role : highest
  )
}
```

### Management Permissions

```js
function canManageRole(member, role) {
  // Server owner can manage all roles
  if (member.id === member.guild.ownerId) {
    return true
  }

  const memberHighest = getHighestRole(member)
  return memberHighest.position > role.position
}

function canManageMember(manager, target) {
  // Can't manage server owner
  if (target.id === target.guild.ownerId) {
    return false
  }

  // Server owner can manage everyone
  if (manager.id === manager.guild.ownerId) {
    return true
  }

  const managerHighest = getHighestRole(manager)
  const targetHighest = getHighestRole(target)

  return managerHighest.position > targetHighest.position
}
```

## Hierarchy-Aware Operations

### Safe Role Assignment

```js
async function safeAssignRole(interaction, targetMember, role) {
  // Check hierarchy
  if (!canManageRole(interaction.member, role)) {
    await interaction.reply({
      content: 'You cannot assign this role due to role hierarchy.',
      ephemeral: true
    })
    return false
  }

  // Check if target has higher role
  if (!canManageMember(interaction.member, targetMember)) {
    await interaction.reply({
      content: 'You cannot modify this user due to role hierarchy.',
      ephemeral: true
    })
    return false
  }

  try {
    await targetMember.roles.add(role)
    await interaction.reply(`Successfully assigned ${role.name} to ${targetMember.user.tag}`)
    return true
  } catch (error) {
    await interaction.reply({
      content: 'Failed to assign role.',
      ephemeral: true
    })
    return false
  }
}
```

### Role Removal Safety

```js
async function safeRemoveRole(interaction, targetMember, role) {
  // Check hierarchy
  if (!canManageRole(interaction.member, role)) {
    await interaction.reply({
      content: 'You cannot remove this role due to role hierarchy.',
      ephemeral: true
    })
    return false
  }

  // Check if target has higher role
  if (!canManageMember(interaction.member, targetMember)) {
    await interaction.reply({
      content: 'You cannot modify this user due to role hierarchy.',
      ephemeral: true
    })
    return false
  }

  try {
    await targetMember.roles.remove(role)
    await interaction.reply(`Successfully removed ${role.name} from ${targetMember.user.tag}`)
    return true
  } catch (error) {
    await interaction.reply({
      content: 'Failed to remove role.',
      ephemeral: true
    })
    return false
  }
}
```

## Hierarchy Edge Cases

### @everyone Role

```js
// @everyone role is always position 0
function isEveryoneRole(role) {
  return role.name === '@everyone' || role.position === 0
}

// Special handling for @everyone permissions
function getEveryonePermissions(guild) {
  return guild.roles.everyone.permissions
}
```

### Managed Roles

```js
// Check if role is managed by integration/bot
function isManagedRole(role) {
  return role.managed || role.tags?.botId || role.tags?.integrationId
}

// Managed roles cannot be modified by users
async function safeModifyRole(interaction, role, modification) {
  if (isManagedRole(role)) {
    await interaction.reply({
      content: 'This role is managed by an integration and cannot be modified.',
      ephemeral: true
    })
    return false
  }

  // Check hierarchy
  if (!canManageRole(interaction.member, role)) {
    await interaction.reply({
      content: 'You cannot modify this role due to role hierarchy.',
      ephemeral: true
    })
    return false
  }

  // Proceed with modification
  await modification(role)
  return true
}
```

### Role Position Changes

```js
async function safeChangeRolePosition(interaction, role, newPosition) {
  // Check if user can manage the role
  if (!canManageRole(interaction.member, role)) {
    await interaction.reply({
      content: 'You cannot modify this role.',
      ephemeral: true
    })
    return false
  }

  // Validate new position
  if (newPosition < 0 || newPosition > 250) {
    await interaction.reply({
      content: 'Invalid role position.',
      ephemeral: true
    })
    return false
  }

  try {
    await role.setPosition(newPosition)
    await interaction.reply(`Role ${role.name} moved to position ${newPosition}`)
    return true
  } catch (error) {
    await interaction.reply({
      content: 'Failed to change role position.',
      ephemeral: true
    })
    return false
  }
}
```

## Hierarchy Visualization

### Role Tree Display

```js
function generateRoleTree(guild) {
  const roles = guild.roles.cache.sort((a, b) => b.position - a.position)

  let tree = '**Role Hierarchy:**\n'

  roles.forEach(role => {
    const indent = '  '.repeat(Math.max(0, 10 - role.position))
    const memberCount = role.members.size
    const permissions = role.permissions.toArray().length

    tree += `${indent}${role.name} (${memberCount} members, ${permissions} permissions)\n`
  })

  return tree
}

client.on('interactionCreate', async (interaction) => {
  if (interaction.commandName === 'role-tree') {
    const tree = generateRoleTree(interaction.guild)

    await interaction.reply({
      content: tree,
      ephemeral: true
    })
  }
})
```

## Best Practices

### Hierarchy Validation

```js
// Always check hierarchy before role operations
async function validateRoleOperation(interaction, operation, targetRole, targetMember = null) {
  const checks = []

  // Check role management permission
  checks.push(canManageRole(interaction.member, targetRole))

  // Check member management if applicable
  if (targetMember) {
    checks.push(canManageMember(interaction.member, targetMember))
  }

  // Check if role is managed
  checks.push(!isManagedRole(targetRole))

  if (!checks.every(check => check)) {
    await interaction.reply({
      content: 'You cannot perform this operation due to role hierarchy restrictions.',
      ephemeral: true
    })
    return false
  }

  return true
}
```

### Clear Error Messages

```js
const hierarchyErrors = {
  role_too_high: 'You cannot manage this role because it is above your highest role.',
  user_too_high: 'You cannot manage this user because they have a higher role than you.',
  managed_role: 'This role is managed by an integration and cannot be modified.',
  owner_protected: 'Server owners cannot be managed by other users.'
}

function getHierarchyError(reason) {
  return hierarchyErrors[reason] || 'Operation blocked by role hierarchy.'
}
```

### Audit Logging

```js
async function logHierarchyAction(interaction, action, target, details) {
  const logEntry = {
    timestamp: new Date(),
    user: interaction.user.id,
    action: action,
    target: {
      id: target.id,
      type: target.constructor.name
    },
    details: details,
    hierarchyCheck: {
      userHighestRole: getHighestRole(interaction.member).name,
      targetHighestRole: target.roles ? getHighestRole(target).name : 'N/A'
    }
  }

  // Save to audit log
  await saveAuditLog(interaction.guild.id, logEntry)
}
```

## Next Steps

- [Slash Command Permissions](/permissions/slash-command-permissions) - Command access control
- [Secure Admin Commands](/permissions/secure-admin-commands) - Safe admin operations