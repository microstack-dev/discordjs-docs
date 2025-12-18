# Database Overview

Discord.js v14.25.1 database integration for production bots. This section covers database connection patterns, data modeling, query optimization, and scalable data management strategies.

## Database Connection Management

Establishing and maintaining reliable database connections.

### Connection Pooling

```js
const { Pool } = require('pg') // PostgreSQL example

class DatabaseConnectionManager {
  constructor(config) {
    this.config = config
    this.pool = null
    this.connectionStats = {
      created: 0,
      destroyed: 0,
      active: 0,
      idle: 0,
      waiting: 0
    }

    this.healthCheckInterval = null
    this.setupPool()
  }

  setupPool() {
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      max: this.config.maxConnections || 20,
      min: this.config.minConnections || 2,
      idleTimeoutMillis: this.config.idleTimeout || 30000,
      connectionTimeoutMillis: this.config.connectionTimeout || 2000,
      acquireTimeoutMillis: this.config.acquireTimeout || 60000
    })

    this.setupEventHandlers()
    this.startHealthChecks()
  }

  setupEventHandlers() {
    this.pool.on('connect', (client) => {
      this.connectionStats.created++
      this.connectionStats.active++
      console.log('New database connection established')
    })

    this.pool.on('remove', (client) => {
      this.connectionStats.destroyed++
      this.connectionStats.active--
      console.log('Database connection removed')
    })

    this.pool.on('error', (err, client) => {
      console.error('Unexpected database pool error:', err)
      this.connectionStats.active--
    })
  }

  async getConnection() {
    try {
      const client = await this.pool.connect()
      this.connectionStats.idle--
      return client
    } catch (error) {
      console.error('Failed to get database connection:', error)
      throw error
    }
  }

  async query(text, params) {
    const client = await this.getConnection()

    try {
      const start = Date.now()
      const res = await client.query(text, params)
      const duration = Date.now() - start

      console.log('Executed query', { text, duration, rows: res.rowCount })

      return res
    } finally {
      client.release()
      this.connectionStats.idle++
    }
  }

  async transaction(callback) {
    const client = await this.getConnection()

    try {
      await client.query('BEGIN')

      const result = await callback(client)

      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
      this.connectionStats.idle++
    }
  }

  startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck()
    }, 30000) // Check every 30 seconds
  }

  async performHealthCheck() {
    try {
      await this.query('SELECT 1')
      console.log('Database health check passed')
    } catch (error) {
      console.error('Database health check failed:', error)
      // Could implement reconnection logic here
    }
  }

  async close() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    await this.pool.end()
    console.log('Database connection pool closed')
  }

  getStats() {
    return {
      ...this.connectionStats,
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount
    }
  }
}
```

### Connection Retry Logic

```js
class DatabaseRetryManager {
  constructor(connectionManager, options = {}) {
    this.connectionManager = connectionManager
    this.maxRetries = options.maxRetries || 3
    this.baseDelay = options.baseDelay || 1000
    this.maxDelay = options.maxDelay || 30000
    this.backoffFactor = options.backoffFactor || 2
    this.retryableErrors = options.retryableErrors || [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNRESET'
    ]
  }

  async executeWithRetry(operation, context = '') {
    let lastError

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error

        if (!this.isRetryableError(error) || attempt === this.maxRetries) {
          console.error(`Database operation failed after ${attempt} attempts:`, error)
          throw error
        }

        const delay = this.calculateDelay(attempt)
        console.warn(`Database operation failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delay}ms:`, error.message)

        await this.delay(delay)
      }
    }

    throw lastError
  }

  isRetryableError(error) {
    const errorCode = error.code || error.errno
    return this.retryableErrors.includes(errorCode) ||
           error.message.toLowerCase().includes('connection') ||
           error.message.toLowerCase().includes('timeout')
  }

  calculateDelay(attempt) {
    const exponentialDelay = this.baseDelay * Math.pow(this.backoffFactor, attempt - 1)
    const jitter = Math.random() * 0.1 * exponentialDelay
    return Math.min(exponentialDelay + jitter, this.maxDelay)
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async query(text, params, context = '') {
    return this.executeWithRetry(
      () => this.connectionManager.query(text, params),
      context
    )
  }

  async transaction(callback, context = '') {
    return this.executeWithRetry(
      () => this.connectionManager.transaction(callback),
      context
    )
  }
}
```

## Data Modeling

Designing efficient database schemas for Discord bot data.

### User Data Model

