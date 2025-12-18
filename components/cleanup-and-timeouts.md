# Cleanup and Timeouts

Proper component cleanup prevents memory leaks and ensures responsive interactions. This page covers managing component lifecycles and implementing effective cleanup strategies.

## Component Lifecycle Management

### Component States
- **Active**: Component is displayed and functional
- **Expired**: Component has reached its time limit
- **Disabled**: Component is no longer interactive
- **Cleaned**: Component has been removed from memory

### Cleanup Triggers
- **Time-based**: Automatic expiration
- **User Action**: Manual component removal
- **Error Conditions**: Cleanup after failures
- **System Events**: Guild leave, bot restart

## Automatic Cleanup System

### Component Registry

```js
class ComponentRegistry {
  constructor() {
    this.components = new Map()
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  register(interaction, componentData, ttl = 30 * 60 * 1000) {
    const componentId = {
      messageId: interaction.message?.id,
      customId: componentData.customId,
      userId: interaction.user.id
    }

    const registration = {
      ...componentId,
      registeredAt: Date.now(),
      expiresAt: Date.now() + ttl,
      data: componentData,
      ttl
    }

    this.components.set(`${componentId.customId}:${componentId.userId}`, registration)
    return registration
  }

  get(customId, userId) {
    const key = `${customId}:${userId}`
    const component = this.components.get(key)

    if (!component) return null

    if (Date.now() > component.expiresAt) {
      this.components.delete(key)
      return null
    }

    return component
  }

  updateExpiration(customId, userId, newTtl) {
    const key = `${customId}:${userId}`
    const component = this.components.get(key)

    if (component) {
      component.expiresAt = Date.now() + newTtl
      return true
    }

    return false
  }

  remove(customId, userId) {
    const key = `${customId}:${userId}`
    return this.components.delete(key)
  }

  cleanup() {
    const now = Date.now()
    const toRemove = []

    for (const [key, component] of this.components) {
      if (now > component.expiresAt) {
        toRemove.push(key)
      }
    }

    toRemove.forEach(key => this.components.delete(key))
    return toRemove.length
  }

  getStats() {
    return {
      totalComponents: this.components.size,
      expiredCount: this.cleanup()
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.components.clear()
  }
}

const componentRegistry = new ComponentRegistry()
process.on('SIGINT', () => {
  componentRegistry.destroy()
  process.exit(0)
})
```

## Timeout Management

### Component Timeout Handler

```js
class ComponentTimeoutManager {
  constructor(componentRegistry) {
    this.registry = componentRegistry
    this.timeouts = new Map()
  }

  setTimeout(interaction, timeoutMs = 2500, callback) {
    const key = `${interaction.customId}:${interaction.user.id}`

    this.clearTimeout(key)

    const timeoutId = setTimeout(async () => {
      try {
        if (callback) {
          await callback()
        } else {
          await this.handleTimeout(interaction)
        }
      } catch (error) {
        console.error('Timeout callback error:', error)
      }

      this.registry.remove(interaction.customId, interaction.user.id)
      this.timeouts.delete(key)
    }, timeoutMs)

    this.timeouts.set(key, timeoutId)
    return timeoutId
  }

  clearTimeout(customId, userId) {
    const key = `${customId}:${userId}`
    const timeoutId = this.timeouts.get(key)

    if (timeoutId) {
      clearTimeout(timeoutId)
      this.timeouts.delete(key)
      return true
    }

    return false
  }

  async handleTimeout(interaction) {
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: 'This interaction timed out. Please try again.',
          ephemeral: true
        })
      } catch (error) {
        console.error('Failed to send timeout message:', error)
      }
    }
  }

  clearUserTimeouts(userId) {
    const toClear = []
    for (const [key, timeoutId] of this.timeouts) {
      if (key.endsWith(`:${userId}`)) {
        clearTimeout(timeoutId)
        toClear.push(key)
      }
    }

    toClear.forEach(key => this.timeouts.delete(key))
    return toClear.length
  }
}
```

## Interactive Component Cleanup

### Message Update Cleanup

```js
async function updateComponentWithCleanup(interaction, newComponents, reason = 'completed') {
  try {
    await interaction.update({
      content: interaction.message.content,
      embeds: interaction.message.embeds,
      components: newComponents
    })

    if (!newComponents || newComponents.length === 0) {
      componentRegistry.remove(interaction.customId, interaction.user.id)
      timeoutManager.clearTimeout(interaction.customId, interaction.user.id)
    }

    console.log(`Component ${interaction.customId} ${reason} for user ${interaction.user.id}`)
  } catch (error) {
    console.error('Failed to update component:', error)

    componentRegistry.remove(interaction.customId, interaction.user.id)
    timeoutManager.clearTimeout(interaction.customId, interaction.user.id)
  }
}
```

## Memory Leak Prevention

### State Size Monitoring

```js
class MemoryMonitor {
  constructor() {
    this.checkInterval = setInterval(() => this.checkMemory(), 10 * 60 * 1000)
    this.lastStats = null
  }

  checkMemory() {
    const stats = {
      componentCount: componentRegistry.components.size,
      timeoutCount: timeoutManager.timeouts.size,
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now()
    }

    if (this.lastStats) {
      const componentGrowth = stats.componentCount - this.lastStats.componentCount
      const memoryGrowth = stats.memoryUsage.heapUsed - this.lastStats.memoryUsage.heapUsed

      if (componentGrowth > 100) {
        console.warn(`Large component growth detected: +${componentGrowth}`)
      }

      if (memoryGrowth > 50 * 1024 * 1024) {
        console.warn(`Large memory growth detected: +${Math.round(memoryGrowth / 1024 / 1024)}MB`)
        this.forceCleanup()
      }
    }

    this.lastStats = stats
  }

  forceCleanup() {
    console.log('Forcing emergency cleanup...')
    const cleaned = componentRegistry.cleanup()
    console.log(`Emergency cleanup removed ${cleaned} components`)

    if (global.gc) {
      global.gc()
      console.log('Forced garbage collection')
    }
  }

  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
  }
}
```

## Best Practices

### Appropriate Timeouts
```js
const timeoutDurations = {
  quick_action: 5000,
  form_input: 300000,
  complex_workflow: 1800000
}
```

### Cleanup Triggers
```js
const cleanupTriggers = [
  'interaction_timeout',
  'user_completed_action',
  'error_occurred',
  'guild_member_left'
]
```

### Monitoring and Alerts
```js
const monitoringAlerts = {
  highComponentCount: (count) => count > 1000,
  memoryUsageSpike: (usage) => usage.heapUsed > 200 * 1024 * 1024,
  cleanupFailureRate: (rate) => rate > 0.1
}
```

## Next Steps

- [Collectors Overview](/collectors/overview) - Advanced interaction collection patterns