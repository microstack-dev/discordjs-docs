# Voice Overview

Discord.js v14.25.1 voice functionality for production bots. This section covers voice connection management, audio streaming, and voice channel handling for reliable voice applications.

## Voice Fundamentals

Understanding Discord's voice system and connection lifecycle.

### Voice Connections

Discord voice connections enable real-time audio communication between bots and users.

```js
const { Client, GatewayIntentBits } = require('discord.js')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
})

client.on('ready', () => {
  console.log('Voice bot is ready!')
})

client.on('voiceStateUpdate', (oldState, newState) => {
  // Handle voice state changes
  const member = newState.member
  const oldChannel = oldState.channel
  const newChannel = newState.channel

  if (!oldChannel && newChannel) {
    console.log(`${member.user.tag} joined ${newChannel.name}`)
  } else if (oldChannel && !newChannel) {
    console.log(`${member.user.tag} left ${oldChannel.name}`)
  } else if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
    console.log(`${member.user.tag} moved from ${oldChannel.name} to ${newChannel.name}`)
  }
})

client.login(process.env.DISCORD_TOKEN)
```

### Connection States

Voice connections go through several states during their lifecycle:

```js
class VoiceConnectionManager {
  constructor(client) {
    this.client = client
    this.connections = new Map()
    this.setupEventHandlers()
  }

  setupEventHandlers() {
    this.client.on('voiceStateUpdate', (oldState, newState) => {
      this.handleVoiceStateUpdate(oldState, newState)
    })
  }

  async handleVoiceStateUpdate(oldState, newState) {
    const guildId = newState.guild.id
    const connection = this.connections.get(guildId)

    if (!connection) return

    // Handle bot's own voice state changes
    if (newState.member.id === this.client.user.id) {
      if (!newState.channel) {
        // Bot was disconnected
        await this.handleDisconnect(guildId)
      } else if (oldState.channel && oldState.channel.id !== newState.channel.id) {
        // Bot moved channels
        await this.handleChannelMove(guildId, newState.channel)
      }
    }

    // Handle user movements affecting connection
    await this.updateConnectionState(guildId)
  }

  async joinChannel(channel) {
    try {
      const connection = await channel.join()
      this.connections.set(channel.guild.id, {
        connection,
        channel,
        joinedAt: Date.now(),
        state: 'connecting'
      })

      connection.on('ready', () => {
        console.log(`Connected to ${channel.name}`)
        this.connections.get(channel.guild.id).state = 'ready'
      })

      connection.on('disconnected', () => {
        console.log(`Disconnected from ${channel.name}`)
        this.connections.get(channel.guild.id).state = 'disconnected'
      })

      connection.on('error', (error) => {
        console.error('Voice connection error:', error)
        this.connections.get(channel.guild.id).state = 'error'
      })

      return connection
    } catch (error) {
      console.error('Failed to join voice channel:', error)
      throw error
    }
  }

  async leaveChannel(guildId) {
    const connectionData = this.connections.get(guildId)
    if (!connectionData) return

    try {
      await connectionData.channel.leave()
      this.connections.delete(guildId)
    } catch (error) {
      console.error('Failed to leave voice channel:', error)
      this.connections.delete(guildId)
    }
  }

  async handleDisconnect(guildId) {
    const connectionData = this.connections.get(guildId)
    if (!connectionData) return

    // Clean up resources
    connectionData.state = 'disconnected'
    this.connections.delete(guildId)

    // Notify listeners
    this.emit('disconnected', guildId)
  }

  async handleChannelMove(guildId, newChannel) {
    const connectionData = this.connections.get(guildId)
    if (!connectionData) return

    // Update channel reference
    connectionData.channel = newChannel

    // Reconnect if necessary
    await this.reconnect(guildId)
  }

  async updateConnectionState(guildId) {
    const connectionData = this.connections.get(guildId)
    if (!connectionData) return

    const channel = connectionData.channel
    const members = channel.members.filter(member => !member.user.bot)

    // Check if bot is alone in channel
    if (members.size === 0) {
      console.log('Bot is alone in voice channel, starting timeout...')

      // Start alone timeout
      setTimeout(async () => {
        const currentMembers = channel.members.filter(member => !member.user.bot)
        if (currentMembers.size === 0) {
          console.log('Leaving empty voice channel')
          await this.leaveChannel(guildId)
        }
      }, 5 * 60 * 1000) // 5 minutes
    }
  }

  async reconnect(guildId) {
    const connectionData = this.connections.get(guildId)
    if (!connectionData) return

    try {
      console.log(`Reconnecting to voice channel in guild ${guildId}`)
      const newConnection = await connectionData.channel.join()
      connectionData.connection = newConnection
      connectionData.state = 'ready'
    } catch (error) {
      console.error('Failed to reconnect:', error)
      await this.handleDisconnect(guildId)
    }
  }

  getConnection(guildId) {
    return this.connections.get(guildId)
  }

  getAllConnections() {
    return Array.from(this.connections.values())
  }
}
```

