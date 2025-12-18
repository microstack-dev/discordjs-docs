# Performance Overview

Discord.js v14.25.1 performance optimization for production bots. This section covers scaling strategies, resource management, and optimization techniques for high-performance Discord applications.

## Performance Fundamentals

### Bottlenecks

- **Gateway Events**: Event processing and handling
- **REST API**: Rate limits and request management
- **Memory Usage**: Cache management and garbage collection
- **CPU Usage**: Complex operations and computations
- **Network**: Connection management and latency

### Metrics to Monitor

```js
class BotMetrics {
  constructor(client) {
    this.client = client
    this.metrics = {
      uptime: 0,
      guilds: 0,
      users: 0,
      eventsProcessed: 0,
      apiCalls: 0,
      memoryUsage: 0,
      cpuUsage: 0
    }

    this.startTime = Date.now()
    this.setupMetrics()
  }

  setupMetrics() {
    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateMetrics()
    }, 30000)

    // Track events
    this.client.on('interactionCreate', () => {
      this.metrics.eventsProcessed++
    })

    this.client.on('ready', () => {
      this.metrics.guilds = this.client.guilds.cache.size
      this.metrics.users = this.client.users.cache.size
    })
  }

  updateMetrics() {
    const memUsage = process.memoryUsage()
    this.metrics.memoryUsage = memUsage.heapUsed
    this.metrics.uptime = Date.now() - this.startTime

    // Log metrics
    console.log('Bot Metrics:', {
      uptime: Math.round(this.metrics.uptime / 1000 / 60) + 'm',
      guilds: this.metrics.guilds,
      users: this.metrics.users,
      events: this.metrics.eventsProcessed,
      memory: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB'
    })
  }

  getReport() {
    return { ...this.metrics }
  }
}

const metrics = new BotMetrics(client)
```

## Optimization Strategies

### Event Processing

```js
// Efficient event filtering
client.on('messageCreate', async (message) => {
  // Fast checks first
  if (message.author.bot) return
  if (!message.guild) return
  if (!message.content.startsWith('!')) return

  // Process command
  await handleCommand(message)
})

// Debounced operations
class Debouncer {
  constructor(delay = 1000) {
    this.timeouts = new Map()
    this.delay = delay
  }

  debounce(key, callback) {
    const existing = this.timeouts.get(key)
    if (existing) clearTimeout(existing)

    const timeout = setTimeout(() => {
      this.timeouts.delete(key)
      callback()
    }, this.delay)

    this.timeouts.set(key, timeout)
  }
}

const debouncer = new Debouncer()

client.on('guildMemberUpdate', (oldMember, newMember) => {
  debouncer.debounce(`member_${newMember.id}`, () => {
    handleMemberUpdate(oldMember, newMember)
  })
})
```

### Memory Management

```js
// Cache with TTL
class TTLCache {
  constructor(defaultTTL = 300000) { // 5 minutes
    this.cache = new Map()
    this.defaultTTL = defaultTTL

    // Cleanup expired entries
    setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache) {
        if (now > entry.expires) {
          this.cache.delete(key)
        }
      }
    }, 60000) // Clean every minute
  }

  set(key, value, ttl = null) {
    this.cache.set(key, {
      value,
      expires: Date.now() + (ttl || this.defaultTTL)
    })
  }

  get(key) {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  delete(key) {
    return this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  size() {
    return this.cache.size
  }
}

const userCache = new TTLCache(10 * 60 * 1000) // 10 minutes
```

## Scaling Patterns

### Vertical Scaling

```js
// Optimize for single-server performance
const client = new Client({
  intents: [GatewayIntentBits.Guilds], // Minimal intents
  makeCacheOverrides: {
    // Reduce cache sizes
    GuildMemberManager: {
      maxSize: 100,
      sweepInterval: 300000 // 5 minutes
    },
    MessageManager: {
      maxSize: 50,
      sweepInterval: 60000 // 1 minute
    }
  },
  sweepers: {
    // Aggressive cache sweeping
    messages: {
      interval: 60000, // Sweep every minute
      lifetime: 300000 // Remove messages older than 5 minutes
    }
  }
})
```

### Horizontal Scaling Preparation

```js
// Design for sharding from the start
class ShardAwareBot {
  constructor() {
    this.shardId = process.env.SHARD_ID || 0
    this.shardCount = process.env.SHARD_COUNT || 1
    this.isSharded = this.shardCount > 1
  }

  // Shard-aware caching
  getCacheKey(key) {
    return this.isSharded ? `${this.shardId}:${key}` : key
  }

  // Shard-aware operations
  async performGlobalOperation(operation) {
    if (this.isSharded) {
      // Use IPC or database for cross-shard operations
      return await this.performCrossShardOperation(operation)
    } else {
      return await operation()
    }
  }

  // Shard-specific data handling
  shouldHandleGuild(guildId) {
    if (!this.isSharded) return true
    return this.calculateShardForGuild(guildId) === this.shardId
  }

  calculateShardForGuild(guildId) {
    return (guildId >> 22) % this.shardCount
  }
}

const bot = new ShardAwareBot()
```

