# Redis Integration

Discord.js v14.25.1 Redis integration for caching, sessions, and real-time features. This section covers Redis setup, caching strategies, session management, and pub/sub messaging for scalable Discord bots.

## Redis Connection Management

Establishing and managing Redis connections for production bots.

### Connection Setup

```javascript
const Redis = require('ioredis')

class RedisManager {
  constructor(config) {
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password,
      db: config.db || 0,
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      enableReadyCheck: config.enableReadyCheck || false,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      lazyConnect: config.lazyConnect || false,
      ...config.options
    }

    this.client = null
    this.isConnected = false
    this.connectionStats = {
      connectionsCreated: 0,
      connectionsLost: 0,
      commandsExecuted: 0,
      errors: 0
    }
  }

  async connect() {
    try {
      this.client = new Redis(this.config)

      // Set up event handlers
      this.client.on('connect', () => {
        console.log('Connected to Redis')
        this.isConnected = true
        this.connectionStats.connectionsCreated++
      })

      this.client.on('ready', () => {
        console.log('Redis client ready')
      })

      this.client.on('error', (error) => {
        console.error('Redis connection error:', error)
        this.connectionStats.errors++
      })

      this.client.on('close', () => {
        console.log('Redis connection closed')
        this.isConnected = false
        this.connectionStats.connectionsLost++
      })

      // Monitor commands
      this.client.on('command', () => {
        this.connectionStats.commandsExecuted++
      })

      // Wait for connection if not lazy
      if (!this.config.lazyConnect) {
        await new Promise((resolve, reject) => {
          this.client.once('ready', resolve)
          this.client.once('error', reject)
        })
      }

      return this.client
    } catch (error) {
      console.error('Failed to connect to Redis:', error)
      throw error
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit()
      this.isConnected = false
      console.log('Disconnected from Redis')
    }
  }

  getClient() {
    if (!this.isConnected) {
      throw new Error('Redis client not connected')
    }
    return this.client
  }

  async healthCheck() {
    try {
      const pong = await this.client.ping()
      return pong === 'PONG'
    } catch (error) {
      console.error('Redis health check failed:', error)
      return false
    }
  }

  getStats() {
    return {
      ...this.connectionStats,
      connected: this.isConnected
    }
  }
}
```

### Connection Pooling

```javascript
class RedisPoolManager {
  constructor(config) {
    this.config = config
    this.pool = []
    this.available = []
    this.waitingQueue = []
    this.maxConnections = config.maxConnections || 10
    this.minConnections = config.minConnections || 2
    this.borrowTimeout = config.borrowTimeout || 30000

    this.stats = {
      created: 0,
      destroyed: 0,
      borrowed: 0,
      returned: 0,
      waiting: 0
    }

    this.initializePool()
  }

  async initializePool() {
    for (let i = 0; i < this.minConnections; i++) {
      await this.createConnection()
    }
  }

  async createConnection() {
    const redis = new RedisManager(this.config)
    await redis.connect()

    this.pool.push(redis)
    this.available.push(redis)
    this.stats.created++

    return redis
  }

  async borrow() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.indexOf(resolve)
        if (index > -1) {
          this.waitingQueue.splice(index, 1)
          this.stats.waiting--
          reject(new Error('Connection borrow timeout'))
        }
      }, this.borrowTimeout)

      if (this.available.length > 0) {
        const connection = this.available.pop()
        clearTimeout(timeout)
        this.stats.borrowed++
        resolve(connection)
      } else if (this.pool.length < this.maxConnections) {
        this.createConnection().then(connection => {
          clearTimeout(timeout)
          this.stats.borrowed++
          resolve(connection)
        }).catch(reject)
      } else {
        this.waitingQueue.push(resolve)
        this.stats.waiting++
      }
    })
  }

  async return(connection) {
    if (this.waitingQueue.length > 0) {
      const waitingResolve = this.waitingQueue.shift()
      this.stats.waiting--
      this.stats.returned++
      waitingResolve(connection)
    } else {
      this.available.push(connection)
      this.stats.returned++
    }
  }

  async execute(callback) {
    const connection = await this.borrow()

    try {
      return await callback(connection.getClient())
    } finally {
      await this.return(connection)
    }
  }

  async close() {
    for (const connection of this.pool) {
      await connection.disconnect()
      this.stats.destroyed++
    }

    this.pool = []
    this.available = []

    // Reject waiting requests
    for (const waitingResolve of this.waitingQueue) {
      waitingResolve(Promise.reject(new Error('Pool is closing')))
    }
    this.waitingQueue = []
  }

  getStats() {
    return {
      ...this.stats,
      totalConnections: this.pool.length,
      availableConnections: this.available.length,
      waitingRequests: this.waitingQueue.length,
      utilization: ((this.pool.length - this.available.length) / this.pool.length) * 100
    }
  }
}
```