```js
class UserModel {
  constructor(db) {
    this.db = db
    this.tableName = 'users'
  }

  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id BIGINT PRIMARY KEY,
        username VARCHAR(32) NOT NULL,
        discriminator SMALLINT,
        avatar VARCHAR(255),
        bot BOOLEAN DEFAULT FALSE,
        system BOOLEAN DEFAULT FALSE,
        mfa_enabled BOOLEAN DEFAULT FALSE,
        locale VARCHAR(10),
        verified BOOLEAN DEFAULT FALSE,
        email VARCHAR(255),
        flags INTEGER DEFAULT 0,
        premium_type SMALLINT DEFAULT 0,
        public_flags INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_username ON ${this.tableName}(username);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON ${this.tableName}(created_at);
    `

    await this.db.query(query)
  }

  async upsert(user) {
    const query = `
      INSERT INTO ${this.tableName} (
        id, username, discriminator, avatar, bot, system,
        mfa_enabled, locale, verified, email, flags,
        premium_type, public_flags, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        discriminator = EXCLUDED.discriminator,
        avatar = EXCLUDED.avatar,
        bot = EXCLUDED.bot,
        system = EXCLUDED.system,
        mfa_enabled = EXCLUDED.mfa_enabled,
        locale = EXCLUDED.locale,
        verified = EXCLUDED.verified,
        email = EXCLUDED.email,
        flags = EXCLUDED.flags,
        premium_type = EXCLUDED.premium_type,
        public_flags = EXCLUDED.public_flags,
        updated_at = NOW()
      RETURNING *
    `

    const values = [
      user.id,
      user.username,
      user.discriminator,
      user.avatar,
      user.bot,
      user.system,
      user.mfa_enabled,
      user.locale,
      user.verified,
      user.email,
      user.flags,
      user.premium_type,
      user.public_flags
    ]

    const result = await this.db.query(query, values)
    return result.rows[0]
  }

  async findById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`
    const result = await this.db.query(query, [id])
    return result.rows[0]
  }

  async findByUsername(username, discriminator = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE username = $1`
    const params = [username]

    if (discriminator) {
      query += ' AND discriminator = $2'
      params.push(discriminator)
    }

    const result = await this.db.query(query, params)
    return result.rows
  }

  async update(id, updates) {
    const fields = []
    const values = []
    let paramCount = 1

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue
      fields.push(`${key} = $${paramCount}`)
      values.push(value)
      paramCount++
    }

    if (fields.length === 0) return null

    values.push(id) // WHERE clause parameter

    const query = `
      UPDATE ${this.tableName}
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `

    const result = await this.db.query(query, values)
    return result.rows[0]
  }

  async delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`
    const result = await this.db.query(query, [id])
    return result.rows[0]
  }

  async getStats() {
    const query = `
      SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE bot = true) as bot_users,
        COUNT(*) FILTER (WHERE verified = true) as verified_users,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_account_age_seconds
      FROM ${this.tableName}
    `

    const result = await this.db.query(query)
    return result.rows[0]
  }
}
```

### Guild Data Model

