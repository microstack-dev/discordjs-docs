# Schema Design

Discord.js v14.25.1 database schema design for production bots. This section covers relational modeling, normalization, indexing strategies, and scalable database architectures.

## Schema Design Principles

Core principles for designing effective database schemas.

### Normalization

```sql
-- Users table (1NF, 2NF, 3NF compliant)
CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  username VARCHAR(32) NOT NULL,
  discriminator SMALLINT CHECK (discriminator >= 0 AND discriminator <= 9999),
  avatar VARCHAR(255),
  bot BOOLEAN DEFAULT FALSE,
  system BOOLEAN DEFAULT FALSE,
  flags INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles (separate table for extended data)
CREATE TABLE user_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  website VARCHAR(255),
  location VARCHAR(100),
  birthday DATE,
  timezone VARCHAR(50),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guilds table
CREATE TABLE guilds (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(255),
  owner_id BIGINT NOT NULL REFERENCES users(id),
  region VARCHAR(50),
  features TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guild members (junction table for many-to-many relationship)
CREATE TABLE guild_members (
  guild_id BIGINT REFERENCES guilds(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  nickname VARCHAR(32),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  roles BIGINT[] DEFAULT '{}',
  PRIMARY KEY (guild_id, user_id)
);

-- Roles table
CREATE TABLE roles (
  id BIGINT PRIMARY KEY,
  guild_id BIGINT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color INTEGER DEFAULT 0,
  hoist BOOLEAN DEFAULT FALSE,
  position INTEGER DEFAULT 0,
  permissions BIGINT DEFAULT 0,
  mentionable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(guild_id, position)
);

-- Channels table
CREATE TABLE channels (
  id BIGINT PRIMARY KEY,
  guild_id BIGINT REFERENCES guilds(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type SMALLINT NOT NULL CHECK (type >= 0 AND type <= 13),
  position INTEGER DEFAULT 0,
  topic TEXT,
  nsfw BOOLEAN DEFAULT FALSE,
  bitrate INTEGER,
  user_limit INTEGER,
  rate_limit_per_user INTEGER DEFAULT 0,
  parent_id BIGINT REFERENCES channels(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id BIGINT PRIMARY KEY,
  channel_id BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  type SMALLINT DEFAULT 0,
  edited_timestamp TIMESTAMP WITH TIME ZONE,
  tts BOOLEAN DEFAULT FALSE,
  mention_everyone BOOLEAN DEFAULT FALSE,
  mentions BIGINT[] DEFAULT '{}',
  mention_roles BIGINT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  embeds JSONB DEFAULT '[]',
  reactions JSONB DEFAULT '[]',
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Denormalization for Performance

```sql
-- Denormalized view for common queries
CREATE VIEW guild_member_stats AS
SELECT
  g.id as guild_id,
  g.name as guild_name,
  COUNT(gm.user_id) as member_count,
  COUNT(gm.user_id) FILTER (WHERE u.bot = true) as bot_count,
  MAX(gm.joined_at) as latest_join,
  MIN(gm.joined_at) as earliest_join
FROM guilds g
LEFT JOIN guild_members gm ON g.id = gm.guild_id
LEFT JOIN users u ON gm.user_id = u.id
GROUP BY g.id, g.name;

-- Materialized view for message statistics
CREATE MATERIALIZED VIEW daily_message_stats AS
SELECT
  DATE(created_at) as date,
  channel_id,
  COUNT(*) as message_count,
  COUNT(DISTINCT author_id) as active_users,
  AVG(LENGTH(content)) as avg_message_length
FROM messages
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), channel_id;

-- Refresh the materialized view daily
CREATE OR REPLACE FUNCTION refresh_daily_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_message_stats;
END;
$$ LANGUAGE plpgsql;

-- Create a cron job or scheduled task to refresh daily
-- This would be handled by your application scheduler
```

## Indexing Strategies

Optimizing query performance with strategic indexing.

### Primary Indexes

```sql
-- Primary key indexes (automatically created)
-- users: id
-- guilds: id
-- messages: id
-- etc.

-- Composite primary keys
ALTER TABLE guild_members ADD PRIMARY KEY (guild_id, user_id);

-- Unique indexes
CREATE UNIQUE INDEX idx_users_discriminator ON users(discriminator);
CREATE UNIQUE INDEX idx_guilds_name_owner ON guilds(name, owner_id);
CREATE UNIQUE INDEX idx_roles_guild_position ON roles(guild_id, position);
```

### Foreign Key Indexes

```sql
-- Foreign key indexes for referential integrity
CREATE INDEX idx_guild_members_user_id ON guild_members(user_id);
CREATE INDEX idx_guild_members_guild_id ON guild_members(guild_id);

CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_author_id ON messages(author_id);

CREATE INDEX idx_channels_guild_id ON channels(guild_id);
CREATE INDEX idx_roles_guild_id ON roles(guild_id);

-- Partial indexes for active data
CREATE INDEX idx_messages_recent ON messages(created_at)
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

CREATE INDEX idx_guild_members_active ON guild_members(joined_at)
WHERE joined_at >= CURRENT_DATE - INTERVAL '90 days';
```

### Query-Specific Indexes

```sql
-- Index for user search
CREATE INDEX idx_users_username_gin ON users USING gin(to_tsvector('english', username));
CREATE INDEX idx_users_created_at_desc ON users(created_at DESC);

-- Index for message search
CREATE INDEX idx_messages_content_gin ON messages USING gin(to_tsvector('english', content))
WHERE LENGTH(content) > 10;

-- Index for time-based queries
CREATE INDEX idx_messages_created_at_channel ON messages(created_at, channel_id);
CREATE INDEX idx_messages_channel_created ON messages(channel_id, created_at DESC);

-- Index for guild analytics
CREATE INDEX idx_guilds_region_created ON guilds(region, created_at);
CREATE INDEX idx_guilds_owner_created ON guilds(owner_id, created_at DESC);

-- Index for user activity
CREATE INDEX idx_messages_author_date ON messages(author_id, DATE(created_at));
```

### Partial and Conditional Indexes

```sql
-- Index only active guilds
CREATE INDEX idx_guilds_active ON guilds(id, name, member_count)
WHERE unavailable = FALSE;

-- Index only large guilds
CREATE INDEX idx_guilds_large ON guilds(id, member_count)
WHERE member_count > 1000;

-- Index recent messages for pagination
CREATE INDEX idx_messages_pagination ON messages(channel_id, id DESC)
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

-- Index bot users separately
CREATE INDEX idx_users_bots ON users(id, username)
WHERE bot = TRUE;

-- Index messages with attachments
CREATE INDEX idx_messages_attachments ON messages(id, channel_id)
WHERE jsonb_array_length(attachments) > 0;