## Audio Streaming

Streaming audio data through voice connections.

### Basic Audio Playback

```js
const { createReadStream } = require('fs')
const { join } = require('path')

class AudioPlayer {
  constructor(connection) {
    this.connection = connection
    this.currentStream = null
    this.isPlaying = false
    this.queue = []
    this.volume = 0.5
  }

  async playFile(filePath) {
    if (this.isPlaying) {
      this.queue.push(filePath)
      return
    }

    try {
      const stream = createReadStream(filePath)
      this.currentStream = this.connection.play(stream, {
        type: 'ogg/opus',
        volume: this.volume
      })

      this.isPlaying = true

      this.currentStream.on('finish', () => {
        this.isPlaying = false
        this.currentStream = null

        // Play next in queue
        if (this.queue.length > 0) {
          const nextFile = this.queue.shift()
          this.playFile(nextFile)
        }
      })

      this.currentStream.on('error', (error) => {
        console.error('Audio playback error:', error)
        this.isPlaying = false
        this.currentStream = null
      })

      return this.currentStream
    } catch (error) {
      console.error('Failed to play audio file:', error)
      this.isPlaying = false
      throw error
    }
  }

  async playStream(audioStream) {
    if (this.isPlaying) {
      throw new Error('Already playing audio')
    }

    try {
      this.currentStream = this.connection.play(audioStream, {
        type: 'converted',
        volume: this.volume
      })

      this.isPlaying = true

      return new Promise((resolve, reject) => {
        this.currentStream.on('finish', () => {
          this.isPlaying = false
          this.currentStream = null
          resolve()
        })

        this.currentStream.on('error', (error) => {
          this.isPlaying = false
          this.currentStream = null
          reject(error)
        })
      })
    } catch (error) {
      console.error('Failed to play audio stream:', error)
      this.isPlaying = false
      throw error
    }
  }

  pause() {
    if (this.currentStream && !this.currentStream.paused) {
      this.currentStream.pause()
      return true
    }
    return false
  }

  resume() {
    if (this.currentStream && this.currentStream.paused) {
      this.currentStream.resume()
      return true
    }
    return false
  }

  stop() {
    if (this.currentStream) {
      this.currentStream.end()
      this.currentStream = null
      this.isPlaying = false
      this.queue = []
      return true
    }
    return false
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume))

    if (this.currentStream) {
      this.currentStream.setVolume(this.volume)
    }
  }

  getStatus() {
    return {
      isPlaying: this.isPlaying,
      volume: this.volume,
      queueLength: this.queue.length,
      paused: this.currentStream ? this.currentStream.paused : false
    }
  }
}
```

### Audio Resource Management