```js
class GuildModel {
  constructor(db) {
    this.db = db
    this.tableName = 'guilds'
  }

  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id BIGINT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(255),
        splash VARCHAR(255),
        discovery_splash VARCHAR(255),
        owner_id BIGINT NOT NULL,
        region VARCHAR(50),
        afk_channel_id BIGINT,
        afk_timeout INTEGER DEFAULT 300,
        verification_level SMALLINT DEFAULT 0,
        default_message_notifications SMALLINT DEFAULT 0,
        explicit_content_filter SMALLINT DEFAULT 0,
        mfa_level SMALLINT DEFAULT 0,
        application_id BIGINT,
        system_channel_id BIGINT,
        system_channel_flags INTEGER DEFAULT 0,
        rules_channel_id BIGINT,
        joined_at TIMESTAMP WITH TIME ZONE,
        large BOOLEAN DEFAULT FALSE,
        unavailable BOOLEAN DEFAULT FALSE,
        member_count INTEGER DEFAULT 0,
        max_members INTEGER,
        premium_tier SMALLINT DEFAULT 0,
        premium_subscription_count INTEGER DEFAULT 0,
        vanity_url_code VARCHAR(50),
        description TEXT,
        banner VARCHAR(255),
        features TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_guilds_owner_id ON ${this.tableName}(owner_id);
      CREATE INDEX IF NOT EXISTS idx_guilds_region ON ${this.tableName}(region);
      CREATE INDEX IF NOT EXISTS idx_guilds_joined_at ON ${this.tableName}(joined_at);
    `

    await this.db.query(query)
  }

  async upsert(guild) {
    const features = guild.features ? `{${guild.features.join(',')}}` : null

    const query = `
      INSERT INTO ${this.tableName} (
        id, name, icon, splash, discovery_splash, owner_id, region,
        afk_channel_id, afk_timeout, verification_level,
        default_message_notifications, explicit_content_filter,
        mfa_level, application_id, system_channel_id,
        system_channel_flags, rules_channel_id, joined_at,
        large, unavailable, member_count, max_members,
        premium_tier, premium_subscription_count, vanity_url_code,
        description, banner, features, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
        $27, $28, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        icon = EXCLUDED.icon,
        splash = EXCLUDED.splash,
        discovery_splash = EXCLUDED.discovery_splash,
        owner_id = EXCLUDED.owner_id,
        region = EXCLUDED.region,
        afk_channel_id = EXCLUDED.afk_channel_id,
        afk_timeout = EXCLUDED.afk_timeout,
        verification_level = EXCLUDED.verification_level,
        default_message_notifications = EXCLUDED.default_message_notifications,
        explicit_content_filter = EXCLUDED.explicit_content_filter,
        mfa_level = EXCLUDED.mfa_level,
        application_id = EXCLUDED.application_id,
        system_channel_id = EXCLUDED.system_channel_id,
        system_channel_flags = EXCLUDED.system_channel_flags,
        rules_channel_id = EXCLUDED.rules_channel_id,
        joined_at = EXCLUDED.joined_at,
        large = EXCLUDED.large,
        unavailable = EXCLUDED.unavailable,
        member_count = EXCLUDED.member_count,
        max_members = EXCLUDED.max_members,
        premium_tier = EXCLUDED.premium_tier,
        premium_subscription_count = EXCLUDED.premium_subscription_count,
        vanity_url_code = EXCLUDED.vanity_url_code,
        description = EXCLUDED.description,
        banner = EXCLUDED.banner,
        features = EXCLUDED.features,
        updated_at = NOW()
      RETURNING *
    `

    const values = [
      guild.id, guild.name, guild.icon, guild.splash, guild.discoverySplash,
      guild.ownerId, guild.region, guild.afkChannelId, guild.afkTimeout,
      guild.verificationLevel, guild.defaultMessageNotifications,
      guild.explicitContentFilter, guild.mfaLevel, guild.applicationId,
      guild.systemChannelId, guild.systemChannelFlags, guild.rulesChannelId,
      guild.joinedAt, guild.large, guild.unavailable, guild.memberCount,
      guild.maxMembers, guild.premiumTier, guild.premiumSubscriptionCount,
      guild.vanityURLCode, guild.description, guild.banner, features
    ]

    const result = await this.db.query(query, values)
    return result.rows[0]
  }

  async findById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`
    const result = await this.db.query(query, [id])
    return result.rows[0]
  }

  async findByOwner(ownerId) {
    const query = `SELECT * FROM ${this.tableName} WHERE owner_id = $1 ORDER BY joined_at DESC`
    const result = await this.db.query(query, [ownerId])
    return result.rows
  }

  async getGuildStats() {
    const query = `
      SELECT
        COUNT(*) as total_guilds,
        AVG(member_count) as avg_members,
        SUM(member_count) as total_members,
        COUNT(*) FILTER (WHERE large = true) as large_guilds,
        AVG(premium_subscription_count) as avg_boosts,
        COUNT(*) FILTER (WHERE premium_tier > 0) as premium_guilds
      FROM ${this.tableName}
      WHERE unavailable = FALSE
    `

    const result = await this.db.query(query)
    return result.rows[0]
  }

  async updateMemberCount(guildId, count) {
    const query = `
      UPDATE ${this.tableName}
      SET member_count = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `

    const result = await this.db.query(query, [guildId, count])
    return result.rows[0]
  }
}
```

## Query Optimization

Optimizing database queries for better performance.

### Query Caching