-- Index messages with reactions
CREATE INDEX idx_messages_reactions ON messages(id, channel_id)
WHERE jsonb_array_length(reactions) > 0;
```

## Relationships and Constraints

Defining relationships between Discord entities.

### One-to-One Relationships

```sql
-- User profile extension (one user, one profile)
CREATE TABLE user_settings (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'dark',
  language VARCHAR(10) DEFAULT 'en',
  notifications JSONB DEFAULT '{"mentions": true, "dms": true}',
  privacy JSONB DEFAULT '{"show_status": true, "show_activity": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guild configuration (one guild, one config)
CREATE TABLE guild_config (
  guild_id BIGINT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
  prefix VARCHAR(5) DEFAULT '!',
  welcome_channel BIGINT REFERENCES channels(id),
  log_channel BIGINT REFERENCES channels(id),
  mute_role BIGINT REFERENCES roles(id),
  mod_roles BIGINT[] DEFAULT '{}',
  disabled_commands TEXT[] DEFAULT '{}',
  auto_mod JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### One-to-Many Relationships

```sql
-- Guild channels (one guild, many channels)
-- Already defined in channels table with guild_id foreign key

-- Channel messages (one channel, many messages)
-- Already defined in messages table with channel_id foreign key

-- User messages (one user, many messages)
-- Already defined in messages table with author_id foreign key

-- Guild roles (one guild, many roles)
-- Already defined in roles table with guild_id foreign key

-- Additional one-to-many: Message edits
CREATE TABLE message_edits (
  id SERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  old_content TEXT,
  new_content TEXT,
  edited_by BIGINT NOT NULL REFERENCES users(id),
  edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_message_edits_message_id ON message_edits(message_id);
CREATE INDEX idx_message_edits_edited_at ON message_edits(edited_at DESC);
```

### Many-to-Many Relationships

```sql
-- User roles (many users, many roles through guild_members)
-- Handled via array in guild_members table

-- Message reactions (many messages, many users)
CREATE TABLE message_reactions (
  message_id BIGINT REFERENCES messages(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  emoji_name VARCHAR(100) NOT NULL,
  emoji_id BIGINT,
  animated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, emoji_name, COALESCE(emoji_id, 0))
);

-- Voice channel permissions (many channels, many roles/users)
CREATE TABLE channel_permissions (
  channel_id BIGINT REFERENCES channels(id) ON DELETE CASCADE,
  target_id BIGINT NOT NULL, -- Can be user or role ID
  target_type SMALLINT NOT NULL CHECK (target_type IN (0, 1)), -- 0=user, 1=role
  allow BIGINT DEFAULT 0,
  deny BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (channel_id, target_id, target_type)
);

-- Guild bans (many guilds, many users)
CREATE TABLE guild_bans (
  guild_id BIGINT REFERENCES guilds(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  banned_by BIGINT NOT NULL REFERENCES users(id),
  banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (guild_id, user_id)
);

CREATE INDEX idx_guild_bans_expires_at ON guild_bans(expires_at)
WHERE expires_at IS NOT NULL;
```

## Scalable Architectures

Designing schemas that scale with bot growth.

### Sharding Strategy

```sql
-- Shard-aware table structure
CREATE TABLE guilds_sharded (
  id BIGINT PRIMARY KEY,
  shard_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  owner_id BIGINT NOT NULL,
  -- ... other guild fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY HASH (shard_id);

-- Create partitions for each shard
CREATE TABLE guilds_shard_0 PARTITION OF guilds_sharded FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE guilds_shard_1 PARTITION OF guilds_sharded FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE guilds_shard_2 PARTITION OF guilds_sharded FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE guilds_shard_3 PARTITION OF guilds_sharded FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- Function to determine shard ID
CREATE OR REPLACE FUNCTION get_shard_id(guild_id BIGINT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (guild_id % 4)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Shard-aware insert function
CREATE OR REPLACE FUNCTION insert_guild_sharded(
  p_id BIGINT,
  p_name VARCHAR(100),
  p_owner_id BIGINT
) RETURNS void AS $$
DECLARE
  shard_id INTEGER;
BEGIN
  shard_id := get_shard_id(p_id);

  INSERT INTO guilds_sharded (id, shard_id, name, owner_id)
  VALUES (p_id, shard_id, p_name, p_owner_id);
END;
$$ LANGUAGE plpgsql;
```

### Read Replicas

```sql
-- Read replica configuration (connection string example)
const readReplicaConfig = {
  host: process.env.DB_READ_HOST || 'read-replica.example.com',
  port: process.env.DB_READ_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_READ_USER,
  password: process.env.DB_READ_PASSWORD,
  max: 10,
  min: 2
};

class ReadWriteDatabaseManager {
  constructor(writeConfig, readConfig) {
    this.writeDb = new DatabaseConnectionManager(writeConfig);
    this.readDb = new DatabaseConnectionManager(readConfig);
  }

  async query(text, params, options = {}) {
    // Route reads to read replica, writes to primary
    const isReadQuery = this.isReadQuery(text);

    if (isReadQuery && options.usePrimary !== true) {
      return this.readDb.query(text, params);
    } else {
      return this.writeDb.query(text, params);
    }
  }

  isReadQuery(query) {
    const normalized = query.trim().toUpperCase();
    return normalized.startsWith('SELECT') ||
           normalized.startsWith('SHOW') ||
           normalized.startsWith('EXPLAIN');
  }

  async transaction(callback) {
    // Transactions always go to primary
    return this.writeDb.transaction(callback);
  }

  // Force read from primary (for immediate consistency)
  async readFromPrimary(text, params) {
    return this.writeDb.query(text, params);
  }
}
```

### Archive Tables

```sql
-- Archive old messages
CREATE TABLE messages_archive (
  LIKE messages INCLUDING ALL
);

-- Partition messages by month for better performance
CREATE TABLE messages_2024_01 PARTITION OF messages
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE messages_2024_02 PARTITION OF messages
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Function to archive old messages
CREATE OR REPLACE FUNCTION archive_old_messages(days_old INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Move old messages to archive
  INSERT INTO messages_archive
  SELECT * FROM messages
  WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_old;

  -- Delete from main table
  DELETE FROM messages
  WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_old;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Archive messages older than 1 year
SELECT archive_old_messages(365);

-- Create index on archive table
CREATE INDEX idx_messages_archive_created_at ON messages_archive(created_at);
CREATE INDEX idx_messages_archive_channel_id ON messages_archive(channel_id);
```

## Migration Strategies

Handling schema changes in production.

### Migration Framework

```javascript
class DatabaseMigrationManager {
  constructor(db) {
    this.db = db;
    this.migrations = new Map();
    this.appliedMigrations = new Set();
  }

  registerMigration(version, up, down) {
    this.migrations.set(version, { up, down });
  }

  async initializeMigrationTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        description TEXT
      );
    `;

    await this.db.query(query);
    await this.loadAppliedMigrations();
  }

  async loadAppliedMigrations() {
    const result = await this.db.query('SELECT version FROM schema_migrations');
    this.appliedMigrations = new Set(result.rows.map(row => row.version));
  }

  async applyMigrations(targetVersion = null) {
    const sortedMigrations = Array.from(this.migrations.keys()).sort();

    for (const version of sortedMigrations) {
      if (this.appliedMigrations.has(version)) {
        continue; // Already applied
      }

      if (targetVersion && version > targetVersion) {
        break; // Stop at target version
      }

      console.log(`Applying migration: ${version}`);

      const migration = this.migrations.get(version);

      try {
        await this.db.transaction(async (client) => {
          await migration.up(client);

          // Record migration
          await client.query(
            'INSERT INTO schema_migrations (version, description) VALUES ($1, $2)',
            [version, migration.description || `Migration ${version}`]
          );
        });

        this.appliedMigrations.add(version);
        console.log(`Migration ${version} applied successfully`);
      } catch (error) {
        console.error(`Migration ${version} failed:`, error);
        throw error;
      }
    }
  }

  async rollbackMigration(version) {
    if (!this.appliedMigrations.has(version)) {
      throw new Error(`Migration ${version} has not been applied`);
    }

    const migration = this.migrations.get(version);

    console.log(`Rolling back migration: ${version}`);

    try {
      await this.db.transaction(async (client) => {
        await migration.down(client);

        // Remove migration record
        await client.query('DELETE FROM schema_migrations WHERE version = $1', [version]);
      });

      this.appliedMigrations.delete(version);
      console.log(`Migration ${version} rolled back successfully`);
    } catch (error) {
      console.error(`Migration ${version} rollback failed:`, error);
      throw error;
    }
  }
}

