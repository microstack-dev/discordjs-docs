# Cache Management

Optimizing Discord.js v14.25.1 caching for performance and memory efficiency. Understanding cache behavior and implementing sweeping strategies.

## Cache Architecture

### Discord.js Cache Types

```js
// Client-level caches
client.users.cache        // All users bot can see
client.guilds.cache       // All guilds bot is in
client.channels.cache     // All channels bot can access

// Guild-level caches
guild.members.cache       // Guild members
guild.channels.cache      // Guild channels
guild.roles.cache         // Guild roles
guild.emojis.cache        // Guild emojis
guild.stickers.cache      // Guild stickers

// Channel-level caches
channel.messages.cache    // Recent messages
```

### Cache Configuration

```js
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  makeCacheOverrides: {
    // Limit user cache size
    UserManager: {
      maxSize: 1000,
      sweepInterval: 300000, // 5 minutes
      sweepFilter: () => (user) => user.bot // Keep bots
    },

    // Aggressive guild member sweeping
    GuildMemberManager: {
      maxSize: 100,
      sweepInterval: 60000, // 1 minute
      sweepFilter: () => (member) => Date.now() - member.joinedTimestamp < 300000 // Keep recent joins
    },

    // Limit message cache
    MessageManager: {
      maxSize: 50,
      sweepInterval: 300000, // 5 minutes
      sweepFilter: () => (message) => !message.author.bot // Keep user messages
    }
  }
})
```

## Cache Sweeping Strategies

### Time-Based Sweeping

```js
class CacheSweeper {
  constructor(client) {
    this.client = client
    this.sweepers = new Map()
    this.setupDefaultSweepers()
  }

  setupDefaultSweepers() {
    // Sweep old messages every 5 minutes
    this.addSweeper('messages', 300000, (message) => {
      const age = Date.now() - message.createdTimestamp
      return age > 600000 // Remove messages older than 10 minutes
    })

    // Sweep inactive users every 10 minutes
    this.addSweeper('users', 600000, (user) => {
      // Keep users seen in last 24 hours
      return Date.now() - user.lastSeen > 86400000
    })

    // Sweep large guilds' member caches more aggressively
    this.addSweeper('guildMembers', 120000, (member) => {
      const guild = member.guild
      const isLargeGuild = guild.memberCount > 10000

      if (isLargeGuild) {
        // Keep only active members in large guilds
        return Date.now() - member.lastMessageTimestamp > 3600000 // 1 hour
      }

      // Keep all members in small guilds
      return false
    })
  }

  addSweeper(name, interval, filter) {
    const sweeper = setInterval(() => {
      this.performSweep(name, filter)
    }, interval)

    this.sweepers.set(name, sweeper)
  }

  async performSweep(name, filter) {
    let swept = 0

    switch (name) {
      case 'messages':
        for (const channel of this.client.channels.cache.values()) {
          if (channel.messages) {
            for (const [id, message] of channel.messages.cache) {
              if (filter(message)) {
                channel.messages.cache.delete(id)
                swept++
              }
            }
          }
        }
        break

      case 'users':
        for (const [id, user] of this.client.users.cache) {
          if (filter(user)) {
            this.client.users.cache.delete(id)
            swept++
          }
        }
        break

      case 'guildMembers':
        for (const guild of this.client.guilds.cache.values()) {
          for (const [id, member] of guild.members.cache) {
            if (filter(member)) {
              guild.members.cache.delete(id)
              swept++
            }
          }
        }
        break
    }

    if (swept > 0) {
      console.log(`Swept ${swept} ${name} from cache`)
    }
  }

  getCacheStats() {
    return {
      users: this.client.users.cache.size,
      guilds: this.client.guilds.cache.size,
      channels: this.client.channels.cache.size,
      messages: Array.from(this.client.channels.cache.values())
        .filter(ch => ch.messages)
        .reduce((sum, ch) => sum + ch.messages.cache.size, 0)
    }
  }

  destroy() {
    for (const sweeper of this.sweepers.values()) {
      clearInterval(sweeper)
    }
    this.sweepers.clear()
  }
}

const cacheSweeper = new CacheSweeper(client)

// Monitor cache sizes
setInterval(() => {
  const stats = cacheSweeper.getCacheStats()
  console.log('Cache stats:', stats)

  // Alert on excessive cache sizes
  if (stats.users > 50000) {
    console.warn('User cache is very large, consider more aggressive sweeping')
  }
}, 300000) // Every 5 minutes
```

