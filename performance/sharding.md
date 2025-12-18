# Sharding

Horizontal scaling for large Discord bots using Discord.js v14.25.1 ShardingManager. Essential for bots serving thousands of guilds.

## Sharding Fundamentals

### What is Sharding

Sharding splits your bot across multiple processes, each handling a subset of guilds. Discord requires sharding for bots in 1500+ guilds.

### Automatic Sharding

```js
import { ShardingManager } from 'discord.js'

const manager = new ShardingManager('./bot.js', {
  token: process.env.DISCORD_TOKEN,
  totalShards: 'auto', // Discord.js calculates optimal shard count
  respawn: true
})

manager.on('shardCreate', (shard) => {
  console.log(`Launched shard ${shard.id}`)

  shard.on('ready', () => {
    console.log(`Shard ${shard.id} ready`)
  })

  shard.on('disconnect', () => {
    console.log(`Shard ${shard.id} disconnected`)
  })

  shard.on('reconnecting', () => {
    console.log(`Shard ${shard.id} reconnecting`)
  })
})

manager.spawn()
```

### Manual Sharding

```js
const manager = new ShardingManager('./bot.js', {
  token: process.env.DISCORD_TOKEN,
  totalShards: 5, // Fixed shard count
  respawn: true,
  shardArgs: ['--shard'],
  execArgv: ['--max-old-space-size=4096'] // 4GB memory limit per shard
})
```

## Shard Communication

### Inter-Process Communication

```js
// In main process (manager.js)
manager.on('shardCreate', (shard) => {
  // Send data to shard
  shard.send({ type: 'CONFIG_UPDATE', data: newConfig })

  // Receive data from shard
  shard.on('message', (message) => {
    if (message.type === 'GUILD_STATS') {
      console.log(`Shard ${shard.id} has ${message.guildCount} guilds`)
    }
  })
})

// In shard process (bot.js)
process.on('message', (message) => {
  if (message.type === 'CONFIG_UPDATE') {
    updateBotConfig(message.data)
    process.send({ type: 'CONFIG_UPDATED', shardId: client.shard.ids[0] })
  }
})

// Send stats to manager
client.on('ready', () => {
  if (client.shard) {
    process.send({
      type: 'GUILD_STATS',
      guildCount: client.guilds.cache.size,
      shardId: client.shard.ids[0]
    })
  }
})
```

### Broadcast Operations

```js
class ShardManager {
  constructor(manager) {
    this.manager = manager
    this.setupBroadcasts()
  }

  setupBroadcasts() {
    // Broadcast guild count across all shards
    setInterval(async () => {
      const guildCounts = await this.broadcastEval('client.guilds.cache.size')
      const totalGuilds = guildCounts.reduce((sum, count) => sum + count, 0)

      console.log(`Total guilds across all shards: ${totalGuilds}`)
    }, 300000) // Every 5 minutes
  }

  async broadcastEval(script) {
    const results = await this.manager.broadcastEval(script)
    return results
  }

  async broadcastCommand(command, data) {
    await this.manager.broadcast({
      type: 'COMMAND',
      command,
      data
    })
  }

  // Get shard for specific guild
  getShardForGuild(guildId) {
    return (guildId >> 22) % this.manager.totalShards
  }

  // Send command to specific shard
  async sendToShard(shardId, message) {
    const shard = this.manager.shards.get(shardId)
    if (shard) {
      await shard.send(message)
    }
  }
}
```

## Shard-Aware Operations

### Cross-Shard Data Management

```js
// Database-based approach for cross-shard data
class CrossShardCache {
  constructor(database) {
    this.db = database
    this.localCache = new Map()
  }

  async get(key) {
    // Check local cache first
    if (this.localCache.has(key)) {
      return this.localCache.get(key)
    }

    // Fetch from database
    const data = await this.db.collection('cache').findOne({ key })
    if (data) {
      this.localCache.set(key, data.value)
      return data.value
    }

    return null
  }

  async set(key, value, ttl = 300000) {
    // Store locally
    this.localCache.set(key, value)

    // Store in database
    await this.db.collection('cache').updateOne(
      { key },
      {
        key,
        value,
        expires: new Date(Date.now() + ttl)
      },
      { upsert: true }
    )
  }

  async getGlobalStats() {
    // Aggregate stats from all shards
    const shardStats = await manager.broadcastEval(`
      ({
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        channels: client.channels.cache.size
      })
    `)

    return shardStats.reduce((total, stats) => ({
      guilds: total.guilds + stats.guilds,
      users: total.users + stats.users,
      channels: total.channels + stats.channels
    }), { guilds: 0, users: 0, channels: 0 })
  }
}
```

### Shard-Specific Logic

```js
// In bot.js - shard-aware initialization
client.on('ready', () => {
  const shardId = client.shard?.ids[0] || 0
  const totalShards = client.shard?.count || 1

  console.log(`Shard ${shardId}/${totalShards} ready with ${client.guilds.cache.size} guilds`)

  // Shard-specific behavior
  if (shardId === 0) {
    // Only first shard handles global tasks
    setupGlobalTasks(client)
  }

  // All shards handle their own guilds
  setupGuildTasks(client)
})
```

