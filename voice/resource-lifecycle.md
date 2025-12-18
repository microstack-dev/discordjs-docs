# Resource Lifecycle

Discord.js v14.25.1 voice resource management for production bots. This section covers connection cleanup, memory management, and error recovery strategies for reliable voice applications.

## Connection Cleanup

Proper cleanup of voice connections and associated resources.

### Cleanup Strategies

```js
class VoiceConnectionCleanupManager {
  constructor(client) {
    this.client = client
    this.connections = new Map()
    this.cleanupTimers = new Map()
    this.stats = {
      totalCleanups: 0,
      forcedCleanups: 0,
      automaticCleanups: 0,
      failedCleanups: 0
    }

    this.setupEventHandlers()
    this.startPeriodicCleanup()
  }

  setupEventHandlers() {
    this.client.on('voiceStateUpdate', (oldState, newState) => {
      this.handleVoiceStateUpdate(oldState, newState)
    })

    this.client.on('guildDelete', (guild) => {
      this.handleGuildDelete(guild)
    })

    this.client.on('channelDelete', (channel) => {
      this.handleChannelDelete(channel)
    })
  }

  registerConnection(guildId, connection, metadata = {}) {
    const connectionInfo = {
      connection,
      metadata,
      registeredAt: Date.now(),
      lastActivity: Date.now(),
      cleanupScheduled: false
    }

    this.connections.set(guildId, connectionInfo)

    // Set up activity monitoring
    this.setupActivityMonitoring(guildId, connection)
  }

  setupActivityMonitoring(guildId, connection) {
    const updateActivity = () => {
      const info = this.connections.get(guildId)
      if (info) {
        info.lastActivity = Date.now()

        // Cancel any scheduled cleanup
        if (info.cleanupScheduled) {
          this.cancelCleanupTimer(guildId)
          info.cleanupScheduled = false
        }
      }
    }

    // Monitor various connection events
    connection.on('speaking', updateActivity)
    connection.on('stateChange', updateActivity)

    // Also monitor the player if available
    if (connection.player) {
      connection.player.on('stateChange', updateActivity)
    }
  }

  async handleVoiceStateUpdate(oldState, newState) {
    const guildId = newState.guild.id

    // Bot was disconnected
    if (newState.member.id === this.client.user.id) {
      if (!newState.channel && oldState.channel) {
        await this.scheduleCleanup(guildId, 'bot_disconnected')
      } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        // Bot moved channels
        await this.handleChannelMove(guildId, oldState.channel, newState.channel)
      }
    }

    // Check if bot is alone in channel
    if (newState.channel && newState.member.id === this.client.user.id) {
      const members = newState.channel.members.filter(member => !member.user.bot)
      if (members.size === 0) {
        await this.scheduleCleanup(guildId, 'alone_in_channel', 5 * 60 * 1000) // 5 minutes
      }
    }
  }

  async handleGuildDelete(guild) {
    await this.forceCleanup(guild.id, 'guild_deleted')
  }

  async handleChannelDelete(channel) {
    // Find connections in this channel
    for (const [guildId, info] of this.connections) {
      if (info.connection?.channel?.id === channel.id) {
        await this.forceCleanup(guildId, 'channel_deleted')
        break
      }
    }
  }

  async handleChannelMove(guildId, oldChannel, newChannel) {
    const info = this.connections.get(guildId)
    if (info) {
      info.connection.channel = newChannel
      info.lastActivity = Date.now()
    }
  }

  async scheduleCleanup(guildId, reason, delay = 300000) { // 5 minutes default
    const info = this.connections.get(guildId)
    if (!info) return

    // Cancel existing timer
    this.cancelCleanupTimer(guildId)

    const timer = setTimeout(async () => {
      await this.performCleanup(guildId, reason)
    }, delay)

    this.cleanupTimers.set(guildId, timer)
    info.cleanupScheduled = true

    console.log(`Scheduled cleanup for guild ${guildId} in ${delay}ms (reason: ${reason})`)
  }

  cancelCleanupTimer(guildId) {
    const timer = this.cleanupTimers.get(guildId)
    if (timer) {
      clearTimeout(timer)
      this.cleanupTimers.delete(guildId)
    }
  }

  async performCleanup(guildId, reason) {
    const info = this.connections.get(guildId)
    if (!info) return

    try {
      console.log(`Performing cleanup for guild ${guildId} (reason: ${reason})`)

      // Disconnect from voice channel
      if (info.connection && info.connection.state.status !== 'destroyed') {
        await info.connection.destroy()
      }

      // Clean up associated resources
      await this.cleanupResources(guildId, info)

      this.connections.delete(guildId)
      this.cleanupTimers.delete(guildId)

      this.stats.totalCleanups++
      this.stats.automaticCleanups++

      console.log(`Cleanup completed for guild ${guildId}`)
    } catch (error) {
      console.error(`Failed to cleanup guild ${guildId}:`, error)
      this.stats.failedCleanups++
    }
  }

  async cleanupResources(guildId, connectionInfo) {
    // Stop any playing audio
    if (connectionInfo.connection.player) {
      connectionInfo.connection.player.stop()
    }

    // Clean up audio resources
    if (connectionInfo.metadata.resourcePool) {
      connectionInfo.metadata.resourcePool.release(guildId)
    }

    // Clean up streams
    if (connectionInfo.metadata.activeStreams) {
      connectionInfo.metadata.activeStreams.forEach(streamId => {
        // Cleanup logic for streams
      })
    }

    // Emit cleanup event for other components
    this.client.emit('voiceConnectionCleanup', {
      guildId,
      reason: connectionInfo.metadata.cleanupReason || 'unknown',
      duration: Date.now() - connectionInfo.registeredAt
    })
  }

  async forceCleanup(guildId, reason) {
    this.cancelCleanupTimer(guildId)

    const info = this.connections.get(guildId)
    if (info) {
      info.metadata.cleanupReason = reason
    }

    await this.performCleanup(guildId, reason)
    this.stats.forcedCleanups++
  }

  startPeriodicCleanup() {
    // Clean up inactive connections every 10 minutes
    setInterval(() => {
      this.performPeriodicCleanup()
    }, 10 * 60 * 1000)
  }

  async performPeriodicCleanup() {
    const now = Date.now()
    const maxInactiveTime = 30 * 60 * 1000 // 30 minutes

    for (const [guildId, info] of this.connections) {
      const inactiveTime = now - info.lastActivity

      if (inactiveTime > maxInactiveTime) {
        console.log(`Cleaning up inactive connection for guild ${guildId} (${inactiveTime}ms inactive)`)
        await this.forceCleanup(guildId, 'inactive_timeout')
      }
    }
  }

  getConnectionInfo(guildId) {
    const info = this.connections.get(guildId)
    if (!info) return null

    return {
      guildId,
      registeredAt: info.registeredAt,
      lastActivity: info.lastActivity,
      cleanupScheduled: info.cleanupScheduled,
      metadata: info.metadata
    }
  }

  getCleanupStats() {
    return {
      ...this.stats,
      activeConnections: this.connections.size,
      scheduledCleanups: this.cleanupTimers.size
    }
  }

  async gracefulShutdown() {
    console.log('Starting voice connection cleanup shutdown...')

    // Cancel all timers
    for (const timer of this.cleanupTimers.values()) {
      clearTimeout(timer)
    }
    this.cleanupTimers.clear()

    // Force cleanup all connections
    const guildIds = Array.from(this.connections.keys())
    await Promise.all(guildIds.map(guildId =>
      this.forceCleanup(guildId, 'shutdown')
    ))

    console.log('Voice connection cleanup shutdown complete')
  }
}
```

