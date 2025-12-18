# Prisma Integration

Discord.js v14.25.1 Prisma ORM integration for production bots. This section covers Prisma schema definition, database migrations, query optimization, and production deployment patterns.

## Prisma Setup

Configuring Prisma for Discord bot databases.

### Schema Definition

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @db.VarChar(20)
  username      String   @db.VarChar(32)
  discriminator String   @db.VarChar(4)
  avatar        String?  @db.VarChar(255)
  bot           Boolean  @default(false)
  system        Boolean  @default(false)
  flags         Int      @default(0)
  premiumType   Int      @default(0)
  createdAt     DateTime @default(now()) @db.Timestamptz
  updatedAt     DateTime @updatedAt @db.Timestamptz

  // Relations
  messages      Message[]
  guildMembers  GuildMember[]
  createdGuilds Guild[]       @relation("GuildOwner")

  @@map("users")
}

model Guild {
  id                       String  @id @db.VarChar(20)
  name                     String  @db.VarChar(100)
  icon                     String? @db.VarChar(255)
  splash                   String? @db.VarChar(255)
  banner                   String? @db.VarChar(255)
  description              String?
  ownerId                  String  @db.VarChar(20)
  region                   String  @db.VarChar(50)
  afkChannelId             String? @db.VarChar(20)
  afkTimeout               Int     @default(300)
  verificationLevel        Int     @default(0)
  explicitContentFilter    Int     @default(0)
  mfaLevel                 Int     @default(0)
  applicationId            String? @db.VarChar(20)
  systemChannelId          String? @db.VarChar(20)
  systemChannelFlags       Int     @default(0)
  rulesChannelId           String? @db.VarChar(20)
  publicUpdatesChannelId   String? @db.VarChar(20)
  preferredLocale          String  @default("en-US") @db.VarChar(10)
  features                 String[]
  premiumTier              Int     @default(0)
  premiumSubscriptionCount Int     @default(0)
  maxMembers               Int?
  widgetEnabled            Boolean @default(false)
  widgetChannelId          String? @db.VarChar(20)
  createdAt                DateTime @default(now()) @db.Timestamptz
  updatedAt                DateTime @updatedAt @db.Timestamptz

  // Relations
  owner         User          @relation("GuildOwner", fields: [ownerId], references: [id])
  members       GuildMember[]
  channels      Channel[]
  roles         Role[]
  messages      Message[]
  bans          GuildBan[]

  @@map("guilds")
}