## Caching Strategies

Implementing Redis-based caching for Discord bot data.

### Multi-Level Caching

```javascript
class RedisCacheManager {
  constructor(redis, options = {}) {
    this.redis = redis
    this.ttl = options.ttl || 3600 // 1 hour default
    this.prefix = options.prefix || 'discord_cache:'
    this.serializer = options.serializer || JSON

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    }
  }

  async get(key, fetcher = null) {
    const cacheKey = this.getCacheKey(key)

    try {
      const cached = await this.redis.get(cacheKey)

      if (cached) {
        this.stats.hits++
        return this.serializer.parse(cached)
      }

      this.stats.misses++

      // Fetch from source if provided
      if (fetcher) {
        const data = await fetcher()
        if (data) {
          await this.set(key, data)
        }
        return data
      }

      return null
    } catch (error) {
      console.error('Cache get error:', error)
      // Fall back to fetcher if available
      if (fetcher) {
        return await fetcher()
      }
      throw error
    }
  }

  async set(key, value, ttl = null) {
    const cacheKey = this.getCacheKey(key)
    const serializedValue = this.serializer.stringify(value)
    const expiration = ttl || this.ttl

    try {
      await this.redis.setex(cacheKey, expiration, serializedValue)
      this.stats.sets++
    } catch (error) {
      console.error('Cache set error:', error)
      throw error
    }
  }

  async delete(key) {
    const cacheKey = this.getCacheKey(key)

    try {
      await this.redis.del(cacheKey)
      this.stats.deletes++
    } catch (error) {
      console.error('Cache delete error:', error)
      throw error
    }
  }

  async exists(key) {
    const cacheKey = this.getCacheKey(key)
    return await this.redis.exists(cacheKey)
  }

  async getMultiple(keys) {
    const cacheKeys = keys.map(key => this.getCacheKey(key))

    try {
      const values = await this.redis.mget(cacheKeys)
      const results = {}

      keys.forEach((key, index) => {
        const value = values[index]
        if (value) {
          results[key] = this.serializer.parse(value)
          this.stats.hits++
        } else {
          this.stats.misses++
        }
      })

      return results
    } catch (error) {
      console.error('Cache getMultiple error:', error)
      throw error
    }
  }

  async setMultiple(keyValuePairs, ttl = null) {
    const expiration = ttl || this.ttl
    const pipeline = this.redis.pipeline()

    for (const [key, value] of Object.entries(keyValuePairs)) {
      const cacheKey = this.getCacheKey(key)
      const serializedValue = this.serializer.stringify(value)
      pipeline.setex(cacheKey, expiration, serializedValue)
    }

    try {
      await pipeline.exec()
      this.stats.sets += Object.keys(keyValuePairs).length
    } catch (error) {
      console.error('Cache setMultiple error:', error)
      throw error
    }
  }

  async increment(key, amount = 1) {
    const cacheKey = this.getCacheKey(key)

    try {
      return await this.redis.incrby(cacheKey, amount)
    } catch (error) {
      console.error('Cache increment error:', error)
      throw error
    }
  }

  async expire(key, ttl) {
    const cacheKey = this.getCacheKey(key)

    try {
      return await this.redis.expire(cacheKey, ttl)
    } catch (error) {
      console.error('Cache expire error:', error)
      throw error
    }
  }

  getCacheKey(key) {
    return `${this.prefix}${key}`
  }

  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses
    return {
      ...this.stats,
      totalRequests,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    }
  }

  async clear(pattern = '*') {
    const keys = await this.redis.keys(this.getCacheKey(pattern))

    if (keys.length > 0) {
      await this.redis.del(keys)
      this.stats.deletes += keys.length
    }

    return keys.length
  }
}
```

