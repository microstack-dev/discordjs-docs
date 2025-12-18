# Snowflakes

Discord uses a unique ID system called Snowflakes for all entities. Understanding Snowflakes helps with timestamp extraction, sorting, and data management.

## What Are Snowflakes

Snowflakes are 64-bit IDs that contain both a unique identifier and a timestamp. Every Discord entity (users, channels, messages, etc.) has a Snowflake ID.

## Snowflake Structure

A Discord Snowflake consists of:
- **Timestamp (42 bits)**: Milliseconds since Discord epoch (2015-01-01)
- **Internal Worker ID (5 bits)**: Internal process identifier
- **Internal Process ID (5 bits)**: Internal process identifier
- **Increment (12 bits)**: Sequence number for uniqueness

```
{timestamp}{worker}{process}{increment}
  42 bits   5 bits   5 bits    12 bits
```

## Extracting Timestamps

Convert Snowflakes to dates:
```js
// Discord epoch: 2015-01-01 00:00:00 UTC
const DISCORD_EPOCH = 1420070400000

function snowflakeToDate(snowflake) {
  return new Date((snowflake / 4194304) + DISCORD_EPOCH)
}

// Example usage
const messageId = '123456789012345678'
const messageDate = snowflakeToDate(messageId)
console.log('Message created:', messageDate.toISOString())
```

### Built-in Discord.js Method

Discord.js provides a built-in method:
```js
import { SnowflakeUtil } from 'discord.js'

const timestamp = SnowflakeUtil.timestampFrom('123456789012345678')
const date = new Date(timestamp)
console.log('Created at:', date)
```

## Sorting by Time

Use Snowflakes for chronological sorting:
```js
// Sort messages by creation time
messages.sort((a, b) => {
  return a.createdTimestamp - b.createdTimestamp
})

// Or use Snowflake directly
messages.sort((a, b) => {
  return BigInt(a.id) - BigInt(b.id)
})
```

## Time-Based Queries

Filter entities by creation time:
```js
// Get messages from last hour
const oneHourAgo = Date.now() - (60 * 60 * 1000)

const recentMessages = channel.messages.cache.filter(message => {
  return message.createdTimestamp > oneHourAgo
})

// Get old messages
const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)

const oldMessages = channel.messages.cache.filter(message => {
  return message.createdTimestamp < oneDayAgo
})
```

## Snowflake Generation

Generate custom Snowflakes for testing:
```js
import { SnowflakeUtil } from 'discord.js'

// Generate a Snowflake with current timestamp
const snowflake = SnowflakeUtil.generate()
console.log('Generated Snowflake:', snowflake)

// Generate Snowflake with specific timestamp
const customTimestamp = Date.now() - (24 * 60 * 60 * 1000) // Yesterday
const oldSnowflake = SnowflakeUtil.generate({ timestamp: customTimestamp })
console.log('Old Snowflake:', oldSnowflake)
```

## Deconstructing Snowflakes

Extract all components from a Snowflake:
```js
function deconstructSnowflake(snowflake) {
  const binary = BigInt(snowflake).toString(2).padStart(64, '0')
  
  const timestamp = parseInt(binary.substring(0, 42), 2)
  const workerId = parseInt(binary.substring(42, 47), 2)
  const processId = parseInt(binary.substring(47, 52), 2)
  const increment = parseInt(binary.substring(52, 64), 2)
  
  return {
    timestamp: new Date(timestamp + DISCORD_EPOCH),
    workerId,
    processId,
    increment
  }
}

const info = deconstructSnowflake('123456789012345678')
console.log('Snowflake info:', info)
```

## Practical Applications

### Message Age Checking
```js
function isMessageOld(message, hours = 24) {
  const cutoff = Date.now() - (hours * 60 * 60 * 1000)
  return message.createdTimestamp < cutoff
}

// Delete messages older than 7 days
const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
channel.messages.cache
  .filter(msg => msg.createdTimestamp < weekAgo)
  .forEach(msg => msg.delete().catch(console.error))
```

### User Join Date Analysis
```js
client.on('guildMemberAdd', (member) => {
  const accountAge = Date.now() - member.user.createdTimestamp
  const daysOld = Math.floor(accountAge / (24 * 60 * 60 * 1000))
  
  if (daysOld < 7) {
    console.log('Very new account detected:', member.user.tag)
  }
})
```

### Channel Creation Timeline
```js
function getChannelTimeline(guild) {
  return guild.channels.cache
    .map(channel => ({
      name: channel.name,
      type: channel.type,
      created: channel.createdTimestamp
    }))
    .sort((a, b) => a.created - b.created)
}

const timeline = getChannelTimeline(guild)
console.log('Channel creation timeline:', timeline)
```

## Snowflake Limitations

### JavaScript Number Limitations
JavaScript's `Number` type can't safely represent all Snowflakes:
```js
// This can lose precision
const snowflake = 1234567890123456789n // Use BigInt instead

// Discord.js uses BigInt internally
const message = await channel.messages.fetch('1234567890123456789')
console.log(typeof message.id) // 'string'
```

### Best Practices
- Always treat Snowflakes as strings
- Use Discord.js built-in methods for timestamp extraction
- Don't rely on numeric operations with Snowflakes

## Performance Considerations

Snowflake operations are very fast:
```js
// Timestamp extraction is O(1)
const timestamp = SnowflakeUtil.timestampFrom(message.id)

// Sorting by Snowflake is efficient
messages.sort((a, b) => a.id.localeCompare(b.id))
```

## Common Use Cases

- **Message cleanup**: Delete old messages
- **User verification**: Check account age
- **Analytics**: Track creation patterns
- **Debugging**: Identify when entities were created
- **Sorting**: Order items chronologically

## Next Steps

Continue to [Interaction Lifecycle](/core-concepts/interaction-lifecycle) to understand how Discord interactions work from creation to response.