## Monitoring and Alerting

### Health Checks

```js
class HealthChecker {
  constructor(client) {
    this.client = client
    this.lastHealthCheck = Date.now()
    this.healthStatus = 'healthy'
  }

  async performHealthCheck() {
    const checks = {
      gateway: await this.checkGateway(),
      memory: this.checkMemory(),
      cache: this.checkCache(),
      api: await this.checkAPI()
    }

    const allHealthy = Object.values(checks).every(check => check.healthy)
    this.healthStatus = allHealthy ? 'healthy' : 'unhealthy'

    if (!allHealthy) {
      console.error('Health check failed:', checks)
      await this.alertHealthIssue(checks)
    }

    this.lastHealthCheck = Date.now()
    return checks
  }

  async checkGateway() {
    try {
      const ping = this.client.ws.ping
      return {
        healthy: ping < 1000, // Less than 1 second
        value: ping,
        message: ping < 1000 ? 'Gateway responsive' : 'High gateway latency'
      }
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Gateway check failed'
      }
    }
  }

  checkMemory() {
    const usage = process.memoryUsage()
    const heapUsed = usage.heapUsed / 1024 / 1024 // MB
    const heapTotal = usage.heapTotal / 1024 / 1024

    return {
      healthy: heapUsed < heapTotal * 0.8, // Less than 80% heap usage
      value: Math.round(heapUsed),
      message: `Memory usage: ${Math.round(heapUsed)}MB`
    }
  }

  checkCache() {
    const cacheSizes = {
      guilds: this.client.guilds.cache.size,
      users: this.client.users.cache.size,
      channels: this.client.channels.cache.size
    }

    const totalCacheSize = Object.values(cacheSizes).reduce((sum, size) => sum + size, 0)

    return {
      healthy: totalCacheSize < 100000, // Reasonable cache size
      value: totalCacheSize,
      message: `Cache size: ${totalCacheSize} items`
    }
  }

  async checkAPI() {
    try {
      const start = Date.now()
      await this.client.users.fetch(this.client.user.id)
      const latency = Date.now() - start

      return {
        healthy: latency < 5000, // Less than 5 seconds
        value: latency,
        message: `API latency: ${latency}ms`
      }
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'API check failed'
      }
    }
  }

  async alertHealthIssue(checks) {
    const failedChecks = Object.entries(checks)
      .filter(([, check]) => !check.healthy)
      .map(([name, check]) => `${name}: ${check.message}`)

    console.error('HEALTH ALERT:', failedChecks.join(', '))

    // Send alert to monitoring service
    if (process.env.HEALTH_WEBHOOK) {
      await fetch(process.env.HEALTH_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: 'Bot Health Alert',
            color: 0xff0000,
            fields: failedChecks.map(check => ({
              name: check.split(':')[0],
              value: check.split(':')[1] || 'Failed',
              inline: true
            }))
          }]
        })
      })
    }
  }
}

const healthChecker = new HealthChecker(client)

// Health check endpoint
setInterval(() => {
  healthChecker.performHealthCheck()
}, 5 * 60 * 1000) // Every 5 minutes
```

## Best Practices

### Resource Monitoring

```js
// Monitor resource usage
setInterval(() => {
  const memUsage = process.memoryUsage()
  const cpuUsage = process.cpuUsage()

  console.log('Resource Usage:', {
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
    },
    cpu: {
      user: Math.round(cpuUsage.user / 1000) + 'ms',
      system: Math.round(cpuUsage.system / 1000) + 'ms'
    }
  })

  // Alert on high memory usage
  if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
    console.warn('High memory usage detected')
  }
}, 60000) // Every minute
```

### Performance Profiling

```js
// Profile slow operations
async function profileOperation(name, operation) {
  const start = process.hrtime.bigint()
  const startMem = process.memoryUsage().heapUsed

  try {
    const result = await operation()
    const end = process.hrtime.bigint()
    const endMem = process.memoryUsage().heapUsed

    const duration = Number(end - start) / 1000000 // milliseconds
    const memoryDelta = endMem - startMem

    console.log(`Operation ${name}:`, {
      duration: Math.round(duration) + 'ms',
      memoryDelta: Math.round(memoryDelta / 1024) + 'KB'
    })

    // Alert on slow operations
    if (duration > 5000) { // 5 seconds
      console.warn(`Slow operation detected: ${name} took ${Math.round(duration)}ms`)
    }

    return result
  } catch (error) {
    console.error(`Operation ${name} failed:`, error)
    throw error
  }
}

// Usage
client.on('interactionCreate', async (interaction) => {
  await profileOperation(`handle_${interaction.type}`, () =>
    handleInteraction(interaction)
  )
})
```

## Next Steps

- [Sharding](/performance/sharding) - Horizontal scaling with ShardingManager
- [Cache Management](/performance/cache-management) - Optimizing Discord.js caching
- [Rate Limits](/performance/rate-limits) - Managing API rate limits
- [Memory Optimization](/performance/memory-optimization) - Reducing memory footprint
- [Large Bots](/performance/large-bots) - Scaling to thousands of servers