### Discord Data Caching

```javascript
class DiscordCacheManager {
  constructor(redis) {
    this.cache = new RedisCacheManager(redis, {
      prefix: 'discord:',
      ttl: 1800 // 30 minutes
    })

    // Specialized caches for different data types
    this.userCache = new RedisCacheManager(redis, {
      prefix: 'discord_user:',
      ttl: 3600 // 1 hour
    })

    this.guildCache = new RedisCacheManager(redis, {
      prefix: 'discord_guild:',
      ttl: 1800 // 30 minutes
    })

    this.channelCache = new RedisCacheManager(redis, {
      prefix: 'discord_channel:',
      ttl: 3600 // 1 hour
    })
  }

  async getUser(userId, fetcher = null) {
    return await this.userCache.get(userId, fetcher)
  }

  async cacheUser(user) {
    const userData = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      bot: user.bot,
      flags: user.flags,
      cachedAt: Date.now()
    }

    await this.userCache.set(user.id, userData)
    return userData
  }

  async getGuild(guildId, fetcher = null) {
    return await this.guildCache.get(guildId, fetcher)
  }

  async cacheGuild(guild) {
    const guildData = {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      ownerId: guild.ownerId,
      memberCount: guild.memberCount,
      channels: guild.channels.cache.map(ch => ({
        id: ch.id,
        name: ch.name,
        type: ch.type
      })),
      roles: guild.roles.cache.map(role => ({
        id: role.id,
        name: role.name,
        color: role.color
      })),
      cachedAt: Date.now()
    }

    await this.guildCache.set(guild.id, guildData)
    return guildData
  }

  async getChannel(channelId, fetcher = null) {
    return await this.channelCache.get(channelId, fetcher)
  }

  async cacheChannel(channel) {
    const channelData = {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      guildId: channel.guildId,
      position: channel.position,
      cachedAt: Date.now()
    }

    await this.channelCache.set(channel.id, channelData)
    return channelData
  }

  async invalidateUser(userId) {
    await this.userCache.delete(userId)
  }

  async invalidateGuild(guildId) {
    await this.guildCache.delete(guildId)
  }

  async invalidateChannel(channelId) {
    await this.channelCache.delete(channelId)
  }

  async preloadGuildData(guild) {
    // Cache all guild data in one operation
    const cacheOps = []

    // Cache guild itself
    cacheOps.push(this.cacheGuild(guild))

    // Cache channels
    for (const [channelId, channel] of guild.channels.cache) {
      cacheOps.push(this.cacheChannel(channel))
    }

    // Cache roles
    // (implementation would depend on your role caching strategy)

    await Promise.all(cacheOps)
  }

  async getMultipleUsers(userIds) {
    return await this.userCache.getMultiple(userIds)
  }

  async getMultipleGuilds(guildIds) {
    return await this.guildCache.getMultiple(guildIds)
  }

  getStats() {
    return {
      overall: this.cache.getStats(),
      users: this.userCache.getStats(),
      guilds: this.guildCache.getStats(),
      channels: this.channelCache.getStats()
    }
  }

  async clearAll() {
    await Promise.all([
      this.userCache.clear(),
      this.guildCache.clear(),
      this.channelCache.clear()
    ])
  }
}
```

## Session Management

Managing user sessions and temporary data with Redis.

### Session Store

