# Secure Admin Commands

Implement safe administrative commands with proper validation, logging, and error handling.

## Admin Command Principles

### Security First
- Validate all inputs
- Check permissions thoroughly
- Log all admin actions
- Provide clear error messages
- Implement rate limiting

### User Safety
- Confirm destructive actions
- Provide undo options when possible
- Show impact before execution
- Handle errors gracefully

## Admin Command Template

### Base Admin Command Class

```js
class AdminCommand {
  constructor(options = {}) {
    this.name = options.name
    this.description = options.description
    this.requiredPermissions = options.requiredPermissions || ['Administrator']
    this.cooldown = options.cooldown || 5000 // 5 seconds
    this.confirmRequired = options.confirmRequired || false
  }

  async validateAccess(interaction) {
    // Check if in guild
    if (!interaction.guild) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true
      })
      return false
    }

    // Check bot permissions
    const botMember = interaction.guild.members.me
    const missingBotPerms = this.requiredPermissions.filter(perm =>
      !botMember.permissions.has(perm)
    )

    if (missingBotPerms.length > 0) {
      await interaction.reply({
        content: `I am missing required permissions: ${missingBotPerms.join(', ')}`,
        ephemeral: true
      })
      return false
    }

    // Check user permissions
    const hasPermission = this.requiredPermissions.some(perm =>
      interaction.member.permissions.has(perm)
    )

    if (!hasPermission) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true
      })
      return false
    }

    return true
  }

  async execute(interaction) {
    throw new Error('execute() must be implemented by subclass')
  }

  async run(interaction) {
    if (!(await this.validateAccess(interaction))) {
      return
    }

    try {
      await this.execute(interaction)
    } catch (error) {
      console.error(`Admin command ${this.name} error:`, error)
      await this.handleError(interaction, error)
    }
  }

  async handleError(interaction, error) {
    await interaction.reply({
      content: 'An error occurred while executing this command.',
      ephemeral: true
    })
  }
}
```

### Ban Command Implementation

```js
class BanCommand extends AdminCommand {
  constructor() {
    super({
      name: 'ban',
      description: 'Ban a user from the server',
      requiredPermissions: ['BanMembers'],
      confirmRequired: true
    })
  }

  async execute(interaction) {
    const target = interaction.options.getUser('user')
    const reason = interaction.options.getString('reason') || 'No reason provided'
    const deleteDays = interaction.options.getInteger('delete_messages') || 0

    // Get target member
    const targetMember = interaction.guild.members.cache.get(target.id)

    // Validate target
    if (!targetMember) {
      await interaction.reply({
        content: 'User is not in this server.',
        ephemeral: true
      })
      return
    }

    // Check hierarchy
    if (!canManageMember(interaction.member, targetMember)) {
      await interaction.reply({
        content: 'You cannot ban this user due to role hierarchy.',
        ephemeral: true
      })
      return
    }

    // Confirmation for destructive action
    if (this.confirmRequired) {
      const confirmEmbed = new EmbedBuilder()
        .setTitle('Confirm Ban')
        .setDescription(`Are you sure you want to ban ${target.tag}?`)
        .addFields(
          { name: 'Reason', value: reason, inline: true },
          { name: 'Delete Messages', value: `${deleteDays} days`, inline: true }
        )
        .setColor('Red')

      const confirmButton = new ButtonBuilder()
        .setCustomId(`confirm_ban_${target.id}_${Date.now()}`)
        .setLabel('Confirm Ban')
        .setStyle(ButtonStyle.Danger)

      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_ban')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)

      await interaction.reply({
        embeds: [confirmEmbed],
        components: [new ActionRowBuilder().addComponents(confirmButton, cancelButton)],
        ephemeral: true
      })

      return
    }

    // Execute ban
    await this.performBan(interaction, target, reason, deleteDays)
  }

  async performBan(interaction, target, reason, deleteDays) {
    try {
      await interaction.guild.members.ban(target, {
        reason: reason,
        deleteMessageDays: deleteDays
      })

      // Log the action
      await logAdminAction(interaction, 'ban', target, { reason, deleteDays })

      await interaction.reply(`Successfully banned ${target.tag}`)
    } catch (error) {
      console.error('Ban error:', error)
      await interaction.reply({
        content: 'Failed to ban the user.',
        ephemeral: true
      })
    }
  }
}
```

## Command Registration

### Secure Command Registration

```js
const adminCommands = new Map()

function registerAdminCommand(commandClass) {
  const instance = new commandClass()
  adminCommands.set(instance.name, instance)
}

// Register commands
registerAdminCommand(BanCommand)
registerAdminCommand(KickCommand)
registerAdminCommand(MuteCommand)

// Handle interactions
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = adminCommands.get(interaction.commandName)

    if (command) {
      await command.run(interaction)
    }
  }

  // Handle confirmations
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('confirm_ban_')) {
      const [, , targetId, timestamp] = interaction.customId.split('_')

      // Validate timestamp (prevent old confirmations)
      const age = Date.now() - parseInt(timestamp)
      if (age > 300000) { // 5 minutes
        await interaction.reply({
          content: 'Confirmation expired.',
          ephemeral: true
        })
        return
      }

      const target = await client.users.fetch(targetId)
      const banCommand = adminCommands.get('ban')

      await banCommand.performBan(interaction, target, 'Confirmed ban', 0)
    }
  }
})
```

## Audit Logging

### Comprehensive Logging