### Resource Tracking

```js
class VoiceResourceTracker {
  constructor() {
    this.resources = new Map()
    this.resourceTypes = new Set(['connection', 'player', 'stream', 'buffer', 'effect'])
    this.stats = {
      totalAllocated: 0,
      totalFreed: 0,
      currentAllocated: 0,
      peakAllocated: 0,
      leaksDetected: 0
    }
  }

  trackResource(resourceId, type, metadata = {}) {
    if (!this.resourceTypes.has(type)) {
      throw new Error(`Unknown resource type: ${type}`)
    }

    const resourceInfo = {
      type,
      allocatedAt: Date.now(),
      metadata,
      stackTrace: new Error().stack // For debugging leaks
    }

    this.resources.set(resourceId, resourceInfo)
    this.stats.totalAllocated++
    this.stats.currentAllocated++

    if (this.stats.currentAllocated > this.stats.peakAllocated) {
      this.stats.peakAllocated = this.stats.currentAllocated
    }
  }

  releaseResource(resourceId) {
    const resourceInfo = this.resources.get(resourceId)
    if (!resourceInfo) {
      console.warn(`Attempted to release unknown resource: ${resourceId}`)
      return
    }

    this.resources.delete(resourceId)
    this.stats.totalFreed++
    this.stats.currentAllocated--
  }

  getResourceInfo(resourceId) {
    return this.resources.get(resourceId) || null
  }

  getResourcesByType(type) {
    return Array.from(this.resources.values())
      .filter(resource => resource.type === type)
  }

  getResourcesByGuild(guildId) {
    return Array.from(this.resources.values())
      .filter(resource => resource.metadata.guildId === guildId)
  }

  detectLeaks() {
    const now = Date.now()
    const maxAge = 60 * 60 * 1000 // 1 hour
    const leaks = []

    for (const [resourceId, resourceInfo] of this.resources) {
      const age = now - resourceInfo.allocatedAt

      if (age > maxAge) {
        leaks.push({
          resourceId,
          type: resourceInfo.type,
          age,
          allocatedAt: resourceInfo.allocatedAt,
          metadata: resourceInfo.metadata,
          stackTrace: resourceInfo.stackTrace
        })
      }
    }

    this.stats.leaksDetected = leaks.length
    return leaks
  }

  cleanupExpiredResources(maxAge = 3600000) { // 1 hour
    const now = Date.now()
    const toCleanup = []

    for (const [resourceId, resourceInfo] of this.resources) {
      const age = now - resourceInfo.allocatedAt

      if (age > maxAge) {
        toCleanup.push(resourceId)
      }
    }

    toCleanup.forEach(resourceId => {
      this.releaseResource(resourceId)
    })

    console.log(`Cleaned up ${toCleanup.length} expired voice resources`)
    return toCleanup.length
  }

  getStats() {
    return {
      ...this.stats,
      resourceTypes: Array.from(this.resourceTypes),
      resourceCount: this.resources.size,
      resourcesByType: this.getResourceCountsByType()
    }
  }

  getResourceCountsByType() {
    const counts = {}

    for (const type of this.resourceTypes) {
      counts[type] = this.getResourcesByType(type).length
    }

    return counts
  }

  logResourceLeak(resourceId) {
    const resourceInfo = this.resources.get(resourceId)
    if (!resourceInfo) return

    console.error(`Resource leak detected: ${resourceId}`)
    console.error(`Type: ${resourceInfo.type}`)
    console.error(`Allocated: ${new Date(resourceInfo.allocatedAt).toISOString()}`)
    console.error(`Metadata:`, resourceInfo.metadata)
    console.error(`Stack trace:`, resourceInfo.stackTrace)
  }

  startLeakDetection(interval = 30 * 60 * 1000) { // 30 minutes
    setInterval(() => {
      const leaks = this.detectLeaks()

      if (leaks.length > 0) {
        console.warn(`Detected ${leaks.length} potential resource leaks`)

        leaks.forEach(leak => {
          this.logResourceLeak(leak.resourceId)
        })
      }
    }, interval)
  }
}
```