```javascript
class RedisSessionStore {
  constructor(redis, options = {}) {
    this.redis = redis
    this.ttl = options.ttl || 86400 // 24 hours
    this.prefix = options.prefix || 'session:'
    this.serializer = options.serializer || JSON
  }

  async create(sessionId, data = {}) {
    const sessionData = {
      ...data,
      createdAt: Date.now(),
      lastActivity: Date.now()
    }

    await this.redis.setex(
      this.getSessionKey(sessionId),
      this.ttl,
      this.serializer.stringify(sessionData)
    )

    return sessionData
  }

  async get(sessionId) {
    try {
      const data = await this.redis.get(this.getSessionKey(sessionId))

      if (!data) return null

      const session = this.serializer.parse(data)

      // Update last activity
      session.lastActivity = Date.now()
      await this.redis.setex(
        this.getSessionKey(sessionId),
        this.ttl,
        this.serializer.stringify(session)
      )

      return session
    } catch (error) {
      console.error('Session get error:', error)
      return null
    }
  }

  async update(sessionId, updates) {
    const session = await this.get(sessionId)

    if (!session) return null

    const updatedSession = {
      ...session,
      ...updates,
      lastActivity: Date.now()
    }

    await this.redis.setex(
      this.getSessionKey(sessionId),
      this.ttl,
      this.serializer.stringify(updatedSession)
    )

    return updatedSession
  }

  async destroy(sessionId) {
    await this.redis.del(this.getSessionKey(sessionId))
  }

  async extend(sessionId, additionalTime = 3600) {
    const session = await this.get(sessionId)

    if (!session) return false

    await this.redis.expire(this.getSessionKey(sessionId), additionalTime)
    return true
  }

  async exists(sessionId) {
    return await this.redis.exists(this.getSessionKey(sessionId))
  }

  async getAllSessions() {
    const keys = await this.redis.keys(`${this.prefix}*`)
    const sessions = []

    for (const key of keys) {
      const sessionId = key.replace(this.prefix, '')
      const session = await this.get(sessionId)
      if (session) {
        sessions.push({ sessionId, ...session })
      }
    }

    return sessions
  }

  async cleanupExpired() {
    // Redis automatically expires keys, but we can manually clean up if needed
    // This is more useful for databases that don't have built-in expiration
    return 0
  }

  getSessionKey(sessionId) {
    return `${this.prefix}${sessionId}`
  }

  async getSessionCount() {
    const keys = await this.redis.keys(`${this.prefix}*`)
    return keys.length
  }
}
```

### User Session Management

```javascript
class DiscordSessionManager {
  constructor(redis) {
    this.sessionStore = new RedisSessionStore(redis, {
      prefix: 'discord_session:',
      ttl: 604800 // 7 days
    })

    this.activeUsers = new Map() // userId -> sessionId
    this.userSessions = new Map() // userId -> Set of sessionIds
  }

  async createUserSession(userId, guildId = null, metadata = {}) {
    const sessionId = this.generateSessionId()

    const sessionData = {
      userId,
      guildId,
      metadata,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      startedAt: Date.now()
    }

    await this.sessionStore.create(sessionId, sessionData)

    // Track active sessions
    this.activeUsers.set(userId, sessionId)

    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set())
    }
    this.userSessions.get(userId).add(sessionId)

    return { sessionId, sessionData }
  }

  async getUserSession(sessionId) {
    return await this.sessionStore.get(sessionId)
  }

  async updateUserSession(sessionId, updates) {
    return await this.sessionStore.update(sessionId, updates)
  }

  async endUserSession(sessionId) {
    const session = await this.sessionStore.get(sessionId)

    if (session) {
      const userId = session.userId

      // Remove from tracking
      this.activeUsers.delete(userId)
      if (this.userSessions.has(userId)) {
        this.userSessions.get(userId).delete(sessionId)
      }

      await this.sessionStore.destroy(sessionId)
    }
  }

  async getUserActiveSession(userId) {
    const sessionId = this.activeUsers.get(userId)

    if (sessionId) {
      return await this.getUserSession(sessionId)
    }

    return null
  }

  async getAllUserSessions(userId) {
    const sessionIds = this.userSessions.get(userId)

    if (!sessionIds) return []

    const sessions = []

    for (const sessionId of sessionIds) {
      const session = await this.getUserSession(sessionId)
      if (session) {
        sessions.push({ sessionId, ...session })
      }
    }

    return sessions
  }

  async endAllUserSessions(userId) {
    const sessionIds = this.userSessions.get(userId) || new Set()

    for (const sessionId of sessionIds) {
      await this.endUserSession(sessionId)
    }

    this.activeUsers.delete(userId)
    this.userSessions.delete(userId)
  }

  async validateSession(sessionId) {
    const session = await this.getUserSession(sessionId)
    return session !== null
  }

  async refreshSession(sessionId) {
    return await this.sessionStore.extend(sessionId)
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async getSessionStats() {
    const allSessions = await this.sessionStore.getAllSessions()

    return {
      totalSessions: allSessions.length,
      activeUsers: this.activeUsers.size,
      uniqueUsers: this.userSessions.size,
      sessionsByUser: Array.from(this.userSessions.values()).map(sessions => sessions.size)
    }
  }
}
```

