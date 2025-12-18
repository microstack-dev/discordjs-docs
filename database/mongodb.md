# MongoDB Integration

Discord.js v14.25.1 MongoDB integration for production bots. This section covers MongoDB connection management, document modeling, aggregation pipelines, and scaling strategies.

## MongoDB Connection Management

Establishing and managing MongoDB connections for Discord bots.

### Connection Setup

```javascript
const { MongoClient } = require('mongodb')

class MongoDBConnectionManager {
  constructor(config) {
    this.config = {
      url: config.url || 'mongodb://localhost:27017',
      databaseName: config.databaseName || 'discord_bot',
      options: {
        maxPoolSize: config.maxPoolSize || 10,
        minPoolSize: config.minPoolSize || 2,
        maxIdleTimeMS: config.maxIdleTimeMS || 30000,
        serverSelectionTimeoutMS: config.serverSelectionTimeoutMS || 5000,
        socketTimeoutMS: config.socketTimeoutMS || 45000,
        ...config.options
      }
    }

    this.client = null
    this.database = null
    this.isConnected = false
    this.connectionStats = {
      connectionsCreated: 0,
      connectionsClosed: 0,
      commandCount: 0,
      lastPing: null
    }
  }

  async connect() {
    try {
      console.log('Connecting to MongoDB...')

      this.client = new MongoClient(this.config.url, this.config.options)

      // Set up event handlers
      this.client.on('connectionCreated', () => {
        this.connectionStats.connectionsCreated++
      })

      this.client.on('connectionClosed', () => {
        this.connectionStats.connectionsClosed++
      })

      this.client.on('commandStarted', () => {
        this.connectionStats.commandCount++
      })

      await this.client.connect()
      this.database = this.client.db(this.config.databaseName)
      this.isConnected = true

      console.log(`Connected to MongoDB database: ${this.config.databaseName}`)

      // Start health monitoring
      this.startHealthMonitoring()

      return this.database
    } catch (error) {
      console.error('MongoDB connection failed:', error)
      throw error
    }
  }

  startHealthMonitoring() {
    // Ping database every 30 seconds
    setInterval(async () => {
      try {
        const pingResult = await this.database.admin().ping()
        this.connectionStats.lastPing = new Date()
      } catch (error) {
        console.error('MongoDB ping failed:', error)
        this.isConnected = false
      }
    }, 30000)
  }

  async disconnect() {
    if (this.client) {
      await this.client.close()
      this.isConnected = false
      console.log('Disconnected from MongoDB')
    }
  }

  getDatabase() {
    if (!this.isConnected || !this.database) {
      throw new Error('MongoDB not connected')
    }
    return this.database
  }

  getStats() {
    return {
      isConnected: this.isConnected,
      ...this.connectionStats,
      poolSize: this.client?.topology?.s?.pool?.size || 0
    }
  }

  // Collection helper
  collection(name) {
    return this.getDatabase().collection(name)
  }
}
```

### Connection Retry Logic

```javascript
class MongoDBRetryManager {
  constructor(connectionManager, options = {}) {
    this.connectionManager = connectionManager
    this.maxRetries = options.maxRetries || 3
    this.baseDelay = options.baseDelay || 1000
    this.maxDelay = options.maxDelay || 30000
    this.backoffFactor = options.backoffFactor || 2
    this.retryableErrors = options.retryableErrors || [
      'MongoNetworkError',
      'MongoTimeoutError',
      'MongoServerSelectionError'
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
          console.error(`MongoDB operation failed after ${attempt} attempts:`, error)
          throw error
        }

        const delay = this.calculateDelay(attempt)
        console.warn(`MongoDB operation failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delay}ms:`, error.message)

        await this.delay(delay)
      }
    }

    throw lastError
  }

  isRetryableError(error) {
    return this.retryableErrors.some(errorType =>
      error.name === errorType ||
      error.message.includes('connection') ||
      error.message.includes('timeout') ||
      error.message.includes('network')
    )
  }

  calculateDelay(attempt) {
    const exponentialDelay = this.baseDelay * Math.pow(this.backoffFactor, attempt - 1)
    const jitter = Math.random() * 0.1 * exponentialDelay
    return Math.min(exponentialDelay + jitter, this.maxDelay)
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async find(collection, query, options = {}) {
    return this.executeWithRetry(
      () => this.connectionManager.collection(collection).find(query, options).toArray(),
      `find ${collection}`
    )
  }

  async insertOne(collection, document) {
    return this.executeWithRetry(
      () => this.connectionManager.collection(collection).insertOne(document),
      `insertOne ${collection}`
    )
  }

  async updateOne(collection, filter, update, options = {}) {
    return this.executeWithRetry(
      () => this.connectionManager.collection(collection).updateOne(filter, update, options),
      `updateOne ${collection}`
    )
  }

  async deleteOne(collection, filter) {
    return this.executeWithRetry(
      () => this.connectionManager.collection(collection).deleteOne(filter),
      `deleteOne ${collection}`
    )
  }
}
```

