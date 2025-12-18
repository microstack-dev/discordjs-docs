# Client Lifecycle

Understanding the Discord.js client lifecycle is essential for building reliable bots.

## Client Initialization

The `Client` is the main entry point for your bot:
```js
import { Client, GatewayIntentBits } from 'discord.js'

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})
```

### Client Options

Key options for client initialization:
- `intents`: Gateway events your bot receives
- `presence`: Bot's status and activity
- `shardCount`: Number of shards for large bots
- `failIfNotExists`: Throw errors for missing entities

## Lifecycle Events

The client emits several key events during its lifecycle:

### Ready Event
Emitted when the client is fully ready:
```js
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`)
  console.log(`Ready in ${client.guilds.cache.size} servers`)
})
```

### Connected Event
Emitted when the client establishes a connection:
```js
client.on('connected', () => {
  console.log('Connected to Discord gateway')
})
```

### Disconnected Event
Emitted when the client loses connection:
```js
client.on('disconnected', (event) => {
  console.log('Disconnected from Discord gateway')
  console.log('Will attempt to reconnect:', event.wasClean)
})
```

### Reconnecting Event
Emitted when the client attempts to reconnect:
```js
client.on('reconnecting', () => {
  console.log('Attempting to reconnect...')
})
```

### Resumed Event
Emitted when the client resumes a session:
```js
client.on('resumed', () => {
  console.log('Session resumed')
})
```

## Login Process

The login process involves several steps:
```js
async function startBot() {
  try {
    console.log('Starting bot...')
    
    // Login to Discord
    await client.login(process.env.DISCORD_TOKEN)
    
    console.log('Bot logged in successfully')
  } catch (error) {
    console.error('Failed to login:', error)
    process.exit(1)
  }
}

startBot()
```

## Graceful Shutdown

Implement proper shutdown handling:
```js
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...')
  
  // Destroy client and close connections
  client.destroy()
  
  // Exit process
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  client.destroy()
  process.exit(0)
})
```

## Client States

The client has several internal states:
- **IDLE**: Not connected
- **CONNECTING**: Attempting to connect
- **READY**: Connected and ready
- **DISCONNECTED**: Lost connection

Check client state:
```js
console.log('Client status:', client.status)
console.log('Is ready:', client.isReady())
console.log('WS status:', client.ws.status)
```

## Error Handling

Handle client-level errors:
```js
client.on('error', (error) => {
  console.error('Client error:', error)
})

client.on('warn', (warning) => {
  console.warn('Client warning:', warning)
})

client.on('debug', (info) => {
  console.log('Debug info:', info)
})
```

## Shard Management

For large bots, Discord requires sharding:
```js
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  shardCount: 'auto' // Let Discord.js calculate optimal shard count
})

client.on('shardReady', (id) => {
  console.log(`Shard ${id} is ready`)
})

client.on('shardDisconnect', (id, event) => {
  console.log(`Shard ${id} disconnected`)
})

client.on('shardReconnecting', (id) => {
  console.log(`Shard ${id} is reconnecting`)
})
```

## Best Practices

- Use `client.once()` for one-time events like `ready`
- Implement proper error handling for all lifecycle events
- Handle graceful shutdown to prevent data loss
- Monitor client status for health checks
- Use appropriate intents to minimize resource usage

## Common Issues

- **Token Issues**: Invalid or expired tokens prevent login
- **Intent Mismatches**: Missing intents cause events to not fire
- **Rate Limits**: Too many connection attempts trigger rate limits
- **Memory Leaks**: Not properly cleaning up resources

## Next Steps

Continue to [Gateway vs REST](/core-concepts/gateway-rest) to understand the two ways Discord.js communicates with Discord.