model GuildMember {
  guildId   String   @db.VarChar(20)
  userId    String   @db.VarChar(20)
  nickname  String?  @db.VarChar(32)
  joinedAt  DateTime @default(now()) @db.Timestamptz
  roles     String[] @default([])
  deaf      Boolean  @default(false)
  mute      Boolean  @default(false)
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  // Relations
  guild Guild @relation(fields: [guildId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([guildId, userId])
  @@map("guild_members")
}

model Channel {
  id          String   @id @db.VarChar(20)
  guildId     String?  @db.VarChar(20)
  name        String   @db.VarChar(100)
  type        Int
  position    Int      @default(0)
  topic       String?
  nsfw        Boolean  @default(false)
  bitrate     Int?
  userLimit   Int?
  rateLimit   Int      @default(0)
  parentId    String?  @db.VarChar(20)
  createdAt   DateTime @default(now()) @db.Timestamptz
  updatedAt   DateTime @updatedAt @db.Timestamptz

  // Relations
  guild    Guild?    @relation(fields: [guildId], references: [id], onDelete: Cascade)
  parent   Channel?  @relation("ChannelParent", fields: [parentId], references: [id])
  children Channel[] @relation("ChannelParent")
  messages Message[]

  @@map("channels")
}

model Message {
  id              String    @id @db.VarChar(20)
  channelId       String    @db.VarChar(20)
  authorId        String    @db.VarChar(20)
  content         String?
  type            Int       @default(0)
  editedTimestamp DateTime? @db.Timestamptz
  tts             Boolean   @default(false)
  mentionEveryone Boolean   @default(false)
  mentions        String[]  @default([])
  mentionRoles    String[]  @default([])
  attachments     Json      @default("[]")
  embeds          Json      @default("[]")
  reactions       Json      @default("[]")
  pinned          Boolean   @default(false)
  createdAt       DateTime  @default(now()) @db.Timestamptz

  // Relations
  channel Channel @relation(fields: [channelId], references: [id], onDelete: Cascade)
  author  User    @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@map("messages")
}

model Role {
  id          String  @id @db.VarChar(20)
  guildId     String  @db.VarChar(20)
  name        String  @db.VarChar(100)
  color       Int     @default(0)
  hoist       Boolean @default(false)
  position    Int     @default(0)
  permissions String  @default("0") @db.VarChar(20)
  mentionable Boolean @default(false)
  createdAt   DateTime @default(now()) @db.Timestamptz
  updatedAt   DateTime @updatedAt @db.Timestamptz

  // Relations
  guild Guild @relation(fields: [guildId], references: [id], onDelete: Cascade)

  @@unique([guildId, position])
  @@map("roles")
}

model GuildBan {
  guildId  String   @db.VarChar(20)
  userId   String   @db.VarChar(20)
  reason   String?
  bannedBy String   @db.VarChar(20)
  bannedAt DateTime @default(now()) @db.Timestamptz
  expiresAt DateTime? @db.Timestamptz

  // Relations
  guild Guild @relation(fields: [guildId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([guildId, userId])
  @@map("guild_bans")
}

// Bot-specific models
model UserXP {
  userId    String   @db.VarChar(20)
  guildId   String   @db.VarChar(20)
  xp        Int      @default(0)
  level     Int      @default(1)
  lastMessage DateTime @default(now()) @db.Timestamptz
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  // Relations
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  guild Guild @relation(fields: [guildId], references: [id], onDelete: Cascade)

  @@id([userId, guildId])
  @@map("user_xp")
}

model GuildSettings {
  guildId       String  @db.VarChar(20)
  prefix        String  @default("!") @db.VarChar(5)
  welcomeChannel String? @db.VarChar(20)
  logChannel    String? @db.VarChar(20)
  muteRole      String? @db.VarChar(20)
  modRoles      String[] @default([])
  disabledCommands String[] @default([])
  autoMod       Json    @default("{}")
  createdAt     DateTime @default(now()) @db.Timestamptz
  updatedAt     DateTime @updatedAt @db.Timestamptz

  // Relations
  guild Guild @relation(fields: [guildId], references: [id], onDelete: Cascade)

  @@id([guildId])
  @@map("guild_settings")
}
```

### Client Initialization

```javascript
const { PrismaClient } = require('@prisma/client')

class PrismaManager {
  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty'
    })

    this.isConnected = false
  }

  async connect() {
    try {
      await this.prisma.$connect()
      this.isConnected = true
      console.log('Connected to database via Prisma')
    } catch (error) {
      console.error('Failed to connect to database:', error)
      throw error
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect()
      this.isConnected = false
      console.log('Disconnected from database')
    } catch (error) {
      console.error('Error disconnecting from database:', error)
    }
  }

  getClient() {
    if (!this.isConnected) {
      throw new Error('Prisma client not connected')
    }
    return this.prisma
  }

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { status: 'healthy', timestamp: new Date() }
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date() }
    }
  }
}
```

## Data Models

Prisma-based data access layer for Discord entities.

### User Model

```javascript
class UserRepository {
  constructor(prisma) {
    this.prisma = prisma
  }

  async create(data) {
    return await this.prisma.user.create({
      data: {
        id: data.id,
        username: data.username,
        discriminator: data.discriminator,
        avatar: data.avatar,
        bot: data.bot || false,
        system: data.system || false,
        flags: data.flags || 0,
        premiumType: data.premiumType || 0
      }
    })
  }

  async upsert(data) {
    return await this.prisma.user.upsert({
      where: { id: data.id },
      update: {
        username: data.username,
        discriminator: data.discriminator,
        avatar: data.avatar,
        flags: data.flags,
        premiumType: data.premiumType
      },
      create: {
        id: data.id,
        username: data.username,
        discriminator: data.discriminator,
        avatar: data.avatar,
        bot: data.bot || false,
        system: data.system || false,
        flags: data.flags || 0,
        premiumType: data.premiumType || 0
      }
    })
  }

  async findById(id) {
    return await this.prisma.user.findUnique({
      where: { id }
    })
  }

  async findByUsername(username, discriminator = null) {
    const where = { username }
    if (discriminator) {
      where.discriminator = discriminator
    }

    return await this.prisma.user.findMany({
      where
    })
  }