## Document Modeling

Designing MongoDB documents for Discord data structures.

### User Document Model

```javascript
class UserModel {
  constructor(db) {
    this.collection = db.collection('users')
  }

  async createIndexes() {
    await this.collection.createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { username: 1 } },
      { key: { discriminator: 1 } },
      { key: { createdAt: 1 } },
      { key: { bot: 1 } }
    ])
  }

  async upsert(user) {
    const document = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      bot: user.bot,
      system: user.system,
      flags: user.flags,
      premiumType: user.premiumType,
      publicFlags: user.publicFlags,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await this.collection.updateOne(
      { id: user.id },
      {
        $set: document,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    )

    return result
  }

  async findById(id) {
    return await this.collection.findOne({ id: id.toString() })
  }

  async findByUsername(username, discriminator = null) {
    const query = { username }

    if (discriminator) {
      query.discriminator = discriminator.toString()
    }

    return await this.collection.find(query).toArray()
  }

  async searchUsers(searchTerm, limit = 10) {
    return await this.collection.find({
      $or: [
        { username: new RegExp(searchTerm, 'i') },
        { discriminator: searchTerm }
      ]
    }).limit(limit).toArray()
  }

  async updateProfile(userId, profileData) {
    return await this.collection.updateOne(
      { id: userId.toString() },
      {
        $set: {
          ...profileData,
          updatedAt: new Date()
        }
      }
    )
  }

  async getUserStats() {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          botUsers: { $sum: { $cond: ['$bot', 1, 0] } },
          verifiedUsers: { $sum: { $cond: ['$verified', 1, 0] } },
          avgAccountAge: { $avg: { $subtract: [new Date(), '$createdAt'] } }
        }
      }
    ]

    const result = await this.collection.aggregate(pipeline).toArray()
    return result[0] || {}
  }
}
```

### Guild Document Model