## Pub/Sub Messaging

Real-time messaging with Redis pub/sub.

### Pub/Sub Manager

```javascript
class RedisPubSubManager {
  constructor(redis) {
    this.redis = redis
    this.publisher = redis.duplicate()
    this.subscriber = redis.duplicate()

    this.subscriptions = new Map()
    this.channels = new Set()

    this.setupSubscriber()
  }

  setupSubscriber() {
    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message)
    })

    this.subscriber.on('subscribe', (channel, count) => {
      console.log(`Subscribed to ${channel}, total subscriptions: ${count}`)
    })

    this.subscriber.on('unsubscribe', (channel, count) => {
      console.log(`Unsubscribed from ${channel}, remaining subscriptions: ${count}`)
    })
  }

  async publish(channel, message) {
    try {
      const serializedMessage = typeof message === 'string' ? message : JSON.stringify(message)
      await this.publisher.publish(channel, serializedMessage)
    } catch (error) {
      console.error('Pub/Sub publish error:', error)
      throw error
    }
  }

  async subscribe(channel, handler) {
    try {
      await this.subscriber.subscribe(channel)
      this.channels.add(channel)

      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, new Set())
      }

      this.subscriptions.get(channel).add(handler)
    } catch (error) {
      console.error('Pub/Sub subscribe error:', error)
      throw error
    }
  }

  async unsubscribe(channel, handler = null) {
    try {
      if (handler) {
        // Remove specific handler
        const handlers = this.subscriptions.get(channel)
        if (handlers) {
          handlers.delete(handler)

          if (handlers.size === 0) {
            await this.subscriber.unsubscribe(channel)
            this.channels.delete(channel)
            this.subscriptions.delete(channel)
          }
        }
      } else {
        // Remove all handlers for channel
        await this.subscriber.unsubscribe(channel)
        this.channels.delete(channel)
        this.subscriptions.delete(channel)
      }
    } catch (error) {
      console.error('Pub/Sub unsubscribe error:', error)
      throw error
    }
  }

  handleMessage(channel, message) {
    const handlers = this.subscriptions.get(channel)

    if (!handlers) return

    let parsedMessage
    try {
      parsedMessage = JSON.parse(message)
    } catch (error) {
      parsedMessage = message
    }

    for (const handler of handlers) {
      try {
        handler(channel, parsedMessage)
      } catch (error) {
        console.error('Pub/Sub message handler error:', error)
      }
    }
  }

  async publishEvent(eventType, data, target = 'all') {
    const channel = `discord_events:${target}`
    const message = {
      type: eventType,
      data,
      timestamp: Date.now(),
      source: 'bot'
    }

    await this.publish(channel, message)
  }

  async subscribeToEvents(target = 'all', handler) {
    const channel = `discord_events:${target}`
    await this.subscribe(channel, handler)
  }

  async publishGuildEvent(guildId, eventType, data) {
    await this.publishEvent(eventType, data, `guild_${guildId}`)
  }

  async subscribeToGuildEvents(guildId, handler) {
    await this.subscribeToEvents(`guild_${guildId}`, handler)
  }

  async publishUserEvent(userId, eventType, data) {
    await this.publishEvent(eventType, data, `user_${userId}`)
  }

  async subscribeToUserEvents(userId, handler) {
    await this.subscribeToEvents(`user_${userId}`, handler)
  }

  getStats() {
    return {
      activeChannels: this.channels.size,
      totalSubscriptions: Array.from(this.subscriptions.values())
        .reduce((total, handlers) => total + handlers.size, 0)
    }
  }

  async close() {
    await Promise.all([
      this.publisher.quit(),
      this.subscriber.quit()
    ])
  }
}
```