### Intelligent Cache Warming

```js
class CacheWarmer {
  constructor(client) {
    this.client = client
    this.warmupTasks = []
  }

  addWarmupTask(task) {
    this.warmupTasks.push(task)
  }

  async warmup() {
    console.log('Starting cache warmup...')

    for (const task of this.warmupTasks) {
      try {
        await task()
      } catch (error) {
        console.error('Cache warmup task failed:', error)
      }
    }

    console.log('Cache warmup complete')
  }

  // Common warmup tasks
  warmupFrequentlyUsedUsers() {
    this.addWarmupTask(async () => {
      // Warmup bot owner and common users
      const ownerId = process.env.BOT_OWNER_ID
      if (ownerId) {
        await this.client.users.fetch(ownerId)
      }
    })
  }

  warmupGuildSettings() {
    this.addWarmupTask(async () => {
      // Load guild-specific settings into cache
      for (const guild of this.client.guilds.cache.values()) {
        await loadGuildSettings(guild.id)
      }
    })
  }

  warmupCommandPermissions() {
    this.addWarmupTask(async () => {
      // Cache command permissions
      for (const guild of this.client.guilds.cache.values()) {
        await guild.commands.permissions.fetch()
      }
    })
  }
}

const cacheWarmer = new CacheWarmer(client)
cacheWarmer.warmupFrequentlyUsedUsers()
cacheWarmer.warmupGuildSettings()

// Warmup cache after ready
client.once('ready', () => {
  cacheWarmer.warmup()
})
```

## Cache Optimization Patterns

### Lazy Loading

```js
class LazyCache {
  constructor(fetcher, ttl = 300000) {
    this.cache = new Map()
    this.fetcher = fetcher
    this.ttl = ttl
  }

  async get(key) {
    const cached = this.cache.get(key)

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.value
    }

    // Fetch fresh data
    const value = await this.fetcher(key)
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })

    return value
  }

  invalidate(key) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }
}

// Usage
const userSettingsCache = new LazyCache(
  async (userId) => await database.getUserSettings(userId)
)

client.on('interactionCreate', async (interaction) => {
  const settings = await userSettingsCache.get(interaction.user.id)
  // Use settings
})
```

### Cache Hierarchies

```js
class HierarchicalCache {
  constructor() {
    this.l1Cache = new Map() // Fast, small L1 cache
    this.l2Cache = new Map() // Larger, slower L2 cache
    this.l1Size = 100
    this.l2Size = 1000
  }

  set(key, value) {
    // Always store in L2
    this.l2Cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0
    })

    // Store frequently accessed items in L1
    if (this.l1Cache.size < this.l1Size) {
      this.l1Cache.set(key, value)
    }
  }

  get(key) {
    // Check L1 first
    if (this.l1Cache.has(key)) {
      return this.l1Cache.get(key)
    }

    // Check L2
    const l2Entry = this.l2Cache.get(key)
    if (l2Entry) {
      l2Entry.accessCount++

      // Promote to L1 if frequently accessed
      if (l2Entry.accessCount > 5 && this.l1Cache.size < this.l1Size) {
        this.l1Cache.set(key, l2Entry.value)
      }

      return l2Entry.value
    }

    return null
  }

  cleanup() {
    // Remove old entries from L2
    const cutoff = Date.now() - 3600000 // 1 hour
    for (const [key, entry] of this.l2Cache) {
      if (entry.timestamp < cutoff) {
        this.l2Cache.delete(key)
        this.l1Cache.delete(key)
      }
    }

    // Evict least recently used from L1 if needed
    if (this.l1Cache.size > this.l1Size) {
      const entries = Array.from(this.l1Cache.entries())
      entries.sort((a, b) => (this.l2Cache.get(a[0])?.accessCount || 0) - (this.l2Cache.get(b[0])?.accessCount || 0))

      const toRemove = entries.slice(0, this.l1Cache.size - this.l1Size)
      toRemove.forEach(([key]) => this.l1Cache.delete(key))
    }
  }
}
```