  async searchUsers(query, limit = 10) {
    return await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { discriminator: query }
        ]
      },
      take: limit,
      orderBy: { username: 'asc' }
    })
  }

  async getUserStats() {
    const [totalUsers, botUsers, verifiedUsers, avgAge] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { bot: true } }),
      this.prisma.user.count({ where: { flags: { gte: 1 } } }), // Simplified
      this.prisma.user.aggregate({
        _count: true,
        _avg: {
          createdAt: true
        }
      })
    ])

    return {
      totalUsers,
      botUsers,
      verifiedUsers,
      avgAccountAge: avgAge._avg.createdAt
    }
  }

  async updateProfile(userId, profileData) {
    // Assuming we have a UserProfile model
    return await this.prisma.userProfile.upsert({
      where: { userId },
      update: profileData,
      create: { userId, ...profileData }
    })
  }

  async delete(id) {
    return await this.prisma.user.delete({
      where: { id }
    })
  }
}
```

### Guild Model

```javascript
class GuildRepository {
  constructor(prisma) {
    this.prisma = prisma
  }

  async create(data) {
    return await this.prisma.guild.create({
      data: {
        id: data.id,
        name: data.name,
        icon: data.icon,
        ownerId: data.ownerId,
        region: data.region,
        features: data.features || [],
        verificationLevel: data.verificationLevel || 0,
        explicitContentFilter: data.explicitContentFilter || 0
      }
    })
  }

  async upsert(data) {
    return await this.prisma.guild.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        icon: data.icon,
        region: data.region,
        features: data.features,
        verificationLevel: data.verificationLevel,
        explicitContentFilter: data.explicitContentFilter,
        premiumTier: data.premiumTier,
        premiumSubscriptionCount: data.premiumSubscriptionCount
      },
      create: {
        id: data.id,
        name: data.name,
        icon: data.icon,
        ownerId: data.ownerId,
        region: data.region,
        features: data.features || [],
        verificationLevel: data.verificationLevel || 0,
        explicitContentFilter: data.explicitContentFilter || 0,
        premiumTier: data.premiumTier || 0,
        premiumSubscriptionCount: data.premiumSubscriptionCount || 0
      }
    })
  }

  async findById(id) {
    return await this.prisma.guild.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: true }
        },
        channels: true,
        roles: true,
        owner: true
      }
    })
  }

  async findByOwner(ownerId) {
    return await this.prisma.guild.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' }
    })
  }

  async addMember(guildId, userId, memberData = {}) {
    return await this.prisma.guildMember.upsert({
      where: {
        guildId_userId: {
          guildId,
          userId
        }
      },
      update: {
        nickname: memberData.nickname,
        roles: memberData.roles || [],
        deaf: memberData.deaf || false,
        mute: memberData.mute || false
      },
      create: {
        guildId,
        userId,
        nickname: memberData.nickname,
        roles: memberData.roles || [],
        deaf: memberData.deaf || false,
        mute: memberData.mute || false,
        joinedAt: memberData.joinedAt || new Date()
      }
    })
  }

  async removeMember(guildId, userId) {
    return await this.prisma.guildMember.delete({
      where: {
        guildId_userId: {
          guildId,
          userId
        }
      }
    })
  }

  async updateMemberRoles(guildId, userId, roles) {
    return await this.prisma.guildMember.update({
      where: {
        guildId_userId: {
          guildId,
          userId
        }
      },
      data: { roles }
    })
  }

  async getGuildStats() {
    const [totalGuilds, avgMembers, totalMembers, largeGuilds] = await Promise.all([
      this.prisma.guild.count(),
      this.prisma.guildMember.groupBy({
        by: ['guildId'],
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } }
      }).then(groups => {
        const total = groups.reduce((sum, group) => sum + group._count.userId, 0)
        return total / groups.length
      }),
      this.prisma.guildMember.count(),
      this.prisma.guild.count({
        where: {
          members: {
            some: {} // This is a simplified check
          }
        }
      })
    ])

    return {
      totalGuilds,
      avgMembers: Math.round(avgMembers),
      totalMembers,
      largeGuilds
    }
  }
}
```

## Migration Management

Handling schema changes with Prisma migrations.

### Migration Setup

```javascript
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

class PrismaMigrationManager {
  constructor() {
    this.migrationDir = 'prisma/migrations'
    this.schemaPath = 'prisma/schema.prisma'
  }

  async createMigration(name, description = '') {
    try {
      // Generate migration
      const result = execSync(`npx prisma migrate dev --create-only --name ${name}`, {
        encoding: 'utf8',
        cwd: process.cwd()
      })

      console.log('Migration created:', result)

      // Add description to migration file if provided
      if (description) {
        await this.addMigrationDescription(name, description)
      }

      return result
    } catch (error) {
      console.error('Failed to create migration:', error)
      throw error
    }
  }