```javascript
class GuildModel {
  constructor(db) {
    this.collection = db.collection('guilds')
  }

  async createIndexes() {
    await this.collection.createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { name: 1 } },
      { key: { ownerId: 1 } },
      { key: { memberCount: -1 } },
      { key: { createdAt: 1 } },
      { key: { region: 1 } },
      { key: { 'members.userId': 1 } },
      { key: { 'channels.id': 1 } },
      { key: { 'roles.id': 1 } }
    ])
  }

  async upsert(guild) {
    const document = {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      splash: guild.discoverySplash,
      banner: guild.banner,
      description: guild.description,
      ownerId: guild.ownerId,
      region: guild.region,
      afkChannelId: guild.afkChannelId,
      afkTimeout: guild.afkTimeout,
      verificationLevel: guild.verificationLevel,
      explicitContentFilter: guild.explicitContentFilter,
      mfaLevel: guild.mfaLevel,
      applicationId: guild.applicationId,
      systemChannelId: guild.systemChannelId,
      rulesChannelId: guild.rulesChannelId,
      publicUpdatesChannelId: guild.publicUpdatesChannelId,
      preferredLocale: guild.preferredLocale,
      features: guild.features,
      premiumTier: guild.premiumTier,
      premiumSubscriptionCount: guild.premiumSubscriptionCount,
      maxMembers: guild.maxMembers,
      maxPresences: guild.maxPresences,
      approximateMemberCount: guild.approximateMemberCount,
      approximatePresenceCount: guild.approximatePresenceCount,
      widgetEnabled: guild.widgetEnabled,
      widgetChannelId: guild.widgetChannelId,
      systemChannelFlags: guild.systemChannelFlags,
      embedChannelId: guild.embedChannelId,
      createdAt: new Date(),
      updatedAt: new Date(),

      // Embedded documents
      members: [], // Will be populated separately
      channels: [], // Will be populated separately
      roles: [], // Will be populated separately
      emojis: [], // Will be populated separately
    }

    const result = await this.collection.updateOne(
      { id: guild.id },
      {
        $set: document,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    )

    return result
  }

  async addMember(guildId, memberData) {
    return await this.collection.updateOne(
      { id: guildId.toString() },
      {
        $addToSet: {
          members: {
            userId: memberData.userId,
            joinedAt: memberData.joinedAt || new Date(),
            nickname: memberData.nickname,
            roles: memberData.roles || [],
            deaf: memberData.deaf || false,
            mute: memberData.mute || false,
            premiumSince: memberData.premiumSince
          }
        },
        $set: { updatedAt: new Date() }
      }
    )
  }

  async updateMember(guildId, userId, updateData) {
    const updateObj = {}

    Object.keys(updateData).forEach(key => {
      updateObj[`members.$.${key}`] = updateData[key]
    })

    updateObj['updatedAt'] = new Date()

    return await this.collection.updateOne(
      {
        id: guildId.toString(),
        'members.userId': userId.toString()
      },
      { $set: updateObj }
    )
  }

  async removeMember(guildId, userId) {
    return await this.collection.updateOne(
      { id: guildId.toString() },
      {
        $pull: { members: { userId: userId.toString() } },
        $set: { updatedAt: new Date() }
      }
    )
  }

  async getGuildWithMembers(guildId) {
    return await this.collection.findOne(
      { id: guildId.toString() },
      {
        projection: {
          members: 1,
          name: 1,
          memberCount: { $size: '$members' }
        }
      }
    )
  }

  async getGuildStats() {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalGuilds: { $sum: 1 },
          avgMembers: { $avg: { $size: '$members' } },
          totalMembers: { $sum: { $size: '$members' } },
          largeGuilds: { $sum: { $cond: [{ $gt: [{ $size: '$members' }, 250] }, 1, 0] } },
          premiumGuilds: { $sum: { $cond: ['$premiumTier', 1, 0] } }
        }
      }
    ]

    const result = await this.collection.aggregate(pipeline).toArray()
    return result[0] || {}
  }
}
```

## Aggregation Pipelines

Advanced queries using MongoDB aggregation framework.

### User Activity Analytics