## Cache Monitoring

### Performance Metrics

```js
class CacheMetrics {
  constructor() {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    }
  }

  recordHit() { this.metrics.hits++ }
  recordMiss() { this.metrics.misses++ }
  recordSet() { this.metrics.sets++ }
  recordDelete() { this.metrics.deletes++ }
  recordEviction() { this.metrics.evictions++ }

  getHitRate() {
    const total = this.metrics.hits + this.metrics.misses
    return total > 0 ? this.metrics.hits / total : 0
  }

  getReport() {
    return {
      ...this.metrics,
      hitRate: this.getHitRate(),
      totalOperations: this.metrics.hits + this.metrics.misses + this.metrics.sets + this.metrics.deletes
    }
  }

  reset() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = 0
    })
  }
}

const cacheMetrics = new CacheMetrics()

// Log metrics periodically
setInterval(() => {
  const report = cacheMetrics.getReport()
  console.log('Cache metrics:', {
    hitRate: Math.round(report.hitRate * 100) + '%',
    totalOps: report.totalOperations,
    evictions: report.evictions
  })

  cacheMetrics.reset()
}, 300000) // Every 5 minutes
```

## Best Practices

### Cache Size Limits

```js
// Set reasonable cache size limits
const cacheLimits = {
  users: 10000,
  guilds: 1000,
  channels: 5000,
  messages: 100, // Per channel
  members: 500   // Per guild
}

// Monitor and enforce limits
setInterval(() => {
  if (client.users.cache.size > cacheLimits.users) {
    console.warn(`User cache size (${client.users.cache.size}) exceeds limit (${cacheLimits.users})`)
  }

  for (const guild of client.guilds.cache.values()) {
    if (guild.members.cache.size > cacheLimits.members) {
      // Implement member cache sweeping
      sweepOldMembers(guild)
    }
  }
}, 60000)
```

### Cache Invalidation Strategies

```js
class CacheInvalidator {
  constructor() {
    this.invalidations = new Map()
  }

  invalidatePattern(pattern) {
    // Invalidate all cache entries matching pattern
    for (const [key, cache] of this.invalidations) {
      if (key.includes(pattern)) {
        cache.clear()
      }
    }
  }

  invalidateUserData(userId) {
    this.invalidatePattern(`user_${userId}`)
  }

  invalidateGuildData(guildId) {
    this.invalidatePattern(`guild_${guildId}`)
  }

  invalidateGlobalData() {
    this.invalidatePattern('global_')
  }

  // Event-based invalidation
  setupEventInvalidation(client) {
    client.on('guildMemberRemove', (member) => {
      this.invalidateUserData(member.id)
    })

    client.on('guildDelete', (guild) => {
      this.invalidateGuildData(guild.id)
    })

    client.on('userUpdate', (oldUser, newUser) => {
      if (oldUser.username !== newUser.username) {
        this.invalidateUserData(newUser.id)
      }
    })
  }
}

const cacheInvalidator = new CacheInvalidator()
cacheInvalidator.setupEventInvalidation(client)
```

## Next Steps

- [Rate Limits](/performance/rate-limits) - Managing API rate limits
- [Memory Optimization](/performance/memory-optimization) - Reducing memory footprint