// Example migration
migrationManager.registerMigration('001_initial_schema', {
  description: 'Create initial user and guild tables',
  up: async (client) => {
    await client.query(`
      CREATE TABLE users (
        id BIGINT PRIMARY KEY,
        username VARCHAR(32) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE guilds (
        id BIGINT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  },
  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS guilds');
    await client.query('DROP TABLE IF EXISTS users');
  }
});
```

## Best Practices

### Implementation Guidelines

1. **Normalize data** to reduce redundancy and improve consistency
2. **Use appropriate data types** for Discord IDs (BIGINT) and constraints
3. **Create indexes strategically** for query patterns, not blindly
4. **Use partial indexes** for filtered queries to save space
5. **Implement foreign key constraints** for referential integrity
6. **Consider denormalization** for read-heavy workloads
7. **Plan for sharding** early if expecting massive scale
8. **Use read replicas** to offload read queries
9. **Archive old data** to maintain performance
10. **Version schema changes** with migration scripts

### Production Considerations

```sql
-- Complete production schema example
-- This represents a comprehensive Discord bot database schema

-- Core entities
CREATE TABLE users (/* ... */);
CREATE TABLE guilds (/* ... */);
CREATE TABLE channels (/* ... */);
CREATE TABLE roles (/* ... */);

-- Relationships
CREATE TABLE guild_members (/* ... */);
CREATE TABLE channel_permissions (/* ... */);
CREATE TABLE message_reactions (/* ... */);

-- Bot-specific data
CREATE TABLE user_xp (
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  guild_id BIGINT REFERENCES guilds(id) ON DELETE CASCADE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  last_message TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, guild_id)
);

CREATE TABLE guild_settings (
  guild_id BIGINT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
  prefix VARCHAR(5) DEFAULT '!',
  welcome_message TEXT,
  leave_message TEXT,
  log_channel BIGINT REFERENCES channels(id),
  mute_role BIGINT REFERENCES roles(id),
  auto_roles BIGINT[] DEFAULT '{}',
  disabled_commands TEXT[] DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX CONCURRENTLY idx_user_xp_guild_xp ON user_xp(guild_id, xp DESC);
CREATE INDEX CONCURRENTLY idx_user_xp_user_xp ON user_xp(user_id, xp DESC);

-- Partition large tables if needed
-- CREATE TABLE messages_y2024m01 PARTITION OF messages
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

This schema design provides a solid foundation for scalable Discord bot databases with proper normalization, indexing, and growth considerations.