```js
const { AudioResource, createAudioResource } = require('@discordjs/voice')

class AudioResourceManager {
  constructor() {
    this.resources = new Map()
    this.maxResources = 10
  }

  async createResource(audioSource, options = {}) {
    if (this.resources.size >= this.maxResources) {
      // Clean up oldest resource
      const oldestKey = this.resources.keys().next().value
      await this.destroyResource(oldestKey)
    }

    try {
      const resource = createAudioResource(audioSource, {
        inputType: options.inputType || 'arbitrary',
        inlineVolume: options.inlineVolume || false,
        ...options
      })

      const resourceId = `resource_${Date.now()}_${Math.random()}`
      this.resources.set(resourceId, {
        resource,
        createdAt: Date.now(),
        lastUsed: Date.now()
      })

      // Set up cleanup on end
      resource.playStream.on('end', () => {
        this.markResourceEnded(resourceId)
      })

      resource.playStream.on('error', () => {
        this.markResourceEnded(resourceId)
      })

      return { resource, resourceId }
    } catch (error) {
      console.error('Failed to create audio resource:', error)
      throw error
    }
  }

  async destroyResource(resourceId) {
    const resourceData = this.resources.get(resourceId)
    if (!resourceData) return

    try {
      if (resourceData.resource.playStream) {
        resourceData.resource.playStream.destroy()
      }
      this.resources.delete(resourceId)
    } catch (error) {
      console.error('Error destroying resource:', error)
    }
  }

  markResourceEnded(resourceId) {
    const resourceData = this.resources.get(resourceId)
    if (resourceData) {
      resourceData.ended = true
      // Schedule cleanup after 5 minutes
      setTimeout(() => {
        this.destroyResource(resourceId)
      }, 5 * 60 * 1000)
    }
  }

  getResource(resourceId) {
    const resourceData = this.resources.get(resourceId)
    if (resourceData) {
      resourceData.lastUsed = Date.now()
      return resourceData.resource
    }
    return null
  }

  cleanup() {
    const now = Date.now()
    const toCleanup = []

    for (const [resourceId, resourceData] of this.resources) {
      // Clean up resources older than 30 minutes or ended resources older than 5 minutes
      const age = now - resourceData.createdAt
      const timeSinceLastUse = now - resourceData.lastUsed

      if (age > 30 * 60 * 1000 || (resourceData.ended && timeSinceLastUse > 5 * 60 * 1000)) {
        toCleanup.push(resourceId)
      }
    }

    toCleanup.forEach(resourceId => {
      this.destroyResource(resourceId)
    })

    console.log(`Cleaned up ${toCleanup.length} audio resources`)
  }

  getStats() {
    const now = Date.now()
    const active = Array.from(this.resources.values()).filter(r => !r.ended)
    const ended = Array.from(this.resources.values()).filter(r => r.ended)

    return {
      total: this.resources.size,
      active: active.length,
      ended: ended.length,
      averageAge: active.length > 0 ?
        active.reduce((sum, r) => sum + (now - r.createdAt), 0) / active.length : 0
    }
  }
}
```

## Voice Channel Handling

Managing voice channels and user interactions.

### Channel Permissions

```js
class VoiceChannelManager {
  constructor(client) {
    this.client = client
    this.channelSettings = new Map()
  }

  async createVoiceChannel(guild, options) {
    try {
      const channel = await guild.channels.create({
        name: options.name,
        type: 2, // GUILD_VOICE
        bitrate: options.bitrate || 64000,
        userLimit: options.userLimit || 0,
        parent: options.category,
        permissionOverwrites: options.permissions || []
      })

      // Store channel settings
      this.channelSettings.set(channel.id, {
        createdBy: options.createdBy,
        autoDelete: options.autoDelete || false,
        createdAt: Date.now()
      })

      return channel
    } catch (error) {
      console.error('Failed to create voice channel:', error)
      throw error
    }
  }

  async deleteVoiceChannel(channelId, reason) {
    try {
      const channel = await this.client.channels.fetch(channelId)
      if (!channel || channel.type !== 2) {
        throw new Error('Channel not found or not a voice channel')
      }

      await channel.delete(reason || 'Voice channel cleanup')
      this.channelSettings.delete(channelId)
    } catch (error) {
      console.error('Failed to delete voice channel:', error)
      throw error
    }
  }

  async setChannelPermissions(channel, permissions) {
    try {
      await channel.permissionOverwrites.set(permissions)
    } catch (error) {
      console.error('Failed to set channel permissions:', error)
      throw error
    }
  }

  async muteMember(member, mute = true) {
    try {
      await member.voice.setMute(mute)
    } catch (error) {
      console.error('Failed to mute/unmute member:', error)
      throw error
    }
  }

  async deafenMember(member, deafen = true) {
    try {
      await member.voice.setDeafen(deafen)
    } catch (error) {
      console.error('Failed to deafen/undeafen member:', error)
      throw error
    }
  }

  async moveMember(member, channel) {
    try {
      await member.voice.setChannel(channel)
    } catch (error) {
      console.error('Failed to move member:', error)
      throw error
    }
  }

  getChannelInfo(channel) {
    if (!channel || channel.type !== 2) return null

    const settings = this.channelSettings.get(channel.id) || {}
    const members = channel.members

    return {
      id: channel.id,
      name: channel.name,
      bitrate: channel.bitrate,
      userLimit: channel.userLimit,
      memberCount: members.size,
      members: members.map(member => ({
        id: member.id,
        username: member.user.username,
        muted: member.voice.mute,
        deafened: member.voice.deaf,
        streaming: member.voice.streaming
      })),
      settings
    }
  }

  async cleanupEmptyChannels() {
    const now = Date.now()

    for (const [channelId, settings] of this.channelSettings) {
      if (!settings.autoDelete) continue

      try {
        const channel = await this.client.channels.fetch(channelId)
        if (!channel) {
          this.channelSettings.delete(channelId)
          continue
        }

        const members = channel.members.filter(member => !member.user.bot)

        if (members.size === 0) {
          const age = now - settings.createdAt
          if (age > 5 * 60 * 1000) { // 5 minutes
            await this.deleteVoiceChannel(channelId, 'Auto-deleting empty channel')
          }
        }
      } catch (error) {
        console.error('Error during channel cleanup:', error)
        this.channelSettings.delete(channelId)
      }
    }
  }
}
```