```javascript
class UserActivityAnalytics {
  constructor(db) {
    this.collection = db.collection('messages')
  }

  async getUserActivityReport(userId, days = 30) {
    const pipeline = [
      {
        $match: {
          authorId: userId.toString(),
          createdAt: {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            }
          },
          messageCount: { $sum: 1 },
          totalLength: { $sum: { $strLenCP: '$content' } },
          channels: { $addToSet: '$channelId' },
          firstMessage: { $min: '$createdAt' },
          lastMessage: { $max: '$createdAt' }
        }
      },
      {
        $sort: { '_id.date': 1 }
      },
      {
        $group: {
          _id: null,
          dailyStats: { $push: '$$ROOT' },
          totalMessages: { $sum: '$messageCount' },
          totalLength: { $sum: '$totalLength' },
          uniqueChannels: { $addToSet: '$channels' },
          avgMessagesPerDay: { $avg: '$messageCount' }
        }
      },
      {
        $project: {
          dailyStats: 1,
          totalMessages: 1,
          totalLength: 1,
          uniqueChannels: { $size: { $reduce: {
            input: '$uniqueChannels',
            initialValue: [],
            in: { $setUnion: ['$$value', '$$this'] }
          }}},
          avgMessagesPerDay: 1,
          avgMessageLength: { $divide: ['$totalLength', '$totalMessages'] }
        }
      }
    ]

    const result = await this.collection.aggregate(pipeline).toArray()
    return result[0] || {}
  }

  async getTopActiveUsers(guildId, limit = 10, days = 7) {
    const pipeline = [
      {
        $match: {
          guildId: guildId.toString(),
          createdAt: {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: '$authorId',
          messageCount: { $sum: 1 },
          totalLength: { $sum: { $strLenCP: '$content' } },
          uniqueChannels: { $addToSet: '$channelId' },
          lastMessage: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userId: '$_id',
          username: '$user.username',
          discriminator: '$user.discriminator',
          avatar: '$user.avatar',
          messageCount: 1,
          totalLength: 1,
          uniqueChannelsCount: { $size: '$uniqueChannels' },
          avgMessageLength: { $divide: ['$totalLength', '$messageCount'] },
          lastMessage: 1
        }
      },
      {
        $sort: { messageCount: -1 }
      },
      {
        $limit: limit
    ]

    return await this.collection.aggregate(pipeline).toArray()
  }

  async getChannelActivityHeatmap(guildId, days = 30) {
    const pipeline = [
      {
        $match: {
          guildId: guildId.toString(),
          createdAt: {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            channelId: '$channelId',
            hour: { $hour: '$createdAt' },
            dayOfWeek: { $dayOfWeek: '$createdAt' }
          },
          messageCount: { $sum: 1 },
          activeUsers: { $addToSet: '$authorId' }
        }
      },
      {
        $group: {
          _id: '$_id.channelId',
          hourlyStats: {
            $push: {
              hour: '$_id.hour',
              dayOfWeek: '$_id.dayOfWeek',
              messageCount: '$messageCount',
              activeUsers: { $size: '$activeUsers' }
            }
          },
          totalMessages: { $sum: '$messageCount' }
        }
      },
      {
        $lookup: {
          from: 'channels',
          localField: '_id',
          foreignField: 'id',
          as: 'channel'
        }
      },
      {
        $unwind: '$channel'
      },
      {
        $project: {
          channelId: '$_id',
          channelName: '$channel.name',
          hourlyStats: 1,
          totalMessages: 1
        }
      },
      {
        $sort: { totalMessages: -1 }
      }
    ]

    return await this.collection.aggregate(pipeline).toArray()
  }
}
```

### Guild Analytics Pipeline

