# Caching & Partials

Discord.js manages data through caching and partials. Understanding these concepts is crucial for efficient memory usage and data access.

## Caching Overview

Discord.js maintains an in-memory cache of Discord objects like users, channels, and guilds. This provides fast access without repeated API calls.

### Cache Types

Each object type has its own cache:
```js
// Guild cache
client.guilds.cache

// Channel cache within a guild
guild.channels.cache

// User cache
client.users.cache

// Role cache within a guild
guild.roles.cache

// Member cache within a guild
guild.members.cache
```

### Cache Properties

Caches are Discord.js `Collection` objects:
```js
const guild = client.guilds.cache.get('GUILD_ID')

// Check if cached
console.log(client.guilds.cache.has('GUILD_ID'))

// Get cache size
console.log(`Cached ${client.guilds.cache.size} guilds`)

// Iterate through cache
client.guilds.cache.forEach((guild, id) => {
  console.log(`${guild.name} (${id})`)
})
```

## Cache Configuration

Control caching behavior with client options:
```js
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  makeCacheOverrides: {
    // Disable message caching
    MessageManager: {
      maxSize: 0
    },
    // Limit member cache
    GuildMemberManager: {
      maxSize: 100
    }
  }
})
```

## Cache Strategies

### Full Caching
Default behavior - cache everything:
```js
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
})

// All members are cached as they join
guild.members.cache.forEach(member => {
  console.log(member.displayName)
})
```

### Selective Caching
Cache only what you need:
```js
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  // Don't cache members by default
  sweepers: {
    members: {
      interval: 3600, // Sweep every hour
      filter: () => () => true // Remove all members
    }
  }
})

// Fetch members on demand
const member = await guild.members.fetch('USER_ID')
```

### No Caching
Disable specific caches:
```js
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  makeCacheOverrides: {
    GuildMemberManager: {
      sweepInterval: 0, // Disable caching
      sweepFilter: () => () => true
    }
  }
})
```

## Partials

Partials are incomplete objects that contain only basic information. They're used when full objects aren't available or cached.

### Common Partials

```js
// Partial guild (from invite)
client.on('inviteCreate', (invite) => {
  console.log(invite.guild?.name) // Might be undefined
  console.log(invite.guildId)    // Always available
})

// Partial user (from reaction)
client.on('messageReactionAdd', (reaction, user) => {
  console.log(user.username) // Might be undefined
  console.log(user.id)       // Always available
})
```

### Fetching Full Objects

Convert partials to full objects:
```js
client.on('messageReactionAdd', async (reaction, user) => {
  // Fetch full user object
  const fullUser = await client.users.fetch(user.id)
  console.log(fullUser.username)
  
  // Fetch full message if needed
  if (reaction.message.partial) {
    const fullMessage = await reaction.message.fetch()
    console.log(fullMessage.content)
  }
})
```

## Cache Management

### Manual Cache Control

```js
// Add to cache
client.guilds.cache.set('GUILD_ID', guildObject)

// Remove from cache
client.guilds.cache.delete('GUILD_ID')

// Clear entire cache
client.guilds.cache.clear()

// Check cache size
if (client.guilds.cache.size > 1000) {
  // Implement cleanup logic
}
```

### Cache Sweeping

Automatic cache cleanup:
```js
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  sweepers: {
    messages: {
      interval: 3600,      // Sweep every hour
      lifetime: 1800,      // Remove messages older than 30 minutes
      filter: () => () => true // Remove all messages
    },
    users: {
      interval: 3600,
      filter: () => (user) => !user.bot // Keep only bots
    }
  }
})
```

## Memory Optimization

### Large Bots

For bots in many servers:
```js
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  makeCacheOverrides: {
    GuildMemberManager: {
      maxSize: 0 // Don't cache members
    },
    UserManager: {
      maxSize: 1000 // Limit user cache
    },
    ChannelManager: {
      maxSize: 100 // Limit channel cache per guild
    }
  },
  sweepers: {
    messages: {
      interval: 1800, // Sweep every 30 minutes
      lifetime: 600   // Remove messages older than 10 minutes
    }
  }
})
```

### On-Demand Fetching

Fetch data only when needed:
```js
// Instead of relying on cache
const member = guild.members.cache.get(userId)

// Fetch on demand
const member = await guild.members.fetch(userId)

// Fetch multiple members
const members = await guild.members.fetch({
  user: ['USER_ID_1', 'USER_ID_2'],
  time: 60000 // Timeout
})
```

## Cache vs REST

### When to Use Cache
- Frequently accessed data
- Real-time event handling
- Performance-critical operations

### When to Use REST
- One-time data access
- Large data sets
- Historical information

```js
// Fast: From cache
const cachedChannel = guild.channels.cache.get('CHANNEL_ID')

// Fresh: From REST
const freshChannel = await guild.channels.fetch('CHANNEL_ID')

// Force refresh
const refreshedChannel = await guild.channels.fetch('CHANNEL_ID', {
  force: true,
  cache: false
})
```

## Best Practices

- Cache frequently accessed data
- Use sweepers for automatic cleanup
- Fetch on demand for large datasets
- Convert partials to full objects when needed
- Monitor memory usage in large bots
- Consider your bot's scale when configuring caches

## Common Issues

- **Memory Leaks**: Unbounded cache growth
- **Stale Data**: Cache not updated with latest changes
- **Partial Objects**: Trying to access properties on partials
- **Missing Data**: Assuming objects are cached when they're not

## Next Steps

Continue to [Snowflakes](/core-concepts/snowflakes) to understand Discord's unique ID system and how it relates to caching.