  async addMigrationDescription(migrationName, description) {
    // Find the latest migration file
    const migrations = fs.readdirSync(this.migrationDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .reverse()

    if (migrations.length === 0) return

    const migrationFile = path.join(this.migrationDir, migrations[0])
    const content = fs.readFileSync(migrationFile, 'utf8')

    // Add comment at the top
    const updatedContent = `-- ${description}\n${content}`
    fs.writeFileSync(migrationFile, updatedContent)
  }

  async applyMigrations() {
    try {
      console.log('Applying Prisma migrations...')

      const result = execSync('npx prisma migrate deploy', {
        encoding: 'utf8',
        cwd: process.cwd()
      })

      console.log('Migrations applied successfully')
      return result
    } catch (error) {
      console.error('Failed to apply migrations:', error)
      throw error
    }
  }

  async resetDatabase() {
    try {
      console.log('Resetting database...')

      const result = execSync('npx prisma migrate reset --force', {
        encoding: 'utf8',
        cwd: process.cwd()
      })

      console.log('Database reset successfully')
      return result
    } catch (error) {
      console.error('Failed to reset database:', error)
      throw error
    }
  }

  async generateClient() {
    try {
      console.log('Generating Prisma client...')

      const result = execSync('npx prisma generate', {
        encoding: 'utf8',
        cwd: process.cwd()
      })

      console.log('Prisma client generated successfully')
      return result
    } catch (error) {
      console.error('Failed to generate Prisma client:', error)
      throw error
    }
  }

  async validateSchema() {
    try {
      const result = execSync('npx prisma validate', {
        encoding: 'utf8',
        cwd: process.cwd()
      })

      console.log('Schema validation passed')
      return true
    } catch (error) {
      console.error('Schema validation failed:', error)
      return false
    }
  }

  async getMigrationStatus() {
    try {
      const applied = await this.getAppliedMigrations()
      const pending = await this.getPendingMigrations()

      return {
        applied: applied.length,
        pending: pending.length,
        migrations: {
          applied,
          pending
        }
      }
    } catch (error) {
      console.error('Failed to get migration status:', error)
      throw error
    }
  }

  async getAppliedMigrations() {
    // This would query the _prisma_migrations table
    // Implementation depends on your database setup
    return []
  }

  async getPendingMigrations() {
    const migrations = fs.readdirSync(this.migrationDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    const applied = await this.getAppliedMigrations()
    const appliedNames = applied.map(m => m.name)

    return migrations.filter(migration =>
      !appliedNames.includes(path.basename(migration, '.sql'))
    )
  }
}
```

### Migration Scripts

```javascript
class DiscordDataMigration {
  constructor(prisma) {
    this.prisma = prisma
  }

  async migrateExistingData() {
    console.log('Starting Discord data migration...')

    // Migrate users table structure
    await this.migrateUsers()

    // Migrate guilds and members
    await this.migrateGuilds()

    // Migrate messages
    await this.migrateMessages()

    // Create indexes for performance
    await this.createPerformanceIndexes()

    console.log('Discord data migration completed')
  }

  async migrateUsers() {
    // Migrate existing user data to new structure
    await this.prisma.$executeRaw`
      INSERT INTO users (id, username, discriminator, avatar, bot, system, flags, premium_type, created_at, updated_at)
      SELECT id, username, discriminator, avatar, bot, system, flags, premium_type, created_at, updated_at
      FROM users_old
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        discriminator = EXCLUDED.discriminator,
        avatar = EXCLUDED.avatar,
        updated_at = NOW()
    `
  }

  async migrateGuilds() {
    // Migrate guilds and create member relationships
    await this.prisma.$transaction(async (tx) => {
      // Migrate guilds
      await tx.$executeRaw`
        INSERT INTO guilds (
          id, name, icon, owner_id, region, verification_level,
          explicit_content_filter, created_at, updated_at
        )
        SELECT id, name, icon, owner_id, region, verification_level,
               explicit_content_filter, created_at, updated_at
        FROM guilds_old
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          icon = EXCLUDED.icon,
          updated_at = NOW()
      `

      // Migrate guild members
      await tx.$executeRaw`
        INSERT INTO guild_members (guild_id, user_id, nickname, joined_at, roles)
        SELECT guild_id, user_id, nickname, joined_at, roles
        FROM guild_members_old
        ON CONFLICT (guild_id, user_id) DO UPDATE SET
          nickname = EXCLUDED.nickname,
          roles = EXCLUDED.roles
      `
    })
  }

  async migrateMessages() {
    // Migrate messages in batches to avoid memory issues
    const batchSize = 10000
    let offset = 0
    let migrated = 0

    while (true) {
      const batch = await this.prisma.$queryRaw`
        SELECT * FROM messages_old
        ORDER BY id
        LIMIT ${batchSize} OFFSET ${offset}
      `

      if (batch.length === 0) break

      await this.prisma.$executeRaw`
        INSERT INTO messages (
          id, channel_id, author_id, content, type, edited_timestamp,
          tts, mention_everyone, mentions, mention_roles,
          attachments, embeds, reactions, pinned, created_at
        )
        SELECT id, channel_id, author_id, content, type, edited_timestamp,
               tts, mention_everyone, mentions, mention_roles,
               attachments, embeds, reactions, pinned, created_at
        FROM json_populate_recordset(null::messages, ${JSON.stringify(batch)})
        ON CONFLICT (id) DO NOTHING
      `

      migrated += batch.length
      offset += batchSize

      console.log(`Migrated ${migrated} messages...`)
    }

    console.log(`Total messages migrated: ${migrated}`)
  }

  async createPerformanceIndexes() {
    // Create performance indexes
    await this.prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_channel_created
      ON messages(channel_id, created_at DESC)
    `

    await this.prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_author_created
      ON messages(author_id, created_at DESC)
    `

    await this.prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guild_members_guild_joined
      ON guild_members(guild_id, joined_at)
    `

    await this.prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_xp_guild_xp
      ON user_xp(guild_id, xp DESC)
    `
  }

  async validateMigration() {
    // Validate that migration was successful
    const [userCount, guildCount, messageCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.guild.count(),
      this.prisma.message.count()
    ])

    console.log('Migration validation:')
    console.log(`- Users: ${userCount}`)
    console.log(`- Guilds: ${guildCount}`)
    console.log(`- Messages: ${messageCount}`)

    return {
      users: userCount,
      guilds: guildCount,
      messages: messageCount
    }
  }
}
```

## Query Optimization

Optimizing Prisma queries for performance.

### Efficient Queries

```javascript
class OptimizedQueries {
  constructor(prisma) {
    this.prisma = prisma
  }