## Memory Management

Efficient memory usage and garbage collection for voice resources.

### Memory Pool Management

```js
class VoiceMemoryPool {
  constructor(options = {}) {
    this.bufferPool = new Map()
    this.maxBufferSize = options.maxBufferSize || 10 * 1024 * 1024 // 10MB
    this.bufferSize = options.bufferSize || 64 * 1024 // 64KB
    this.maxBuffers = options.maxBuffers || 100

    this.stats = {
      buffersCreated: 0,
      buffersReused: 0,
      buffersDestroyed: 0,
      totalMemoryUsed: 0,
      peakMemoryUsed: 0
    }
  }

  acquireBuffer(size = this.bufferSize) {
    // Round up to nearest buffer size
    const bufferSize = Math.ceil(size / this.bufferSize) * this.bufferSize

    // Check if we have a suitable buffer in the pool
    const availableBuffers = this.bufferPool.get(bufferSize) || []

    if (availableBuffers.length > 0) {
      const buffer = availableBuffers.pop()
      this.stats.buffersReused++
      return buffer
    }

    // Check memory limit
    if (this.stats.totalMemoryUsed + bufferSize > this.maxBufferSize) {
      this.evictLRU(bufferSize)
    }

    // Create new buffer
    const buffer = Buffer.allocUnsafe(bufferSize)
    this.stats.buffersCreated++
    this.stats.totalMemoryUsed += bufferSize

    if (this.stats.totalMemoryUsed > this.stats.peakMemoryUsed) {
      this.stats.peakMemoryUsed = this.stats.totalMemoryUsed
    }

    return buffer
  }

  releaseBuffer(buffer) {
    const bufferSize = buffer.length

    if (!this.bufferPool.has(bufferSize)) {
      this.bufferPool.set(bufferSize, [])
    }

    const pool = this.bufferPool.get(bufferSize)

    // Don't pool if we're at the limit
    if (pool.length >= this.maxBuffers) {
      this.stats.buffersDestroyed++
      this.stats.totalMemoryUsed -= bufferSize
      return
    }

    // Clear buffer before pooling
    buffer.fill(0)
    pool.push(buffer)
  }

  evictLRU(requiredSize) {
    // Simple eviction: remove from largest pools first
    const sizes = Array.from(this.bufferPool.keys()).sort((a, b) => b - a)

    for (const size of sizes) {
      const pool = this.bufferPool.get(size)

      while (pool.length > 0 && this.stats.totalMemoryUsed + requiredSize > this.maxBufferSize) {
        const buffer = pool.pop()
        this.stats.buffersDestroyed++
        this.stats.totalMemoryUsed -= size
      }

      if (this.stats.totalMemoryUsed + requiredSize <= this.maxBufferSize) {
        break
      }
    }
  }

  getStats() {
    const poolStats = {}

    for (const [size, buffers] of this.bufferPool) {
      poolStats[size] = {
        count: buffers.length,
        memoryUsed: size * buffers.length
      }
    }

    return {
      ...this.stats,
      poolStats,
      totalPools: this.bufferPool.size
    }
  }

  cleanup() {
    let totalFreed = 0

    for (const pool of this.bufferPool.values()) {
      totalFreed += pool.length
      pool.length = 0 // Clear all pools
    }

    this.bufferPool.clear()
    this.stats.totalMemoryUsed = 0

    console.log(`Cleaned up ${totalFreed} voice memory buffers`)
    return totalFreed
  }
}
```