```js
class AdminAuditLogger {
  constructor() {
    this.logs = []
    this.maxLogs = 1000
  }

  async logAction(interaction, action, target, details = {}) {
    const logEntry = {
      timestamp: new Date(),
      guildId: interaction.guild.id,
      userId: interaction.user.id,
      username: interaction.user.tag,
      action: action,
      targetId: target.id,
      targetType: target.constructor.name,
      targetName: target.tag || target.name || target.username,
      details: details,
      channelId: interaction.channel.id
    }

    this.logs.push(logEntry)

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Save to database/file
    await this.persistLog(logEntry)

    // Send to admin log channel if configured
    await this.sendToLogChannel(interaction.guild, logEntry)
  }

  async persistLog(logEntry) {
    // Save to database or file
    console.log('Admin action logged:', logEntry)
  }

  async sendToLogChannel(guild, logEntry) {
    const logChannelId = await getGuildLogChannel(guild.id)
    if (!logChannelId) return

    const logChannel = guild.channels.cache.get(logChannelId)
    if (!logChannel) return

    const embed = new EmbedBuilder()
      .setTitle('Admin Action Logged')
      .addFields(
        { name: 'Action', value: logEntry.action, inline: true },
        { name: 'Moderator', value: `<@${logEntry.userId}>`, inline: true },
        { name: 'Target', value: logEntry.targetName, inline: true },
        { name: 'Details', value: JSON.stringify(logEntry.details, null, 2), inline: false }
      )
      .setTimestamp(logEntry.timestamp)
      .setColor('Orange')

    await logChannel.send({ embeds: [embed] })
  }

  getLogs(guildId, limit = 50) {
    return this.logs
      .filter(log => log.guildId === guildId)
      .slice(-limit)
  }
}

const auditLogger = new AdminAuditLogger()
```

## Rate Limiting

### Admin Action Rate Limiting

```js
class AdminRateLimiter {
  constructor() {
    this.actions = new Map()
    this.limits = {
      ban: { max: 5, window: 600000 },     // 5 bans per 10 minutes
      kick: { max: 10, window: 600000 },   // 10 kicks per 10 minutes
      mute: { max: 15, window: 600000 },   // 15 mutes per 10 minutes
      purge: { max: 3, window: 300000 }    // 3 purges per 5 minutes
    }
  }

  checkLimit(userId, action) {
    const limit = this.limits[action]
    if (!limit) return true // No limit for this action

    const key = `${userId}:${action}`
    const now = Date.now()
    const userActions = this.actions.get(key) || []

    // Remove old actions outside the window
    const recentActions = userActions.filter(time =>
      now - time < limit.window
    )

    if (recentActions.length >= limit.max) {
      return false // Rate limited
    }

    recentActions.push(now)
    this.actions.set(key, recentActions)

    return true
  }

  getRemainingTime(userId, action) {
    const limit = this.limits[action]
    if (!limit) return 0

    const key = `${userId}:${action}`
    const userActions = this.actions.get(key) || []

    if (userActions.length < limit.max) return 0

    const oldestAction = Math.min(...userActions)
    const timeUntilReset = limit.window - (Date.now() - oldestAction)

    return Math.max(0, timeUntilReset)
  }
}

const rateLimiter = new AdminRateLimiter()

// Integration with commands
class RateLimitedAdminCommand extends AdminCommand {
  async validateAccess(interaction) {
    if (!(await super.validateAccess(interaction))) {
      return false
    }

    if (!rateLimiter.checkLimit(interaction.user.id, this.name)) {
      const remainingTime = rateLimiter.getRemainingTime(interaction.user.id, this.name)
      const minutes = Math.ceil(remainingTime / 60000)

      await interaction.reply({
        content: `Rate limited. Try again in ${minutes} minute(s).`,
        ephemeral: true
      })
      return false
    }

    return true
  }
}
```

## Best Practices

### Confirmation Patterns

```js
// Always confirm destructive actions
async function confirmAction(interaction, action, target, details) {
  const embed = new EmbedBuilder()
    .setTitle(`Confirm ${action}`)
    .setDescription(`Are you sure you want to ${action.toLowerCase()} ${target}?`)
    .addFields(
      Object.entries(details).map(([key, value]) => ({
        name: key,
        value: String(value),
        inline: true
      }))
    )
    .setColor('Red')

  const confirmId = `confirm_${action.toLowerCase()}_${Date.now()}`
  const cancelId = `cancel_${action.toLowerCase()}`

  const confirmButton = new ButtonBuilder()
    .setCustomId(confirmId)
    .setLabel(`Confirm ${action}`)
    .setStyle(ButtonStyle.Danger)

  const cancelButton = new ButtonBuilder()
    .setCustomId(cancelId)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary)

  await interaction.reply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(confirmButton, cancelButton)],
    ephemeral: true
  })

  // Store confirmation data
  confirmations.set(confirmId, { action, target, details, userId: interaction.user.id })
}
```

### Error Recovery

```js
// Provide recovery options for failed actions
async function handleAdminError(interaction, error, action, target) {
  const embed = new EmbedBuilder()
    .setTitle('Action Failed')
    .setDescription(`Failed to ${action} ${target}.`)
    .addFields(
      { name: 'Error', value: error.message, inline: false },
      { name: 'Target', value: target.toString(), inline: true },
      { name: 'Action', value: action, inline: true }
    )
    .setColor('Red')

  const retryButton = new ButtonBuilder()
    .setCustomId(`retry_${action}_${target.id}`)
    .setLabel('Retry')
    .setStyle(ButtonStyle.Primary)

  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel_retry')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary)

  await interaction.reply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(retryButton, cancelButton)],
    ephemeral: true
  })
}
```

## Next Steps

- [Events Overview](/events/overview) - Event handling architecture