  // Efficient user lookup with caching consideration
  async getUserWithGuilds(userId) {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        discriminator: true,
        avatar: true,
        createdGuilds: {
          select: {
            id: true,
            name: true,
            memberCount: true
          },
          orderBy: { createdAt: 'desc' }
        },
        guildMembers: {
          select: {
            guild: {
              select: {
                id: true,
                name: true,
                icon: true
              }
            },
            joinedAt: true,
            roles: true
          },
          orderBy: { joinedAt: 'desc' }
        }
      }
    })
  }

  // Paginated message queries
  async getChannelMessages(channelId, options = {}) {
    const {
      limit = 50,
      before,
      after,
      includeAuthor = true
    } = options

    const where = { channelId }
    if (before) where.id = { lt: before }
    if (after) where.id = { gt: after }

    return await this.prisma.message.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: includeAuthor ? {
        author: {
          select: {
            id: true,
            username: true,
            discriminator: true,
            avatar: true,
            bot: true
          }
        }
      } : undefined
    })
  }

  // Batch user operations
  async upsertUsers(userData) {
    const results = []

    for (const user of userData) {
      const result = await this.prisma.user.upsert({
        where: { id: user.id },
        update: {
          username: user.username,
          discriminator: user.discriminator,
          avatar: user.avatar
        },
        create: user
      })
      results.push(result)
    }

    return results
  }

  // Complex analytics queries
  async getGuildActivityStats(guildId, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [messageStats, userStats, channelStats] = await Promise.all([
      // Message statistics
      this.prisma.message.groupBy({
        by: ['channelId'],
        where: {
          channel: { guildId },
          createdAt: { gte: startDate }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),

      // Active users
      this.prisma.message.findMany({
        where: {
          channel: { guildId },
          createdAt: { gte: startDate }
        },
        select: { authorId: true },
        distinct: ['authorId']
      }).then(results => results.length),

      // Channel activity
      this.prisma.channel.findMany({
        where: { guildId },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              messages: {
                where: { createdAt: { gte: startDate } }
              }
            }
          }
        }
      })
    ])

    return {
      messageStats,
      activeUsers: userStats,
      channelStats
    }
  }

  // Efficient bulk operations
  async bulkUpdateUserXP(guildId, xpUpdates) {
    const updates = xpUpdates.map(({ userId, xp }) =>
      this.prisma.userXP.upsert({
        where: {
          userId_guildId: { userId, guildId }
        },
        update: {
          xp: { increment: xp },
          lastMessage: new Date()
        },
        create: {
          userId,
          guildId,
          xp,
          lastMessage: new Date()
        }
      })
    )

    return await this.prisma.$transaction(updates)
  }

  // Search optimization
  async searchMessages(guildId, query, options = {}) {
    const {
      channelId,
      authorId,
      limit = 20,
      caseSensitive = false
    } = options

    const where = {
      channel: { guildId },
      content: {
        [caseSensitive ? 'contains' : 'mode']: caseSensitive ? query : 'insensitive',
        contains: query
      }
    }

    if (channelId) where.channelId = channelId
    if (authorId) where.authorId = authorId

    return await this.prisma.message.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            username: true,
            discriminator: true,
            avatar: true
          }
        },
        channel: {
          select: { name: true }
        }
      }
    })
  }
}
```

## Best Practices

### Implementation Guidelines

1. **Define comprehensive schemas** with proper relationships and constraints
2. **Use appropriate data types** for Discord IDs (String/VARCHAR) and timestamps
3. **Create indexes strategically** for query patterns and foreign keys
4. **Use transactions** for data consistency across multiple operations
5. **Implement connection pooling** and retry logic for reliability
6. **Use Prisma's type safety** features for compile-time query validation
7. **Batch operations** to reduce database round trips
8. **Implement proper error handling** with detailed logging
9. **Use raw queries** when Prisma's ORM is insufficient for performance
10. **Version schema changes** with migrations and test them thoroughly

### Production Considerations

```javascript
// Complete Prisma management system
class ProductionPrismaManager {
  constructor(config) {
    this.config = config

    // Core components
    this.prismaManager = new PrismaManager()
    this.migrationManager = new PrismaMigrationManager()

    // Repositories
    this.repositories = {
      users: new UserRepository(this.prismaManager.getClient()),
      guilds: new GuildRepository(this.prismaManager.getClient()),
      queries: new OptimizedQueries(this.prismaManager.getClient())
    }

    // Stats
    this.stats = {
      uptime: Date.now(),
      totalQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0
    }
  }