### Real-time Bot Coordination

```javascript
class BotCoordinationManager {
  constructor(pubsub, botId) {
    this.pubsub = pubsub
    this.botId = botId
    this.isLeader = false
    this.otherBots = new Set()

    this.setupCoordination()
  }

  setupCoordination() {
    // Subscribe to coordination channel
    this.pubsub.subscribeToEvents('coordination', (channel, message) => {
      this.handleCoordinationMessage(message)
    })

    // Announce presence
    this.announcePresence()

    // Periodic heartbeat
    setInterval(() => {
      this.sendHeartbeat()
    }, 30000) // 30 seconds
  }

  announcePresence() {
    this.pubsub.publishEvent('bot_presence', {
      botId: this.botId,
      status: 'online',
      timestamp: Date.now()
    }, 'coordination')
  }

  sendHeartbeat() {
    this.pubsub.publishEvent('bot_heartbeat', {
      botId: this.botId,
      timestamp: Date.now()
    }, 'coordination')
  }

  handleCoordinationMessage(message) {
    switch (message.type) {
      case 'bot_presence':
        if (message.data.botId !== this.botId) {
          this.otherBots.add(message.data.botId)
          this.updateLeadership()
        }
        break

      case 'bot_heartbeat':
        if (message.data.botId !== this.botId) {
          // Update last seen time for other bots
          this.updateBotHeartbeat(message.data.botId, message.data.timestamp)
        }
        break

      case 'leadership_change':
        this.handleLeadershipChange(message.data)
        break
    }
  }

  updateLeadership() {
    // Simple leadership election: lowest bot ID becomes leader
    const allBots = [this.botId, ...Array.from(this.otherBots)].sort()
    const newLeader = allBots[0]

    if (newLeader !== (this.isLeader ? this.botId : null)) {
      this.isLeader = (newLeader === this.botId)

      if (this.isLeader) {
        console.log('This bot is now the leader')
        this.onBecameLeader()
      } else {
        console.log(`Bot ${newLeader} is now the leader`)
        this.onLostLeadership()
      }
    }
  }

  updateBotHeartbeat(botId, timestamp) {
    // Track when we last heard from other bots
    // Could be used for failure detection
  }

  async broadcastCommand(command, data) {
    if (!this.isLeader) {
      throw new Error('Only leader can broadcast commands')
    }

    await this.pubsub.publishEvent('bot_command', {
      command,
      data,
      from: this.botId,
      timestamp: Date.now()
    }, 'coordination')
  }

  handleLeadershipChange(data) {
    // Handle leadership transitions
    console.log('Leadership change:', data)
  }

  onBecameLeader() {
    // Perform leader-specific initialization
    console.log('Performing leader duties...')
  }

  onLostLeadership() {
    // Clean up leader-specific resources
    console.log('Stepping down as leader...')
  }

  getClusterInfo() {
    return {
      botId: this.botId,
      isLeader: this.isLeader,
      totalBots: this.otherBots.size + 1,
      otherBots: Array.from(this.otherBots)
    }
  }
}
```

## Best Practices

### Implementation Guidelines