### Voice Activity Detection

```js
class VoiceActivityDetector {
  constructor(connection) {
    this.connection = connection
    this.speakingUsers = new Set()
    this.activityThreshold = 1000 // 1 second
    this.silenceThreshold = 3000  // 3 seconds
    this.userActivity = new Map()

    this.setupActivityDetection()
  }

  setupActivityDetection() {
    this.connection.on('speaking', (user, speaking) => {
      this.handleSpeakingChange(user, speaking)
    })
  }

  handleSpeakingChange(user, speaking) {
    const userId = user.id
    const now = Date.now()

    if (speaking) {
      this.speakingUsers.add(userId)
      this.userActivity.set(userId, {
        startTime: now,
        lastActivity: now,
        totalSpeakingTime: 0
      })
    } else {
      if (this.speakingUsers.has(userId)) {
        this.speakingUsers.delete(userId)
        const activity = this.userActivity.get(userId)

        if (activity) {
          activity.totalSpeakingTime += now - activity.lastActivity
          activity.lastActivity = now
        }
      }
    }
  }

  getActiveSpeakers() {
    return Array.from(this.speakingUsers)
  }

  getUserActivity(userId) {
    return this.userActivity.get(userId) || null
  }

  getAllUserActivity() {
    const result = {}
    for (const [userId, activity] of this.userActivity) {
      result[userId] = {
        ...activity,
        isCurrentlySpeaking: this.speakingUsers.has(userId),
        totalSessionTime: Date.now() - activity.startTime
      }
    }
    return result
  }

  detectSilence(userId) {
    const activity = this.userActivity.get(userId)
    if (!activity) return false

    const now = Date.now()
    const timeSinceLastActivity = now - activity.lastActivity

    return timeSinceLastActivity > this.silenceThreshold
  }

  resetUserActivity(userId) {
    this.userActivity.delete(userId)
    this.speakingUsers.delete(userId)
  }

  cleanupInactiveUsers() {
    const now = Date.now()
    const toRemove = []

    for (const [userId, activity] of this.userActivity) {
      const timeSinceLastActivity = now - activity.lastActivity
      const sessionDuration = now - activity.startTime

      // Remove users inactive for 10 minutes or sessions longer than 2 hours
      if (timeSinceLastActivity > 10 * 60 * 1000 || sessionDuration > 2 * 60 * 60 * 1000) {
        toRemove.push(userId)
      }
    }

    toRemove.forEach(userId => {
      this.resetUserActivity(userId)
    })

    return toRemove.length
  }
}
```

## Error Handling

Robust error handling for voice operations.

### Connection Error Recovery