## Sharding Best Practices

### Optimal Shard Count

```js
function calculateOptimalShards(guildCount, averageGuildSize = 1000) {
  // Discord recommends ~1000 guilds per shard
  const recommendedShards = Math.ceil(guildCount / 1000)

  // Account for large guilds
  const largeGuildPenalty = Math.ceil(guildCount * averageGuildSize / 50000)

  return Math.max(recommendedShards, largeGuildPenalty, 1)
}

// Auto-calculate shards
const optimalShards = calculateOptimalShards(estimatedGuildCount)

const manager = new ShardingManager('./bot.js', {
  token: process.env.DISCORD_TOKEN,
  totalShards: optimalShards,
  respawn: true
})
```

### Memory Management per Shard

```js
// Configure per-shard memory limits
const manager = new ShardingManager('./bot.js', {
  token: process.env.DISCORD_TOKEN,
  totalShards: 'auto',
  respawn: true,
  execArgv: [
    '--max-old-space-size=2048', // 2GB per shard
    '--optimize-for-size',
    '--max-new-space-size=1024'
  ]
})
```

### Shard Monitoring

```js
class ShardMonitor {
  constructor(manager) {
    this.manager = manager
    this.shardHealth = new Map()
    this.setupMonitoring()
  }

  setupMonitoring() {
    this.manager.on('shardCreate', (shard) => {
      this.shardHealth.set(shard.id, {
        status: 'starting',
        lastSeen: Date.now(),
        restartCount: 0
      })

      shard.on('ready', () => {
        this.updateShardStatus(shard.id, 'ready')
      })

      shard.on('disconnect', () => {
        this.updateShardStatus(shard.id, 'disconnected')
        this.handleShardDisconnect(shard.id)
      })

      shard.on('death', () => {
        this.updateShardStatus(shard.id, 'dead')
        this.handleShardDeath(shard.id)
      })
    })
  }

  updateShardStatus(shardId, status) {
    const health = this.shardHealth.get(shardId)
    if (health) {
      health.status = status
      health.lastSeen = Date.now()
    }
  }

  async handleShardDisconnect(shardId) {
    console.warn(`Shard ${shardId} disconnected`)

    const health = this.shardHealth.get(shardId)
    if (health && health.restartCount < 5) {
      health.restartCount++
      console.log(`Restarting shard ${shardId} (attempt ${health.restartCount})`)

      // Shard will auto-restart due to respawn: true
    } else {
      console.error(`Shard ${shardId} failed to restart after 5 attempts`)
      await this.alertAdministrators(shardId, 'persistent_disconnect')
    }
  }

  async handleShardDeath(shardId) {
    console.error(`Shard ${shardId} crashed`)

    const health = this.shardHealth.get(shardId)
    if (health) {
      health.restartCount++

      if (health.restartCount > 3) {
        console.error(`Shard ${shardId} crashed ${health.restartCount} times`)
        await this.alertAdministrators(shardId, 'frequent_crashes')
      }
    }
  }

  async alertAdministrators(shardId, issue) {
    // Send alert to administrators
    if (process.env.ADMIN_WEBHOOK) {
      await fetch(process.env.ADMIN_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: 'Shard Alert',
            color: 0xff0000,
            fields: [
              { name: 'Shard ID', value: shardId.toString(), inline: true },
              { name: 'Issue', value: issue, inline: true },
              { name: 'Time', value: new Date().toISOString(), inline: true }
            ]
          }]
        })
      })
    }
  }

  getHealthReport() {
    const report = {}
    for (const [shardId, health] of this.shardHealth) {
      report[shardId] = { ...health }
    }
    return report
  }
}

const shardMonitor = new ShardMonitor(manager)
```

## Common Issues

### Shard Identification

```js
// In bot.js - correct shard identification
client.on('ready', () => {
  const shardId = client.shard?.ids[0]
  const totalShards = client.shard?.count

  if (shardId !== undefined) {
    console.log(`Shard ${shardId}/${totalShards} ready`)
  } else {
    console.log('Running without sharding')
  }
})
```

### Cross-Shard Communication

```js
// Use database or Redis for cross-shard data
class CrossShardData {
  constructor(redis) {
    this.redis = redis
  }

  async setGlobalData(key, value) {
    await this.redis.set(`global:${key}`, JSON.stringify(value))
  }

  async getGlobalData(key) {
    const data = await this.redis.get(`global:${key}`)
    return data ? JSON.parse(data) : null
  }

  async incrementGlobalCounter(key) {
    return await this.redis.incr(`counter:${key}`)
  }
}
```

### Memory Leaks

```js
// Clean up shard-specific caches
client.on('shardDisconnect', () => {
  // Clear shard-specific caches
  userCache.clear()
  guildCache.clear()

  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
})
```

## Next Steps

- [Cache Management](/performance/cache-management) - Optimizing Discord.js caching strategies
- [Rate Limits](/performance/rate-limits) - Managing API rate limits across shards