1. **Use connection pooling** for Redis connections in high-traffic scenarios
2. **Implement proper error handling** with retry logic for Redis operations
3. **Set appropriate TTL values** for cached data based on update frequency
4. **Use Redis pipelines** for multiple operations to reduce round trips
5. **Monitor Redis performance** with key metrics like hit rates and latency
6. **Implement graceful degradation** when Redis is unavailable
7. **Use Redis pub/sub** for real-time bot coordination and events
8. **Secure Redis connections** with authentication and encryption
9. **Monitor memory usage** and implement eviction policies
10. **Test Redis failover scenarios** in production environments

### Production Considerations

```javascript
// Complete Redis management system
class ProductionRedisManager {
  constructor(config) {
    this.config = config

    // Core components
    this.redisManager = new RedisManager(config.redis)
    this.poolManager = new RedisPoolManager(config.redis)
    this.cacheManager = new DiscordCacheManager(this.redisManager.getClient())
    this.sessionManager = new DiscordSessionManager(this.redisManager.getClient())
    this.pubsubManager = new RedisPubSubManager(this.redisManager.getClient())

    // Bot coordination
    this.coordinationManager = new BotCoordinationManager(
      this.pubsubManager,
      config.botId || `bot_${Date.now()}`
    )

    // Stats
    this.stats = {
      uptime: Date.now(),
      operations: 0,
      errors: 0
    }
  }

  async initialize() {
    try {
      await this.redisManager.connect()

      // Set up pub/sub subscriptions
      await this.setupSubscriptions()

      console.log('Production Redis manager initialized')
    } catch (error) {
      console.error('Redis initialization failed:', error)
      throw error
    }
  }

  async setupSubscriptions() {
    // Subscribe to bot coordination events
    await this.pubsubManager.subscribeToEvents('coordination', (channel, message) => {
      this.coordinationManager.handleCoordinationMessage(message)
    })

    // Subscribe to command events
    await this.pubsubManager.subscribeToEvents('coordination', (channel, message) => {
      if (message.type === 'bot_command') {
        this.handleBotCommand(message)
      }
    })
  }

  handleBotCommand(message) {
    // Handle commands from leader bot
    console.log('Received bot command:', message)
  }

  async cacheDiscordData(client) {
    console.log('Caching Discord data in Redis...')

    // Cache users
    for (const [userId, user] of client.users.cache) {
      await this.cacheManager.cacheUser(user)
    }

    // Cache guilds
    for (const [guildId, guild] of client.guilds.cache) {
      await this.cacheManager.cacheGuild(guild)
    }

    console.log('Discord data caching completed')
  }

  async getCachedUser(userId) {
    return await this.cacheManager.getUser(userId)
  }

  async getCachedGuild(guildId) {
    return await this.cacheManager.getGuild(guildId)
  }

  async createUserSession(userId, metadata = {}) {
    return await this.sessionManager.createUserSession(userId, null, metadata)
  }

  async getUserSession(sessionId) {
    return await this.sessionManager.getUserSession(sessionId)
  }

  async publishGuildEvent(guildId, eventType, data) {
    await this.pubsubManager.publishGuildEvent(guildId, eventType, data)
  }

  getSystemStats() {
    return {
      ...this.stats,
      redis: this.redisManager.getStats(),
      pool: this.poolManager.getStats(),
      cache: this.cacheManager.getStats(),
      sessions: this.sessionManager.getSessionStats(),
      pubsub: this.pubsubManager.getStats(),
      coordination: this.coordinationManager.getClusterInfo()
    }
  }

  async executeWithPool(callback) {
    return await this.poolManager.execute(callback)
  }

  async gracefulShutdown() {
    console.log('Starting Redis manager shutdown...')

    await this.pubsubManager.close()
    await this.poolManager.close()
    await this.redisManager.disconnect()

    console.log('Redis manager shutdown complete')
  }
}
```

This comprehensive Redis integration provides high-performance caching, session management, and real-time coordination for production Discord bots with robust error handling and scalability features.