```js
class VoiceErrorHandler {
  constructor(connectionManager) {
    this.connectionManager = connectionManager
    this.maxRetries = 3
    this.retryDelay = 5000
    this.errorCounts = new Map()
  }

  async handleConnectionError(guildId, error) {
    console.error(`Voice connection error in guild ${guildId}:`, error)

    const errorCount = (this.errorCounts.get(guildId) || 0) + 1
    this.errorCounts.set(guildId, errorCount)

    // Different strategies based on error type
    if (error.message.includes('connection')) {
      await this.handleConnectionFailure(guildId, errorCount)
    } else if (error.message.includes('permission')) {
      await this.handlePermissionError(guildId, error)
    } else if (error.message.includes('timeout')) {
      await this.handleTimeoutError(guildId, errorCount)
    } else {
      await this.handleGenericError(guildId, error)
    }
  }

  async handleConnectionFailure(guildId, errorCount) {
    if (errorCount <= this.maxRetries) {
      console.log(`Retrying connection for guild ${guildId} (attempt ${errorCount})`)

      setTimeout(async () => {
        try {
          await this.connectionManager.reconnect(guildId)
          this.errorCounts.delete(guildId)
        } catch (retryError) {
          await this.handleConnectionError(guildId, retryError)
        }
      }, this.retryDelay * errorCount)
    } else {
      console.error(`Max retries exceeded for guild ${guildId}, giving up`)
      await this.connectionManager.leaveChannel(guildId)
      this.errorCounts.delete(guildId)
    }
  }

  async handlePermissionError(guildId, error) {
    console.error(`Permission error in guild ${guildId}:`, error.message)

    // Notify bot owner or log for manual intervention
    // Could also attempt to request permissions or leave channel

    await this.connectionManager.leaveChannel(guildId)
  }

  async handleTimeoutError(guildId, errorCount) {
    if (errorCount <= this.maxRetries) {
      console.log(`Retrying after timeout for guild ${guildId} (attempt ${errorCount})`)

      setTimeout(async () => {
        await this.connectionManager.reconnect(guildId)
        this.errorCounts.delete(guildId)
      }, this.retryDelay)
    } else {
      await this.connectionManager.leaveChannel(guildId)
      this.errorCounts.delete(guildId)
    }
  }

  async handleGenericError(guildId, error) {
    console.error(`Generic voice error in guild ${guildId}:`, error)

    // For generic errors, attempt one retry then give up
    if (this.errorCounts.get(guildId) === 1) {
      setTimeout(async () => {
        await this.connectionManager.reconnect(guildId)
        this.errorCounts.delete(guildId)
      }, this.retryDelay)
    } else {
      await this.connectionManager.leaveChannel(guildId)
      this.errorCounts.delete(guildId)
    }
  }

  resetErrorCount(guildId) {
    this.errorCounts.delete(guildId)
  }

  getErrorStats() {
    const stats = {}
    for (const [guildId, count] of this.errorCounts) {
      stats[guildId] = count
    }
    return stats
  }
}
```

## Best Practices

### Implementation Guidelines

1. **Monitor voice connection states** and handle disconnections gracefully
2. **Implement audio resource management** to prevent memory leaks
3. **Handle voice channel permissions** carefully and securely
4. **Set up voice activity detection** for interactive features
5. **Implement comprehensive error handling** with retry logic
6. **Clean up resources** when connections end or users leave
7. **Respect user privacy** and implement proper permission checks
8. **Monitor audio quality** and connection stability
9. **Use connection pooling** for multiple concurrent voice sessions
10. **Implement rate limiting** for voice-related commands

### Production Considerations

```js
// Complete voice management system
class ProductionVoiceManager {
  constructor(client) {
    this.client = client

    // Core components
    this.connectionManager = new VoiceConnectionManager(client)
    this.audioPlayer = null
    this.resourceManager = new AudioResourceManager()
    this.channelManager = new VoiceChannelManager(client)
    this.activityDetector = null
    this.errorHandler = new VoiceErrorHandler(this.connectionManager)

    // Monitoring
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      totalPlayTime: 0,
      errors: 0
    }

    this.setupEventHandlers()
    this.startCleanupTimers()
  }

  setupEventHandlers() {
    this.connectionManager.on('connected', (guildId) => {
      this.stats.totalConnections++
      this.stats.activeConnections++
    })

    this.connectionManager.on('disconnected', (guildId) => {
      this.stats.activeConnections--
      this.errorHandler.resetErrorCount(guildId)
    })

    this.connectionManager.on('error', (guildId, error) => {
      this.stats.errors++
      this.errorHandler.handleConnectionError(guildId, error)
    })
  }

  startCleanupTimers() {
    // Clean up audio resources every 10 minutes
    setInterval(() => {
      this.resourceManager.cleanup()
    }, 10 * 60 * 1000)

    // Clean up empty channels every 15 minutes
    setInterval(() => {
      this.channelManager.cleanupEmptyChannels()
    }, 15 * 60 * 1000)
  }

  async joinVoiceChannel(channel) {
    try {
      const connection = await this.connectionManager.joinChannel(channel)
      this.audioPlayer = new AudioPlayer(connection)
      this.activityDetector = new VoiceActivityDetector(connection)

      return {
        connection,
        player: this.audioPlayer,
        detector: this.activityDetector
      }
    } catch (error) {
      console.error('Failed to join voice channel:', error)
      throw error
    }
  }

  async leaveVoiceChannel(guildId) {
    await this.connectionManager.leaveChannel(guildId)
    this.audioPlayer = null
    this.activityDetector = null
  }

  getSystemStats() {
    return {
      ...this.stats,
      connections: this.connectionManager.getAllConnections().length,
      resources: this.resourceManager.getStats(),
      errors: this.errorHandler.getErrorStats()
    }
  }
}
```

This comprehensive voice management system provides robust audio streaming, connection handling, and error recovery for production Discord bots with voice capabilities.