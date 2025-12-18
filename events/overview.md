# Events Overview

Discord.js event system for handling real-time updates and user interactions. This section covers event architecture, handling patterns, and scaling strategies.

## Event Types

### Client Events
- **Ready**: Bot logged in and ready
- **MessageCreate**: New message received
- **InteractionCreate**: Slash command or component interaction
- **GuildMemberAdd**: User joins server
- **GuildMemberRemove**: User leaves server

### Voice Events
- **VoiceStateUpdate**: Voice channel changes
- **VoiceChannelJoin**: User joins voice channel
- **VoiceChannelLeave**: User leaves voice channel

### Guild Events
- **GuildCreate**: Bot added to server
- **GuildDelete**: Bot removed from server
- **RoleCreate/Update/Delete**: Role changes

## Event Handling Patterns

### Basic Event Listener

```js
client.on('messageCreate', async (message) => {
  if (message.author.bot) return

  console.log(`Message from ${message.author.tag}: ${message.content}`)
})
```

### Async Event Handling

```js
client.on('guildMemberAdd', async (member) => {
  try {
    const channel = member.guild.systemChannel
    if (channel) {
      await channel.send(`Welcome ${member.user.tag}!`)
    }
  } catch (error) {
    console.error('Welcome message error:', error)
  }
})
```

### Conditional Event Processing

```js
client.on('messageCreate', async (message) => {
  // Skip bots and DMs
  if (message.author.bot || !message.guild) return

  // Only process commands
  if (!message.content.startsWith('!')) return

  // Process command
  await handleCommand(message)
})
```

## Event Handler Organization

### Modular Event Handlers

```js
// events/ready.js
export async function execute(client) {
  console.log(`Logged in as ${client.user.tag}`)
  console.log(`Serving ${client.guilds.cache.size} servers`)
}

// events/messageCreate.js
export async function execute(message) {
  if (message.author.bot || !message.guild) return

  // Handle message
}

// events/interactionCreate.js
export async function execute(interaction) {
  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(interaction)
  } else if (interaction.isButton()) {
    await handleButton(interaction)
  }
}
```

### Event Loader

```js
import { readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function loadEvents(client) {
  const eventsPath = join(__dirname, 'events')
  const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'))

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file)
    const event = await import(filePath)

    const eventName = file.split('.')[0]

    if (event.once) {
      client.once(eventName, (...args) => event.execute(...args))
    } else {
      client.on(eventName, (...args) => event.execute(...args))
    }

    console.log(`Loaded event: ${eventName}`)
  }
}
```

## Error Isolation

### Event-Specific Error Handling

```js
client.on('messageCreate', async (message) => {
  try {
    await handleMessage(message)
  } catch (error) {
    console.error('Message handling error:', error)
    // Don't crash the bot
  }
})

client.on('interactionCreate', async (interaction) => {
  try {
    await handleInteraction(interaction)
  } catch (error) {
    console.error('Interaction error:', error)

    if (!interaction.replied) {
      await interaction.reply({
        content: 'An error occurred.',
        ephemeral: true
      }).catch(() => {})
    }
  }
})
```

### Global Error Handler

```js
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
  process.exit(1)
})

client.on('error', (error) => {
  console.error('Client error:', error)
})

client.on('warn', (warning) => {
  console.warn('Client warning:', warning)
})
```

## Custom Events

### Internal Event System

```js
class EventEmitter {
  constructor() {
    this.events = new Map()
  }

  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event).push(listener)
  }

  emit(event, ...args) {
    const listeners = this.events.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args)
        } catch (error) {
          console.error(`Event listener error for ${event}:`, error)
        }
      })
    }
  }

  removeListener(event, listener) {
    const listeners = this.events.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }
}

export const customEvents = new EventEmitter()

// Usage
customEvents.on('userAction', (userId, action) => {
  console.log(`User ${userId} performed ${action}`)
})

// Emit custom events
client.on('messageCreate', (message) => {
  customEvents.emit('userAction', message.author.id, 'message')
})
```

## Performance Optimization

### Event Filtering

```js
// Filter events early to reduce processing
client.on('messageCreate', (message) => {
  // Fast checks first
  if (message.author.bot) return
  if (!message.guild) return
  if (!message.content.startsWith('!')) return

  // Process command
  handleCommand(message)
})
```

### Debouncing Events

```js
class EventDebouncer {
  constructor(delay = 1000) {
    this.delay = delay
    this.timeouts = new Map()
  }

  debounce(eventKey, callback) {
    const existing = this.timeouts.get(eventKey)

    if (existing) {
      clearTimeout(existing)
    }

    const timeout = setTimeout(() => {
      this.timeouts.delete(eventKey)
      callback()
    }, this.delay)

    this.timeouts.set(eventKey, timeout)
  }
}

const debouncer = new EventDebouncer()

client.on('guildMemberUpdate', (oldMember, newMember) => {
  debouncer.debounce(`member_${newMember.id}`, () => {
    handleMemberUpdate(oldMember, newMember)
  })
})
```

## Best Practices

### Event Handler Structure

```js
// Good: Separate concerns
client.on('ready', handleReady)
client.on('messageCreate', handleMessage)
client.on('interactionCreate', handleInteraction)

// Bad: Large inline handlers
client.on('messageCreate', async (message) => {
  // 100+ lines of code
})
```

### Resource Management

```js
// Clean up event listeners
function setupTemporaryListener(client, event, handler, duration = 60000) {
  const listener = (...args) => {
    handler(...args)
    client.removeListener(event, listener)
  }

  client.on(event, listener)

  setTimeout(() => {
    client.removeListener(event, listener)
  }, duration)
}
```

### Monitoring

```js
const eventMetrics = new Map()

client.on('raw', (packet) => {
  const count = eventMetrics.get(packet.t) || 0
  eventMetrics.set(packet.t, count + 1)
})

// Log metrics periodically
setInterval(() => {
  console.log('Event metrics:', Object.fromEntries(eventMetrics))
  eventMetrics.clear()
}, 60000)
```

## Best Practices

### Event Handler Structure

```js
// Good: Separate concerns
client.on('ready', handleReady)
client.on('messageCreate', handleMessage)
client.on('interactionCreate', handleInteraction)

// Bad: Large inline handlers
client.on('messageCreate', async (message) => {
  // 100+ lines of code
})
```

### Resource Management

```js
// Clean up event listeners
function setupTemporaryListener(client, event, handler, duration = 60000) {
  const listener = (...args) => {
    handler(...args)
    client.removeListener(event, listener)
  }

  client.on(event, listener)

  setTimeout(() => {
    client.removeListener(event, listener)
  }, duration)
}
```

### Monitoring

```js
const eventMetrics = new Map()

client.on('raw', (packet) => {
  const count = eventMetrics.get(packet.t) || 0
  eventMetrics.set(packet.t, count + 1)
})

// Log metrics periodically
setInterval(() => {
  console.log('Event metrics:', Object.fromEntries(eventMetrics))
  eventMetrics.clear()
}, 60000)
```