### Garbage Collection Optimization

```js
class VoiceGCManager {
  constructor() {
    this.gcStats = {
      collections: 0,
      totalTime: 0,
      lastGC: 0,
      forcedGC: 0
    }

    this.memoryThreshold = 100 * 1024 * 1024 // 100MB
    this.gcCooldown = 5 * 60 * 1000 // 5 minutes

    this.startMemoryMonitoring()
  }

  startMemoryMonitoring() {
    setInterval(() => {
      this.checkMemoryPressure()
    }, 30000) // Check every 30 seconds
  }

  checkMemoryPressure() {
    const memUsage = process.memoryUsage()

    if (memUsage.heapUsed > this.memoryThreshold) {
      this.performGC()
    }
  }

  performGC() {
    const now = Date.now()

    // Check cooldown
    if (now - this.gcStats.lastGC < this.gcCooldown) {
      return
    }

    if (typeof global.gc === 'function') {
      const startTime = Date.now()
      global.gc()
      const duration = Date.now() - startTime

      this.gcStats.collections++
      this.gcStats.totalTime += duration
      this.gcStats.lastGC = now
      this.gcStats.forcedGC++

      console.log(`Voice GC completed in ${duration}ms`)
    }
  }

  forceGC() {
    if (typeof global.gc === 'function') {
      const startTime = Date.now()
      global.gc()
      const duration = Date.now() - startTime

      this.gcStats.collections++
      this.gcStats.totalTime += duration
      this.gcStats.lastGC = Date.now()

      console.log(`Forced voice GC completed in ${duration}ms`)
      return true
    }

    return false
  }

  getGCStats() {
    return {
      ...this.gcStats,
      averageGCTime: this.gcStats.collections > 0 ?
        this.gcStats.totalTime / this.gcStats.collections : 0
    }
  }

  setMemoryThreshold(threshold) {
    this.memoryThreshold = threshold
  }

  setGCCooldown(cooldown) {
    this.gcCooldown = cooldown
  }
}
```

