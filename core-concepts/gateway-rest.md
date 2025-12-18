# Gateway vs REST

Discord.js communicates with Discord through two primary methods: Gateway and REST API. Understanding when to use each is crucial for efficient bot development.

## Gateway

The Gateway is Discord's real-time event streaming service. It maintains a persistent WebSocket connection to receive live updates.

### What Gateway Does

- Receives real-time events (messages, reactions, joins, etc.)
- Maintains persistent connection
- Sends events as they happen
- Handles bot presence and status

### Gateway Events

Common Gateway events:
```js
client.on('messageCreate', (message) => {
  // Real-time message received
})

client.on('guildMemberAdd', (member) => {
  // Member joined server
})

client.on('interactionCreate', (interaction) => {
  // Slash command or interaction used
})
```

### Gateway Configuration

```js
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,      // Server events
    GatewayIntentBits.GuildMessages, // Message events
    GatewayIntentBits.MessageContent // Message content
  ]
})
```

## REST API

The REST API is used for one-time requests to fetch or modify data. It's stateless and doesn't maintain a persistent connection.

### What REST Does

- Fetches data on demand
- Sends one-time requests
- Retrieves historical data
- Performs administrative actions

### REST Methods

Discord.js provides REST methods through the client:
```js
// Fetch user information
const user = await client.users.fetch('USER_ID')

// Fetch channel messages
const messages = await channel.messages.fetch({ limit: 100 })

// Create channel
const newChannel = await guild.channels.create({
  name: 'general',
  type: ChannelType.GuildText
})

// Send message
const message = await channel.send('Hello, world!')
```

## When to Use Gateway

Use Gateway for:
- **Real-time reactions**: Responding to events as they happen
- **Message handling**: Processing incoming messages
- **User interactions**: Handling slash commands and buttons
- **Presence updates**: Tracking user status changes
- **Voice state changes**: Monitoring voice channels

### Gateway Example
```js
client.on('messageCreate', async (message) => {
  if (message.content === '!ping') {
    await message.reply('Pong!')
  }
})
```

## When to Use REST

Use REST for:
- **Data retrieval**: Fetching user profiles, server info
- **Bulk operations**: Getting multiple messages at once
- **Administrative tasks**: Creating channels, roles
- **Historical data**: Fetching past messages
- **Bot-initiated actions**: Sending messages without triggers

### REST Example
```js
// Fetch server information
const guild = await client.guilds.fetch('GUILD_ID')
const channels = await guild.channels.fetch()

// Send welcome message
const welcomeChannel = guild.channels.cache.get('CHANNEL_ID')
await welcomeChannel.send('Welcome to the server!')
```

## Performance Considerations

### Gateway Performance
- **Pros**: Instant event delivery, efficient for real-time responses
- **Cons**: Maintains persistent connection, requires intents

### REST Performance
- **Pros**: No persistent connection, can fetch large amounts of data
- **Cons**: Higher latency, subject to rate limits

## Rate Limits

Both Gateway and REST have rate limits:

### Gateway Rate Limits
- Limited by intents and events
- Discord controls event frequency
- No explicit rate limiting needed

### REST Rate Limits
- Explicit rate limits per endpoint
- Discord.js handles rate limiting automatically
- Can be monitored for optimization

```js
// Check rate limit info
const channel = await client.channels.fetch('CHANNEL_ID')
console.log(channel.rateLimitPerUser) // User rate limit
```

## Hybrid Approach

Most bots use both Gateway and REST:
```js
// Gateway for real-time events
client.on('interactionCreate', async (interaction) => {
  if (interaction.commandName === 'userinfo') {
    // REST to fetch additional user data
    const user = await client.users.fetch(interaction.user.id)
    const mutualGuilds = await client.guilds.fetch({ 
      user: interaction.user.id 
    })
    
    await interaction.reply({
      content: `User: ${user.tag}`,
      ephemeral: true
    })
  }
})

// REST for periodic tasks
setInterval(async () => {
  const guild = client.guilds.cache.get('GUILD_ID')
  const memberCount = guild.memberCount
  
  console.log(`Current member count: ${memberCount}`)
}, 60000) // Check every minute
```

## Caching Strategy

Discord.js caches data from Gateway events:
```js
// Cached data (from Gateway)
const guild = client.guilds.cache.get('GUILD_ID')

// Fresh data (from REST)
const freshGuild = await client.guilds.fetch('GUILD_ID', { force: true })
```

## Best Practices

- Use Gateway for event-driven responses
- Use REST for data fetching and bot-initiated actions
- Monitor REST rate limits for heavy operations
- Leverage caching to reduce REST calls
- Combine both methods for optimal performance

## Next Steps

Continue to [Intents](/core-concepts/intents) to understand how Gateway intents control the events your bot receives.