```javascript
class GuildAnalytics {
  constructor(db) {
    this.collection = db.collection('messages')
  }

  async getGuildActivitySummary(guildId, days = 30) {
    const pipeline = [
      {
        $match: {
          guildId: guildId.toString(),
          createdAt: {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $facet: {
          dailyStats: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt'
                  }
                },
                messageCount: { $sum: 1 },
                activeUsers: { $addToSet: '$authorId' },
                activeChannels: { $addToSet: '$channelId' }
              }
            },
            {
              $sort: { '_id': 1 }
            }
          ],
          userStats: [
            {
              $group: {
                _id: '$authorId',
                messageCount: { $sum: 1 },
                totalLength: { $sum: { $strLenCP: '$content' } },
                firstMessage: { $min: '$createdAt' },
                lastMessage: { $max: '$createdAt' }
              }
            },
            {
              $sort: { messageCount: -1 }
            },
            {
              $limit: 50
            }
          ],
          channelStats: [
            {
              $group: {
                _id: '$channelId',
                messageCount: { $sum: 1 },
                activeUsers: { $addToSet: '$authorId' },
                lastMessage: { $max: '$createdAt' }
              }
            },
            {
              $sort: { messageCount: -1 }
            }
          ],
          contentStats: [
            {
              $match: { content: { $exists: true, $ne: '' } }
            },
            {
              $group: {
                _id: null,
                totalMessages: { $sum: 1 },
                totalLength: { $sum: { $strLenCP: '$content' } },
                avgLength: { $avg: { $strLenCP: '$content' } },
                messagesWithAttachments: {
                  $sum: { $cond: [{ $gt: [{ $size: '$attachments' }, 0] }, 1, 0] }
                },
                messagesWithEmbeds: {
                  $sum: { $cond: [{ $gt: [{ $size: '$embeds' }, 0] }, 1, 0] }
                }
              }
            }
          ]
        }
      }
    ]

    const result = await this.collection.aggregate(pipeline).toArray()
    return result[0] || {}
  }

  async getMessageTrends(guildId, hours = 24) {
    const pipeline = [
      {
        $match: {
          guildId: guildId.toString(),
          createdAt: {
            $gte: new Date(Date.now() - hours * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d %H:00:00',
              date: '$createdAt'
            }
          },
          messageCount: { $sum: 1 },
          activeUsers: { $addToSet: '$authorId' },
          activeChannels: { $addToSet: '$channelId' }
        }
      },
      {
        $sort: { '_id': 1 }
      },
      {
        $project: {
          hour: '$_id',
          messageCount: 1,
          activeUsers: { $size: '$activeUsers' },
          activeChannels: { $size: '$activeChannels' }
        }
      }
    ]

    return await this.collection.aggregate(pipeline).toArray()
  }
}
```

## Scaling Strategies

MongoDB scaling patterns for high-traffic Discord bots.

### Sharding Configuration

```javascript
class MongoDBShardManager {
  constructor(client) {
    this.client = client
    this.adminDb = client.db('admin')
  }

  async enableSharding(databaseName) {
    try {
      // Enable sharding for database
      await this.adminDb.command({ enableSharding: databaseName })
      console.log(`Sharding enabled for database: ${databaseName}`)
    } catch (error) {
      console.error('Failed to enable sharding:', error)
      throw error
    }
  }

  async shardCollection(databaseName, collectionName, key) {
    try {
      const namespace = `${databaseName}.${collectionName}`

      // Create shard key index
      const db = this.client.db(databaseName)
      await db.collection(collectionName).createIndex(key)

      // Shard the collection
      await this.adminDb.command({
        shardCollection: namespace,
        key: key
      })

      console.log(`Collection ${namespace} sharded with key:`, key)
    } catch (error) {
      console.error(`Failed to shard collection ${collectionName}:`, error)
      throw error
    }
  }

  async getShardStats(databaseName) {
    try {
      const stats = await this.adminDb.command({
        listShards: 1
      })

      const dbStats = await this.adminDb.command({
        dbStats: 1,
        db: databaseName
      })

      return {
        shards: stats.shards,
        database: dbStats
      }
    } catch (error) {
      console.error('Failed to get shard stats:', error)
      throw error
    }
  }

  // Shard collections based on Discord data patterns
  async setupDiscordSharding(databaseName) {
    // Shard users by id (distributed evenly)
    await this.shardCollection(databaseName, 'users', { id: 1 })

    // Shard guilds by id (distributed evenly)
    await this.shardCollection(databaseName, 'guilds', { id: 1 })

    // Shard messages by guild_id and timestamp (hotspot mitigation)
    await this.shardCollection(databaseName, 'messages', {
      guildId: 1,
      createdAt: 1
    })

    // Shard user activity by user_id and date
    await this.shardCollection(databaseName, 'user_activity', {
      userId: 1,
      date: 1
    })
  }
}
```

### Replica Set Management