## Error Recovery

Robust error handling and recovery for voice resources.

### Error Recovery Strategies

```js
class VoiceErrorRecoveryManager {
  constructor(client) {
    this.client = client
    this.recoveryStrategies = new Map()
    this.errorStats = new Map()
    this.maxRetries = 3

    this.setupDefaultStrategies()
  }

  setupDefaultStrategies() {
    this.registerStrategy('connection_failed', this.recoverConnectionFailed.bind(this))
    this.registerStrategy('audio_playback_error', this.recoverAudioPlaybackError.bind(this))
    this.registerStrategy('stream_error', this.recoverStreamError.bind(this))
    this.registerStrategy('memory_error', this.recoverMemoryError.bind(this))
    this.registerStrategy('codec_error', this.recoverCodecError.bind(this))
  }

  registerStrategy(errorType, strategy) {
    this.recoveryStrategies.set(errorType, strategy)
  }

  async handleError(error, context = {}) {
    const errorType = this.classifyError(error)
    const errorKey = `${errorType}_${context.guildId || 'global'}`

    // Track error statistics
    const stats = this.errorStats.get(errorKey) || {
      count: 0,
      lastError: null,
      firstSeen: Date.now()
    }

    stats.count++
    stats.lastError = {
      error: error.message,
      timestamp: Date.now(),
      context
    }

    this.errorStats.set(errorKey, stats)

    // Attempt recovery
    const strategy = this.recoveryStrategies.get(errorType)
    if (strategy) {
      try {
        console.log(`Attempting recovery for ${errorType} in guild ${context.guildId}`)
        const recovered = await strategy(error, context)

        if (recovered) {
          console.log(`Successfully recovered from ${errorType}`)
          // Reset error count on successful recovery
          stats.count = 0
          return true
        }
      } catch (recoveryError) {
        console.error(`Recovery failed for ${errorType}:`, recoveryError)
      }
    }

    // Recovery failed or no strategy available
    console.error(`Failed to recover from ${errorType}:`, error.message)
    return false
  }

  classifyError(error) {
    const message = error.message.toLowerCase()

    if (message.includes('connection') || message.includes('connect')) {
      return 'connection_failed'
    }

    if (message.includes('playback') || message.includes('audio')) {
      return 'audio_playback_error'
    }

    if (message.includes('stream')) {
      return 'stream_error'
    }

    if (message.includes('memory') || message.includes('out of memory')) {
      return 'memory_error'
    }

    if (message.includes('codec') || message.includes('format')) {
      return 'codec_error'
    }

    return 'unknown_error'
  }

  async recoverConnectionFailed(error, context) {
    const { guildId, connection } = context

    if (!guildId) return false

    // Try to reconnect with exponential backoff
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Connection recovery attempt ${attempt} for guild ${guildId}`)

        // Destroy existing connection
        if (connection) {
          connection.destroy()
        }

        // Wait before reconnecting
        await this.delay(Math.pow(2, attempt) * 1000)

        // Attempt to rejoin channel
        const guild = this.client.guilds.cache.get(guildId)
        if (!guild) return false

        const botMember = guild.members.cache.get(this.client.user.id)
        if (!botMember?.voice.channel) return false

        const newConnection = await botMember.voice.channel.join()

        // Update context with new connection
        context.connection = newConnection

        return true
      } catch (retryError) {
        console.error(`Connection recovery attempt ${attempt} failed:`, retryError.message)
      }
    }

    return false
  }

  async recoverAudioPlaybackError(error, context) {
    const { player, currentTrack } = context

    if (!player || !currentTrack) return false

    try {
      // Stop current playback
      player.stop()

      // Wait a moment
      await this.delay(1000)

      // Retry playback
      await player.play(currentTrack)

      return true
    } catch (retryError) {
      console.error('Audio playback recovery failed:', retryError)
      return false
    }
  }

  async recoverStreamError(error, context) {
    const { streamer, streamId } = context

    if (!streamer || !streamId) return false

    try {
      // Clean up the failed stream
      streamer.cleanupStream(streamId)

      // The streamer should handle recreation automatically
      return true
    } catch (cleanupError) {
      console.error('Stream cleanup failed:', cleanupError)
      return false
    }
  }

  async recoverMemoryError(error, context) {
    try {
      // Force garbage collection if available
      if (typeof global.gc === 'function') {
        global.gc()
      }

      // Clear any cached resources
      if (context.resourcePool) {
        context.resourcePool.cleanup()
      }

      // Wait for memory to be freed
      await this.delay(2000)

      return true
    } catch (gcError) {
      console.error('Memory recovery failed:', gcError)
      return false
    }
  }

  async recoverCodecError(error, context) {
    const { codecManager, audioSource } = context

    if (!codecManager || !audioSource) return false

    try {
      // Try to convert the audio to a supported format
      const convertedPath = await codecManager.convertToOpus(audioSource, `/tmp/recovered_${Date.now()}.opus`)

      // Update context with converted file
      context.audioSource = convertedPath

      return true
    } catch (conversionError) {
      console.error('Codec recovery failed:', conversionError)
      return false
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getErrorStats() {
    const stats = {}

    for (const [errorKey, errorStats] of this.errorStats) {
      stats[errorKey] = {
        count: errorStats.count,
        lastError: errorStats.lastError,
        firstSeen: errorStats.firstSeen
      }
    }

    return stats
  }

  resetErrorStats(errorKey) {
    if (errorKey) {
      this.errorStats.delete(errorKey)
    } else {
      this.errorStats.clear()
    }
  }
}
```

### Resource Lifecycle Integration

```js
class VoiceResourceLifecycleManager {
  constructor(client) {
    this.client = client

    // Initialize all resource managers
    this.cleanupManager = new VoiceConnectionCleanupManager(client)
    this.resourceTracker = new VoiceResourceTracker()
    this.memoryPool = new VoiceMemoryPool()
    this.gcManager = new VoiceGCManager()
    this.errorRecovery = new VoiceErrorRecoveryManager(client)

    // Start background tasks
    this.startBackgroundTasks()
  }

  startBackgroundTasks() {
    // Periodic resource cleanup
    setInterval(() => {
      this.performMaintenance()
    }, 5 * 60 * 1000) // Every 5 minutes

    // Leak detection
    this.resourceTracker.startLeakDetection()

    // Memory pool cleanup
    setInterval(() => {
      this.memoryPool.cleanup()
    }, 15 * 60 * 1000) // Every 15 minutes
  }

  async registerVoiceConnection(guildId, connection, metadata = {}) {
    // Register with cleanup manager
    this.cleanupManager.registerConnection(guildId, connection, metadata)

    // Track resources
    this.resourceTracker.trackResource(`connection_${guildId}`, 'connection', {
      guildId,
      ...metadata
    })

    // Set up error handling
    connection.on('error', async (error) => {
      const recovered = await this.errorRecovery.handleError(error, {
        guildId,
        connection,
        type: 'connection'
      })

      if (!recovered) {
        // Force cleanup if recovery failed
        await this.cleanupManager.forceCleanup(guildId, 'unrecoverable_error')
      }
    })
  }

  async allocateBuffer(size) {
    const buffer = this.memoryPool.acquireBuffer(size)

    const bufferId = `buffer_${Date.now()}_${Math.random()}`
    this.resourceTracker.trackResource(bufferId, 'buffer', {
      size: buffer.length
    })

    return { buffer, bufferId }
  }

  releaseBuffer(bufferId, buffer) {
    this.memoryPool.releaseBuffer(buffer)
    this.resourceTracker.releaseResource(bufferId)
  }

  async handleError(error, context = {}) {
    return await this.errorRecovery.handleError(error, context)
  }

  async performMaintenance() {
    console.log('Performing voice resource maintenance...')

    // Clean up expired resources
    const cleaned = this.resourceTracker.cleanupExpiredResources()

    // Check for leaks
    const leaks = this.resourceTracker.detectLeaks()

    if (leaks.length > 0) {
      console.warn(`Detected ${leaks.length} resource leaks during maintenance`)
    }

    // Force GC if needed
    this.gcManager.performGC()

    console.log(`Voice resource maintenance complete. Cleaned: ${cleaned}, Leaks: ${leaks.length}`)
  }

  getSystemStats() {
    return {
      cleanup: this.cleanupManager.getCleanupStats(),
      resources: this.resourceTracker.getStats(),
      memory: this.memoryPool.getStats(),
      gc: this.gcManager.getGCStats(),
      errors: this.errorRecovery.getErrorStats()
    }
  }

  async gracefulShutdown() {
    console.log('Starting voice resource lifecycle shutdown...')

    // Stop background tasks
    // Note: In a real implementation, you'd store interval IDs to clear them

    // Perform final cleanup
    await this.cleanupManager.gracefulShutdown()

    // Clean up remaining resources
    this.memoryPool.cleanup()

    // Force final GC
    this.gcManager.forceGC()

    console.log('Voice resource lifecycle shutdown complete')
  }
}
```

## Best Practices

### Implementation Guidelines

1. **Implement comprehensive cleanup** for all voice connections and resources
2. **Track resource allocation** and deallocation to detect leaks
3. **Use memory pools** for frequently allocated buffers
4. **Monitor memory usage** and trigger GC when necessary
5. **Implement error recovery** strategies for different failure types
6. **Schedule periodic maintenance** to clean up expired resources
7. **Handle connection state changes** gracefully
8. **Monitor resource leaks** and log warnings
9. **Use proper cleanup timers** to avoid resource exhaustion
10. **Test cleanup procedures** under various failure conditions

### Production Considerations

```js
// Complete voice resource lifecycle system
class ProductionVoiceResourceManager {
  constructor(client) {
    this.client = client

    // Core lifecycle management
    this.lifecycleManager = new VoiceResourceLifecycleManager(client)

    // Additional monitoring
    this.healthMonitor = new VoiceConnectionHealthMonitor()
    this.performanceMonitor = new VoicePerformanceMonitor()

    // Stats aggregation
    this.stats = {
      uptime: Date.now(),
      totalConnections: 0,
      totalResourceAllocations: 0,
      totalCleanups: 0,
      activeConnections: 0
    }

    this.startMetricsCollection()
  }

  startMetricsCollection() {
    setInterval(() => {
      this.collectMetrics()
    }, 60000) // Every minute
  }

  collectMetrics() {
    const lifecycleStats = this.lifecycleManager.getSystemStats()
    const healthStats = this.healthMonitor.getHealthReport()
    const performanceStats = this.performanceMonitor.getPerformanceReport()

    // Aggregate stats
    this.stats.activeConnections = lifecycleStats.cleanup.activeConnections
    this.stats.totalConnections = lifecycleStats.cleanup.totalCleanups +
                                 lifecycleStats.cleanup.activeConnections
    this.stats.totalResourceAllocations = lifecycleStats.resources.totalAllocated
    this.stats.totalCleanups = lifecycleStats.cleanup.totalCleanups

    // Log critical issues
    if (healthStats.isHealthy === false) {
      console.error('Voice system health degraded:', healthStats)
    }

    if (lifecycleStats.resources.leaksDetected > 0) {
      console.warn(`Resource leaks detected: ${lifecycleStats.resources.leaksDetected}`)
    }
  }

  async createVoiceConnection(guildId, channel) {
    try {
      const connection = await channel.join()

      await this.lifecycleManager.registerVoiceConnection(guildId, connection, {
        channelId: channel.id,
        createdAt: Date.now()
      })

      this.stats.totalConnections++
      this.stats.activeConnections++

      return connection
    } catch (error) {
      console.error('Failed to create voice connection:', error)
      throw error
    }
  }

  async allocateResource(type, size, context = {}) {
    try {
      let resource, resourceId

      switch (type) {
        case 'buffer':
          ({ buffer: resource, bufferId: resourceId } = await this.lifecycleManager.allocateBuffer(size))
          break
        default:
          throw new Error(`Unknown resource type: ${type}`)
      }

      this.stats.totalResourceAllocations++

      return { resource, resourceId }
    } catch (error) {
      console.error('Failed to allocate resource:', error)
      throw error
    }
  }

  releaseResource(resourceId, resource, type) {
    try {
      switch (type) {
        case 'buffer':
          this.lifecycleManager.releaseBuffer(resourceId, resource)
          break
        default:
          console.warn(`Unknown resource type for release: ${type}`)
      }
    } catch (error) {
      console.error('Failed to release resource:', error)
    }
  }

  async handleVoiceError(error, context = {}) {
    const recovered = await this.lifecycleManager.handleError(error, context)

    if (!recovered) {
      console.error('Voice error recovery failed:', error)
      // Implement escalation procedures
    }

    return recovered
  }

  getSystemHealth() {
    const lifecycleStats = this.lifecycleManager.getSystemStats()
    const healthStats = this.healthMonitor.getHealthReport()

    return {
      overallHealth: this.calculateOverallHealth(lifecycleStats, healthStats),
      components: {
        lifecycle: lifecycleStats,
        health: healthStats
      },
      stats: this.stats
    }
  }

  calculateOverallHealth(lifecycleStats, healthStats) {
    // Simple health calculation
    const healthFactors = [
      lifecycleStats.resources.leaksDetected === 0 ? 1 : 0,
      healthStats.isHealthy ? 1 : 0,
      lifecycleStats.cleanup.failedCleanups === 0 ? 1 : 0
    ]

    const averageHealth = healthFactors.reduce((sum, factor) => sum + factor, 0) / healthFactors.length

    if (averageHealth >= 0.8) return 'healthy'
    if (averageHealth >= 0.5) return 'degraded'
    return 'unhealthy'
  }

  async gracefulShutdown() {
    console.log('Starting production voice resource manager shutdown...')

    await this.lifecycleManager.gracefulShutdown()

    // Final metrics collection
    this.collectMetrics()

    console.log('Production voice resource manager shutdown complete')
  }
}
```

This comprehensive resource lifecycle management system ensures reliable cleanup, efficient memory usage, and robust error recovery for production voice applications.