  async initialize() {
    try {
      // Connect to database
      await this.prismaManager.connect()

      // Run pending migrations
      await this.migrationManager.applyMigrations()

      // Generate client
      await this.migrationManager.generateClient()

      console.log('Production Prisma manager initialized')
    } catch (error) {
      console.error('Prisma initialization failed:', error)
      throw error
    }
  }

  async syncDiscordData(client) {
    console.log('Starting Discord data sync with Prisma...')

    // Sync users
    const users = Array.from(client.users.cache.values())
    await this.repositories.users.upsertUsers(users)

    // Sync guilds and members
    for (const [guildId, guild] of client.guilds.cache) {
      await this.repositories.guilds.upsert({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.ownerId,
        region: guild.region,
        features: guild.features,
        verificationLevel: guild.verificationLevel,
        explicitContentFilter: guild.explicitContentFilter
      })

      // Sync members
      const members = Array.from(guild.members.cache.values())
      for (const member of members) {
        await this.repositories.guilds.addMember(guildId, member.user.id, {
          nickname: member.nickname,
          roles: member.roles.cache.map(role => role.id),
          joinedAt: member.joinedAt,
          deaf: member.voice.deaf,
          mute: member.voice.mute
        })
      }
    }

    console.log('Discord data sync with Prisma completed')
  }

  async getSystemStats() {
    const health = await this.prismaManager.healthCheck()
    const migrationStatus = await this.migrationManager.getMigrationStatus()

    return {
      ...this.stats,
      health,
      migrations: migrationStatus
    }
  }

  async createMigration(name, description = '') {
    return await this.migrationManager.createMigration(name, description)
  }

  async gracefulShutdown() {
    console.log('Starting Prisma manager shutdown...')

    await this.prismaManager.disconnect()

    console.log('Prisma manager shutdown complete')
  }
}
```

This comprehensive Prisma integration provides type-safe, efficient database operations for production Discord bots with robust migration management and query optimization.