```js
class QueryCache {
  constructor(options = {}) {
    this.cache = new Map()
    this.maxSize = options.maxSize || 1000
    this.ttl = options.ttl || 300000 // 5 minutes
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    }
  }

  get(key) {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      this.stats.deletes++
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return entry.value
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry (simple LRU approximation)
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
      this.stats.deletes++
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })

    this.stats.sets++
  }

  delete(key) {
    if (this.cache.delete(key)) {
      this.stats.deletes++
    }
  }

  clear() {
    this.cache.clear()
  }

  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses)
    }
  }

  cleanup() {
    const now = Date.now()
    const toDelete = []

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        toDelete.push(key)
      }
    }

    toDelete.forEach(key => {
      this.cache.delete(key)
      this.stats.deletes++
    })

    return toDelete.length
  }
}

class CachedDatabaseManager {
  constructor(db, cache) {
    this.db = db
    this.cache = cache
    this.cacheableQueries = new Set([
      'findById',
      'findByUsername',
      'getGuildStats',
      'getUserStats'
    ])
  }

  async query(text, params, options = {}) {
    const shouldCache = options.cache !== false && this.isCacheableQuery(text)
    const cacheKey = shouldCache ? this.generateCacheKey(text, params) : null

    if (shouldCache) {
      const cachedResult = this.cache.get(cacheKey)
      if (cachedResult) {
        return cachedResult
      }
    }

    const result = await this.db.query(text, params)

    if (shouldCache && cacheKey) {
      this.cache.set(cacheKey, result)
    }

    return result
  }

  isCacheableQuery(query) {
    // Simple check - in production you'd want more sophisticated logic
    const lowerQuery = query.toLowerCase()
    return lowerQuery.includes('select') && !lowerQuery.includes('insert') &&
           !lowerQuery.includes('update') && !lowerQuery.includes('delete')
  }

  generateCacheKey(text, params) {
    const paramsStr = params ? JSON.stringify(params) : ''
    return `${text}_${paramsStr}`
  }

  invalidateCache(pattern) {
    // Simple implementation - in production you'd want pattern matching
    if (pattern === 'users') {
      // Clear all user-related cache entries
      // Implementation depends on your cache key structure
    }
  }
}
```

### Batch Operations