```javascript
class MongoDBReplicaManager {
  constructor(client) {
    this.client = client
    this.isMaster = false
    this.replicaStats = {}
  }

  async checkReplicaStatus() {
    try {
      const status = await this.client.db('admin').command({ replSetGetStatus: 1 })

      this.isMaster = status.myState === 1 // PRIMARY state
      this.replicaStats = {
        set: status.set,
        myState: status.myState,
        members: status.members.map(member => ({
          name: member.name,
          state: member.state,
          stateStr: member.stateStr,
          uptime: member.uptime,
          pingMs: member.pingMs
        }))
      }

      return this.replicaStats
    } catch (error) {
      console.error('Failed to check replica status:', error)
      this.isMaster = false
      return null
    }
  }

  isPrimary() {
    return this.isMaster
  }

  getReplicaStats() {
    return this.replicaStats
  }

  async waitForPrimary(timeout = 30000) {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const status = await this.checkReplicaStatus()

      if (this.isMaster) {
        return true
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    throw new Error('Timeout waiting for primary replica')
  }
}
```

## Best Practices

### Implementation Guidelines

1. **Use connection pooling** with appropriate pool sizes for your workload
2. **Implement retry logic** with exponential backoff for transient errors
3. **Design documents** with embedding for frequently accessed related data
4. **Create strategic indexes** for query patterns, avoiding over-indexing
5. **Use aggregation pipelines** for complex analytics and reporting
6. **Implement proper error handling** with detailed logging
7. **Monitor connection health** and performance metrics
8. **Use read preferences** to distribute read load across replicas
9. **Plan for sharding** early if expecting high write loads
10. **Regularly backup** and test restore procedures

### Production Considerations

```javascript
// Complete MongoDB management system
class ProductionMongoDBManager {
  constructor(config) {
    this.connectionManager = new MongoDBConnectionManager(config.database)
    this.retryManager = new MongoDBRetryManager(this.connectionManager, config.retry)
    this.shardManager = new MongoDBShardManager(this.connectionManager.client)
    this.replicaManager = new MongoDBReplicaManager(this.connectionManager.client)

    // Data models
    this.models = {
      users: new UserModel(this.retryManager),
      guilds: new GuildModel(this.retryManager),
      analytics: new UserActivityAnalytics(this.retryManager)
    }

    // Stats
    this.stats = {
      uptime: Date.now(),
      totalOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0
    }
  }

  async initialize() {
    try {
      await this.connectionManager.connect()

      // Create indexes
      await Promise.all([
        this.models.users.createIndexes(),
        this.models.guilds.createIndexes()
      ])

      // Check replica status
      await this.replicaManager.checkReplicaStatus()

      console.log('Production MongoDB manager initialized')
    } catch (error) {
      console.error('MongoDB initialization failed:', error)
      throw error
    }
  }

  async syncDiscordData(client) {
    console.log('Starting Discord data sync to MongoDB...')

    // Sync in batches to avoid overwhelming the database
    const batchSize = 100

    // Sync users
    const users = Array.from(client.users.cache.values())
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      await Promise.all(batch.map(user => this.models.users.upsert(user)))
    }

    // Sync guilds with members
    for (const [guildId, guild] of client.guilds.cache) {
      await this.models.guilds.upsert(guild)

      // Sync members
      const members = Array.from(guild.members.cache.values())
      for (let i = 0; i < members.length; i += batchSize) {
        const batch = members.slice(i, i + batchSize)
        await Promise.all(batch.map(member =>
          this.models.guilds.addMember(guildId, {
            userId: member.user.id,
            joinedAt: member.joinedAt,
            nickname: member.nickname,
            roles: member.roles.cache.map(role => role.id),
            deaf: member.voice.deaf,
            mute: member.voice.mute
          })
        ))
      }
    }

    console.log('Discord data sync to MongoDB completed')
  }

  async getSystemStats() {
    const connectionStats = this.connectionManager.getStats()
    const replicaStats = this.replicaManager.getReplicaStats()

    return {
      ...this.stats,
      connections: connectionStats,
      replica: replicaStats,
      isPrimary: this.replicaManager.isPrimary()
    }
  }

  async gracefulShutdown() {
    console.log('Starting MongoDB manager shutdown...')

    await this.connectionManager.disconnect()

    console.log('MongoDB manager shutdown complete')
  }
}
```

This comprehensive MongoDB integration provides scalable, high-performance data storage for production Discord bots with advanced querying, analytics, and scaling capabilities.