```js
class BatchOperationManager {
  constructor(db) {
    this.db = db
    this.batchSize = 100
    this.operations = []
    this.flushInterval = 5000 // 5 seconds
    this.autoFlushTimer = null

    this.startAutoFlush()
  }

  startAutoFlush() {
    this.autoFlushTimer = setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  addOperation(operation) {
    this.operations.push(operation)

    if (this.operations.length >= this.batchSize) {
      this.flush()
    }
  }

  async flush() {
    if (this.operations.length === 0) return

    const operations = [...this.operations]
    this.operations = []

    try {
      await this.db.transaction(async (client) => {
        for (const operation of operations) {
          await operation(client)
        }
      })

      console.log(`Successfully executed ${operations.length} batched operations`)
    } catch (error) {
      console.error('Batch operation failed:', error)
      // Could implement retry logic here
    }
  }

  async addUser(user) {
    this.addOperation(async (client) => {
      const query = `
        INSERT INTO users (id, username, discriminator, avatar, bot)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          discriminator = EXCLUDED.discriminator,
          avatar = EXCLUDED.avatar,
          updated_at = NOW()
      `
      await client.query(query, [user.id, user.username, user.discriminator, user.avatar, user.bot])
    })
  }

  async updateUserXP(userId, xp) {
    this.addOperation(async (client) => {
      const query = `
        INSERT INTO user_xp (user_id, xp, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          xp = user_xp.xp + EXCLUDED.xp,
          updated_at = NOW()
      `
      await client.query(query, [userId, xp])
    })
  }

  getQueueSize() {
    return this.operations.length
  }

  async forceFlush() {
    await this.flush()
  }

  async close() {
    if (this.autoFlushTimer) {
      clearInterval(this.autoFlushTimer)
    }

    await this.flush() // Final flush
  }
}
```

## Data Consistency

Ensuring data consistency across operations.

### Transaction Management

```js
class TransactionManager {
  constructor(db) {
    this.db = db
    this.activeTransactions = new Map()
  }

  async beginTransaction(name = 'default') {
    const client = await this.db.getConnection()
    await client.query('BEGIN')

    const transaction = {
      client,
      name,
      startTime: Date.now(),
      operations: 0
    }

    this.activeTransactions.set(name, transaction)
    return transaction
  }

  async executeInTransaction(name, operation) {
    const transaction = this.activeTransactions.get(name)

    if (!transaction) {
      throw new Error(`No active transaction with name: ${name}`)
    }

    try {
      const result = await operation(transaction.client)
      transaction.operations++
      return result
    } catch (error) {
      console.error(`Transaction ${name} operation failed:`, error)
      throw error
    }
  }

  async commitTransaction(name) {
    const transaction = this.activeTransactions.get(name)

    if (!transaction) {
      throw new Error(`No active transaction with name: ${name}`)
    }

    try {
      await transaction.client.query('COMMIT')
      const duration = Date.now() - transaction.startTime

      console.log(`Transaction ${name} committed: ${transaction.operations} operations in ${duration}ms`)

      transaction.client.release()
      this.activeTransactions.delete(name)

      return { operations: transaction.operations, duration }
    } catch (error) {
      console.error(`Transaction ${name} commit failed:`, error)
      await this.rollbackTransaction(name)
      throw error
    }
  }

  async rollbackTransaction(name) {
    const transaction = this.activeTransactions.get(name)

    if (!transaction) {
      return // Already rolled back or committed
    }

    try {
      await transaction.client.query('ROLLBACK')
      console.log(`Transaction ${name} rolled back`)

      transaction.client.release()
      this.activeTransactions.delete(name)
    } catch (rollbackError) {
      console.error(`Transaction ${name} rollback failed:`, rollbackError)
      // Force release connection
      transaction.client.release()
      this.activeTransactions.delete(name)
    }
  }

  async withTransaction(name, callback) {
    const transaction = await this.beginTransaction(name)

    try {
      const result = await callback(transaction.client)
      await this.commitTransaction(name)
      return result
    } catch (error) {
      await this.rollbackTransaction(name)
      throw error
    }
  }

  getActiveTransactions() {
    const transactions = {}

    for (const [name, transaction] of this.activeTransactions) {
      transactions[name] = {
        name: transaction.name,
        startTime: transaction.startTime,
        operations: transaction.operations,
        duration: Date.now() - transaction.startTime
      }
    }

    return transactions
  }

  async forceRollbackAll() {
    const names = Array.from(this.activeTransactions.keys())

    for (const name of names) {
      await this.rollbackTransaction(name)
    }
  }
}
```

## Best Practices

### Implementation Guidelines

1. **Use connection pooling** to manage database connections efficiently
2. **Implement retry logic** for transient database errors
3. **Design normalized schemas** for Discord data structures
4. **Use appropriate indexes** for query performance
5. **Implement caching** for frequently accessed data
6. **Use transactions** for data consistency
7. **Batch operations** to reduce database load
8. **Monitor query performance** and optimize slow queries
9. **Handle connection failures** gracefully
10. **Implement proper error handling** and logging

### Production Considerations

```js
// Complete database management system
class ProductionDatabaseManager {
  constructor(config) {
    this.config = config

    // Core components
    this.connectionManager = new DatabaseConnectionManager(config.database)
    this.retryManager = new DatabaseRetryManager(this.connectionManager, config.retry)
    this.cache = new QueryCache(config.cache)
    this.cachedDb = new CachedDatabaseManager(this.retryManager, this.cache)
    this.transactionManager = new TransactionManager(this.connectionManager)
    this.batchManager = new BatchOperationManager(this.cachedDb)

    // Data models
    this.models = {
      users: new UserModel(this.cachedDb),
      guilds: new GuildModel(this.cachedDb)
    }

    // Monitoring
    this.startMonitoring()
  }

  startMonitoring() {
    // Periodic stats logging
    setInterval(() => {
      this.logStats()
    }, 300000) // Every 5 minutes

    // Cache cleanup
    setInterval(() => {
      const cleaned = this.cache.cleanup()
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired cache entries`)
      }
    }, 60000) // Every minute
  }

  logStats() {
    const connectionStats = this.connectionManager.getStats()
    const cacheStats = this.cache.getStats()
    const transactionStats = this.transactionManager.getActiveTransactions()

    console.log('Database Stats:', {
      connections: connectionStats,
      cache: cacheStats,
      activeTransactions: Object.keys(transactionStats).length
    })
  }

  async initialize() {
    try {
      // Create tables
      await this.models.users.createTable()
      await this.models.guilds.createTable()

      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Database initialization failed:', error)
      throw error
    }
  }

  async syncDiscordData(client) {
    console.log('Starting Discord data sync...')

    // Sync users
    for (const [userId, user] of client.users.cache) {
      await this.batchManager.addUser(user)
    }

    // Sync guilds
    for (const [guildId, guild] of client.guilds.cache) {
      await this.models.guilds.upsert(guild)
    }

    // Force flush batch operations
    await this.batchManager.forceFlush()

    console.log('Discord data sync completed')
  }

  async getStats() {
    const userStats = await this.models.users.getStats()
    const guildStats = await this.models.guilds.getGuildStats()

    return {
      users: userStats,
      guilds: guildStats,
      connections: this.connectionManager.getStats(),
      cache: this.cache.getStats(),
      batchQueue: this.batchManager.getQueueSize()
    }
  }

  async gracefulShutdown() {
    console.log('Starting database manager shutdown...')

    // Flush any pending batch operations
    await this.batchManager.close()

    // Rollback any active transactions
    await this.transactionManager.forceRollbackAll()

    // Close connections
    await this.connectionManager.close()

    console.log('Database manager shutdown complete')
  }
}
```

This comprehensive database management system provides reliable data storage, caching, and consistency for production Discord bots.