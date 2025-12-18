# Voice Error Handling

Discord.js v14.25.1 comprehensive error handling for voice applications. This section covers voice-specific errors, recovery strategies, and robust error management patterns.

## Voice Error Types

Understanding different categories of voice-related errors.

### Connection Errors

```js
class VoiceConnectionErrorHandler {
  constructor(client) {
    this.client = client
    this.connectionErrors = new Map()
    this.errorPatterns = new Map()
    this.recoveryStrategies = {
      'no_route': this.handleNoRouteError.bind(this),
      'connection_timeout': this.handleConnectionTimeout.bind(this),
      'authentication_failed': this.handleAuthenticationError.bind(this),
      'server_not_found': this.handleServerNotFoundError.bind(this),
      'channel_full': this.handleChannelFullError.bind(this),
      'permission_denied': this.handlePermissionError.bind(this)
    }

    this.setupErrorTracking()
  }

  setupErrorTracking() {
    this.client.on('voiceStateUpdate', (oldState, newState) => {
      // Track voice connection errors
      if (newState.member.id === this.client.user.id) {
        if (newState.channelId === null && oldState.channelId !== null) {
          // Bot was disconnected unexpectedly
          this.trackError('unexpected_disconnect', {
            guildId: newState.guild.id,
            oldChannelId: oldState.channelId,
            reason: 'unknown'
          })
        }
      }
    })
  }

  trackError(errorType, context = {}) {
    const errorKey = `${errorType}_${context.guildId || 'global'}`
    const errorCount = (this.connectionErrors.get(errorKey) || 0) + 1

    this.connectionErrors.set(errorKey, errorCount)

    // Track error patterns for analysis
    this.updateErrorPatterns(errorType, context)

    console.error(`Voice connection error [${errorType}]:`, context)

    // Attempt recovery
    this.attemptRecovery(errorType, context)
  }

  updateErrorPatterns(errorType, context) {
    const patternKey = `${errorType}_${new Date().getHours()}` // Hourly patterns

    if (!this.errorPatterns.has(patternKey)) {
      this.errorPatterns.set(patternKey, {
        count: 0,
        contexts: []
      })
    }

    const pattern = this.errorPatterns.get(patternKey)
    pattern.count++
    pattern.contexts.push(context)

    // Keep only recent contexts
    if (pattern.contexts.length > 10) {
      pattern.contexts.shift()
    }
  }

  async attemptRecovery(errorType, context) {
    const strategy = this.recoveryStrategies[errorType]

    if (strategy) {
      try {
        console.log(`Attempting recovery for ${errorType}`)
        const recovered = await strategy(context)

        if (recovered) {
          console.log(`Successfully recovered from ${errorType}`)
        } else {
          console.error(`Recovery failed for ${errorType}`)
        }

        return recovered
      } catch (error) {
        console.error(`Recovery strategy failed for ${errorType}:`, error)
        return false
      }
    } else {
      console.warn(`No recovery strategy for ${errorType}`)
      return false
    }
  }

  async handleNoRouteError(context) {
    // No route to voice server - usually temporary
    console.log('No route to voice server, waiting before retry...')

    await this.delay(5000) // Wait 5 seconds

    // Attempt to reconnect
    return this.attemptReconnect(context.guildId)
  }

  async handleConnectionTimeout(context) {
    // Connection timed out - try different region or retry
    console.log('Voice connection timeout, attempting recovery...')

    // Try reconnecting with backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.delay(attempt * 2000)

      const success = await this.attemptReconnect(context.guildId)
      if (success) return true
    }

    return false
  }

  async handleAuthenticationError(context) {
    // Authentication failed - token or permissions issue
    console.error('Voice authentication failed - check bot permissions and token')

    // This usually requires manual intervention
    // Send alert to administrators
    this.sendAdminAlert('Voice authentication failed', context)

    return false // Cannot auto-recover
  }

  async handleServerNotFoundError(context) {
    // Voice server not found - region or network issue
    console.log('Voice server not found, checking region...')

    const guild = this.client.guilds.cache.get(context.guildId)
    if (guild) {
      console.log(`Guild region: ${guild.region}`)

      // Try moving to a different voice channel or region
      // This is complex and usually requires manual intervention
    }

    return false
  }

  async handleChannelFullError(context) {
    // Voice channel is full
    console.log('Voice channel is full')

    // Could attempt to find alternative channel or notify user
    // For now, just log and give up
    return false
  }

  async handlePermissionError(context) {
    // Missing voice permissions
    console.error('Missing voice permissions in guild:', context.guildId)

    // Send alert to administrators
    this.sendAdminAlert('Missing voice permissions', context)

    return false
  }

  async attemptReconnect(guildId) {
    try {
      const guild = this.client.guilds.cache.get(guildId)
      if (!guild) return false

      const botMember = guild.members.cache.get(this.client.user.id)
      if (!botMember?.voice.channel) return false

      // Disconnect and reconnect
      await botMember.voice.disconnect()
      await this.delay(1000)

      await botMember.voice.channel.join()
      return true
    } catch (error) {
      console.error('Reconnection failed:', error)
      return false
    }
  }

  sendAdminAlert(title, context) {
    // Implementation depends on your alerting system
    console.error(`ADMIN ALERT: ${title}`, context)
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getErrorStats() {
    const stats = {}

    for (const [errorKey, count] of this.connectionErrors) {
      stats[errorKey] = count
    }

    return {
      errors: stats,
      patterns: Object.fromEntries(this.errorPatterns)
    }
  }

  resetErrorStats() {
    this.connectionErrors.clear()
    this.errorPatterns.clear()
  }
}
```

### Audio Playback Errors

```js
class AudioPlaybackErrorHandler {
  constructor(playerManager) {
    this.playerManager = playerManager
    this.playbackErrors = new Map()
    this.errorRecovery = {
      'ffmpeg_failed': this.handleFFmpegError.bind(this),
      'network_error': this.handleNetworkError.bind(this),
      'codec_unsupported': this.handleCodecError.bind(this),
      'file_not_found': this.handleFileNotFoundError.bind(this),
      'corrupted_file': this.handleCorruptedFileError.bind(this),
      'stream_error': this.handleStreamError.bind(this)
    }
  }

  async handlePlaybackError(error, context) {
    const errorType = this.classifyPlaybackError(error)
    const errorKey = `${errorType}_${context.guildId || 'global'}`

    const errorCount = (this.playbackErrors.get(errorKey) || 0) + 1
    this.playbackErrors.set(errorKey, errorCount)

    console.error(`Audio playback error [${errorType}]:`, error.message)

    // Attempt recovery
    const recoveryStrategy = this.errorRecovery[errorType]
    if (recoveryStrategy) {
      try {
        const recovered = await recoveryStrategy(error, context)

        if (recovered) {
          console.log(`Successfully recovered from ${errorType}`)
          return true
        }
      } catch (recoveryError) {
        console.error(`Recovery failed for ${errorType}:`, recoveryError)
      }
    }

    // Recovery failed or no strategy available
    console.error(`Failed to recover from ${errorType}`)
    return false
  }

  classifyPlaybackError(error) {
    const message = error.message.toLowerCase()

    if (message.includes('ffmpeg') || message.includes('avconv')) {
      return 'ffmpeg_failed'
    }

    if (message.includes('network') || message.includes('connection')) {
      return 'network_error'
    }

    if (message.includes('codec') || message.includes('format')) {
      return 'codec_unsupported'
    }

    if (message.includes('no such file') || message.includes('not found')) {
      return 'file_not_found'
    }

    if (message.includes('corrupt') || message.includes('invalid')) {
      return 'corrupted_file'
    }

    if (message.includes('stream')) {
      return 'stream_error'
    }

    return 'unknown_error'
  }

  async handleFFmpegError(error, context) {
    // FFmpeg not found or failed
    console.log('FFmpeg error - checking FFmpeg installation...')

    // Check if FFmpeg is available
    const ffmpegAvailable = await this.checkFFmpegAvailability()

    if (!ffmpegAvailable) {
      console.error('FFmpeg is not installed or not in PATH')
      return false
    }

    // Try alternative FFmpeg options or fallback to different processing
    console.log('Attempting alternative audio processing...')

    // For now, just return false - would need specific recovery logic
    return false
  }

  async handleNetworkError(error, context) {
    // Network issues during streaming
    console.log('Network error during playback - attempting retry...')

    const { player, track } = context

    if (player && track) {
      // Wait and retry
      await this.delay(2000)

      try {
        await player.play(track)
        return true
      } catch (retryError) {
        console.error('Retry failed:', retryError)
      }
    }

    return false
  }

  async handleCodecError(error, context) {
    // Unsupported codec - try conversion
    console.log('Codec error - attempting conversion...')

    const { track } = context

    if (track && track.url) {
      try {
        // Attempt to convert the track to supported format
        const convertedTrack = await this.convertTrack(track)
        context.track = convertedTrack
        return true
      } catch (conversionError) {
        console.error('Track conversion failed:', conversionError)
      }
    }

    return false
  }

  async handleFileNotFoundError(error, context) {
    // File not found - could be deleted or moved
    console.log('Audio file not found')

    // Remove from queue or skip
    if (context.queueManager) {
      context.queueManager.skip()
      return true
    }

    return false
  }

  async handleCorruptedFileError(error, context) {
    // Corrupted file - skip and clean up
    console.log('Corrupted audio file detected')

    if (context.track && context.track.url) {
      // Mark file as corrupted for cleanup
      this.markFileCorrupted(context.track.url)
    }

    // Skip to next track
    if (context.queueManager) {
      context.queueManager.skip()
      return true
    }

    return false
  }

  async handleStreamError(error, context) {
    // Streaming error - could be network or source issue
    console.log('Stream error - checking source...')

    const { track } = context

    if (track && track.url) {
      // Test source availability
      const isAvailable = await this.testSourceAvailability(track.url)

      if (!isAvailable) {
        console.log('Source is not available, skipping...')
        if (context.queueManager) {
          context.queueManager.skip()
          return true
        }
      } else {
        // Source is available, try different streaming approach
        console.log('Source available, trying alternative streaming method...')
        // Implementation would depend on available streaming methods
      }
    }

    return false
  }

  async checkFFmpegAvailability() {
    return new Promise((resolve) => {
      const { spawn } = require('child_process')

      const ffmpeg = spawn('ffmpeg', ['-version'], {
        stdio: 'ignore'
      })

      ffmpeg.on('close', (code) => {
        resolve(code === 0)
      })

      ffmpeg.on('error', () => {
        resolve(false)
      })
    })
  }

  async convertTrack(track) {
    // Simplified conversion - would need actual implementation
    console.log('Converting track to supported format...')
    // This would use FFmpeg or similar to convert the track

    return track // Placeholder
  }

  markFileCorrupted(url) {
    // Mark file as corrupted for future reference
    console.log(`Marking file as corrupted: ${url}`)
    // Implementation would depend on your file management system
  }

  async testSourceAvailability(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok
    } catch (error) {
      return false
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getPlaybackErrorStats() {
    const stats = {}

    for (const [errorKey, count] of this.playbackErrors) {
      stats[errorKey] = count
    }

    return stats
  }
}
```

## Recovery Strategies

Comprehensive error recovery and fallback mechanisms.

### Circuit Breaker Pattern

```js
class VoiceCircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5
    this.recoveryTimeout = options.recoveryTimeout || 60000
    this.monitoringPeriod = options.monitoringPeriod || 60000

    this.state = 'CLOSED' // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0
    this.lastFailureTime = 0
    this.nextAttemptTime = 0

    this.failureHistory = []
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN')
      }

      // Try half-open
      this.state = 'HALF_OPEN'
    }

    try {
      const result = await operation()

      // Success - reset circuit
      this.onSuccess()
      return result

    } catch (error) {
      this.onFailure(error)
      throw error
    }
  }

  onSuccess() {
    this.failureCount = 0
    this.state = 'CLOSED'
    console.log('Voice circuit breaker reset to CLOSED')
  }

  onFailure(error) {
    this.failureCount++
    this.lastFailureTime = Date.now()
    this.failureHistory.push({
      error: error.message,
      timestamp: this.lastFailureTime
    })

    // Keep only recent failures
    if (this.failureHistory.length > 20) {
      this.failureHistory.shift()
    }

    if (this.failureCount >= this.failureThreshold) {
      this.tripCircuit()
    }
  }

  tripCircuit() {
    this.state = 'OPEN'
    this.nextAttemptTime = Date.now() + this.recoveryTimeout
    console.warn(`Voice circuit breaker tripped OPEN for ${this.recoveryTimeout}ms`)
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttemptTime: this.nextAttemptTime,
      timeUntilRetry: Math.max(0, this.nextAttemptTime - Date.now())
    }
  }

  getFailureStats() {
    const now = Date.now()
    const recentFailures = this.failureHistory.filter(
      failure => now - failure.timestamp < this.monitoringPeriod
    )

    return {
      totalFailures: this.failureHistory.length,
      recentFailures: recentFailures.length,
      failureRate: recentFailures.length / (this.monitoringPeriod / 60000) // per minute
    }
  }

  reset() {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.failureHistory = []
    console.log('Voice circuit breaker manually reset')
  }
}
```

### Fallback Mechanisms

```js
class VoiceFallbackManager {
  constructor(client) {
    this.client = client
    this.fallbacks = new Map()
    this.fallbackStats = new Map()

    this.setupDefaultFallbacks()
  }

  setupDefaultFallbacks() {
    // Connection fallbacks
    this.registerFallback('connection_failed', [
      this.fallbackToDifferentRegion.bind(this),
      this.fallbackToDifferentChannel.bind(this),
      this.fallbackToTextNotification.bind(this)
    ])

    // Playback fallbacks
    this.registerFallback('playback_failed', [
      this.fallbackToAlternativeFormat.bind(this),
      this.fallbackToLocalFile.bind(this),
      this.fallbackToSkipTrack.bind(this)
    ])

    // Lavalink fallbacks
    this.registerFallback('lavalink_failed', [
      this.fallbackToDifferentNode.bind(this),
      this.fallbackToLocalProcessing.bind(this)
    ])
  }

  registerFallback(errorType, fallbackChain) {
    this.fallbacks.set(errorType, fallbackChain)
  }

  async executeFallbacks(errorType, context) {
    const fallbackChain = this.fallbacks.get(errorType)

    if (!fallbackChain) {
      console.warn(`No fallbacks registered for ${errorType}`)
      return false
    }

    const statsKey = `${errorType}_${context.guildId || 'global'}`
    const stats = this.fallbackStats.get(statsKey) || {
      attempts: 0,
      successes: 0,
      failures: 0
    }

    for (const fallback of fallbackChain) {
      stats.attempts++

      try {
        console.log(`Attempting fallback: ${fallback.name}`)
        const success = await fallback(context)

        if (success) {
          stats.successes++
          console.log(`Fallback ${fallback.name} succeeded`)
          this.fallbackStats.set(statsKey, stats)
          return true
        } else {
          console.log(`Fallback ${fallback.name} failed, trying next...`)
        }
      } catch (error) {
        console.error(`Fallback ${fallback.name} threw error:`, error)
        stats.failures++
      }
    }

    this.fallbackStats.set(statsKey, stats)
    console.error(`All fallbacks failed for ${errorType}`)
    return false
  }

  async fallbackToDifferentRegion(context) {
    // Try connecting to voice in a different region
    const { guildId } = context
    const guild = this.client.guilds.cache.get(guildId)

    if (!guild) return false

    // This is complex and usually requires manual intervention
    // Could involve changing guild region or using VPN
    console.log('Region fallback not implemented - requires manual intervention')
    return false
  }

  async fallbackToDifferentChannel(context) {
    // Try connecting to a different voice channel
    const { guildId } = context
    const guild = this.client.guilds.cache.get(guildId)

    if (!guild) return false

    const botMember = guild.members.cache.get(this.client.user.id)
    if (!botMember) return false

    // Find alternative voice channel
    const alternativeChannel = guild.channels.cache
      .filter(ch => ch.type === 'GUILD_VOICE' && ch.id !== botMember.voice.channelId)
      .find(ch => ch.members.size < ch.userLimit || ch.userLimit === 0)

    if (alternativeChannel) {
      try {
        await alternativeChannel.join()
        console.log(`Joined alternative channel: ${alternativeChannel.name}`)
        return true
      } catch (error) {
        console.error('Failed to join alternative channel:', error)
      }
    }

    return false
  }

  async fallbackToTextNotification(context) {
    // Send text notification about voice issues
    const { guildId } = context
    const guild = this.client.guilds.cache.get(guildId)

    if (!guild) return false

    const systemChannel = guild.systemChannel
    if (systemChannel) {
      try {
        await systemChannel.send('⚠️ Voice connection issues detected. Attempting to resolve...')
        return true
      } catch (error) {
        console.error('Failed to send notification:', error)
      }
    }

    return false
  }

  async fallbackToAlternativeFormat(context) {
    // Try alternative audio format
    const { track } = context

    if (!track) return false

    // Implementation would depend on available formats
    console.log('Alternative format fallback not implemented')
    return false
  }

  async fallbackToLocalFile(context) {
    // Fall back to local file instead of stream
    const { track } = context

    if (!track || !track.title) return false

    // Try to find local file with similar name
    // Implementation depends on your file system
    console.log('Local file fallback not implemented')
    return false
  }

  async fallbackToSkipTrack(context) {
    // Skip the problematic track
    const { queueManager } = context

    if (queueManager) {
      queueManager.skip()
      console.log('Skipped problematic track')
      return true
    }

    return false
  }

  async fallbackToDifferentNode(context) {
    // For Lavalink: try different node
    const { lavalinkManager, guildId } = context

    if (lavalinkManager) {
      try {
        // Implementation depends on Lavalink setup
        console.log('Node fallback not implemented for Lavalink')
        return false
      } catch (error) {
        console.error('Node fallback failed:', error)
      }
    }

    return false
  }

  async fallbackToLocalProcessing(context) {
    // Fall back to local audio processing instead of Lavalink
    console.log('Local processing fallback not implemented')
    return false
  }

  getFallbackStats() {
    const stats = {}

    for (const [key, stat] of this.fallbackStats) {
      stats[key] = stat
    }

    return stats
  }
}
```

## Error Monitoring and Alerting

```js
class VoiceErrorMonitor {
  constructor(client) {
    this.client = client
    this.errorLog = []
    this.errorThresholds = {
      connectionErrors: 10, // per hour
      playbackErrors: 20,   // per hour
      alertsCooldown: 3600000 // 1 hour
    }

    this.lastAlerts = new Map()
    this.errorCounts = {
      connection: 0,
      playback: 0,
      other: 0
    }

    this.startMonitoring()
  }

  startMonitoring() {
    setInterval(() => {
      this.checkErrorThresholds()
      this.resetHourlyCounts()
    }, 3600000) // Check every hour
  }

  logError(errorType, error, context = {}) {
    const errorEntry = {
      type: errorType,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now()
    }

    this.errorLog.push(errorEntry)

    // Keep only last 1000 errors
    if (this.errorLog.length > 1000) {
      this.errorLog.shift()
    }

    // Update counts
    if (errorType.includes('connection')) {
      this.errorCounts.connection++
    } else if (errorType.includes('playback')) {
      this.errorCounts.playback++
    } else {
      this.errorCounts.other++
    }

    // Check for immediate alerts
    this.checkImmediateAlerts(errorType, errorEntry)
  }

  checkImmediateAlerts(errorType, errorEntry) {
    // Alert on critical errors immediately
    const criticalErrors = ['authentication_failed', 'server_not_found']

    if (criticalErrors.includes(errorType)) {
      this.sendAlert(`Critical voice error: ${errorType}`, errorEntry)
    }
  }

  checkErrorThresholds() {
    const now = Date.now()
    const hourAgo = now - 3600000

    const recentErrors = this.errorLog.filter(entry => entry.timestamp > hourAgo)

    const connectionErrors = recentErrors.filter(e => e.type.includes('connection')).length
    const playbackErrors = recentErrors.filter(e => e.type.includes('playback')).length

    if (connectionErrors > this.errorThresholds.connectionErrors) {
      this.sendAlert('High connection error rate', {
        connectionErrors,
        threshold: this.errorThresholds.connectionErrors
      })
    }

    if (playbackErrors > this.errorThresholds.playbackErrors) {
      this.sendAlert('High playback error rate', {
        playbackErrors,
        threshold: this.errorThresholds.playbackErrors
      })
    }
  }

  sendAlert(title, details) {
    const alertKey = title
    const now = Date.now()
    const lastAlert = this.lastAlerts.get(alertKey)

    if (!lastAlert || (now - lastAlert) > this.errorThresholds.alertsCooldown) {
      console.error(`🚨 VOICE ERROR ALERT: ${title}`)
      console.error('Details:', details)

      this.lastAlerts.set(alertKey, now)

      // Send to monitoring system
      this.sendToMonitoringSystem(title, details)
    }
  }

  sendToMonitoringSystem(title, details) {
    // Implementation depends on your monitoring solution
    console.log('Sending voice error alert to monitoring system:', { title, details })
  }

  resetHourlyCounts() {
    // Reset counts for new hour
    this.errorCounts = {
      connection: 0,
      playback: 0,
      other: 0
    }
  }

  getErrorReport() {
    const now = Date.now()
    const hourAgo = now - 3600000
    const dayAgo = now - 24 * 3600000

    const hourlyErrors = this.errorLog.filter(entry => entry.timestamp > hourAgo)
    const dailyErrors = this.errorLog.filter(entry => entry.timestamp > dayAgo)

    return {
      currentCounts: this.errorCounts,
      hourly: {
        total: hourlyErrors.length,
        byType: this.groupErrorsByType(hourlyErrors)
      },
      daily: {
        total: dailyErrors.length,
        byType: this.groupErrorsByType(dailyErrors)
      },
      recentErrors: this.errorLog.slice(-10)
    }
  }

  groupErrorsByType(errors) {
    const groups = {}

    errors.forEach(error => {
      const type = error.type
      groups[type] = (groups[type] || 0) + 1
    })

    return groups
  }

  exportErrorLog() {
    return [...this.errorLog]
  }

  clearErrorLog() {
    this.errorLog = []
    this.errorCounts = { connection: 0, playback: 0, other: 0 }
  }
}
```

## Best Practices

### Implementation Guidelines

1. **Categorize errors properly** to apply appropriate recovery strategies
2. **Implement circuit breakers** to prevent cascade failures
3. **Set up fallback mechanisms** for graceful degradation
4. **Monitor error rates** and alert on abnormal patterns
5. **Log errors comprehensively** for debugging and analysis
6. **Implement retry logic** with exponential backoff
7. **Handle permissions and authentication errors** appropriately
8. **Test error scenarios** regularly
9. **Provide user feedback** for recoverable errors
10. **Clean up resources** after errors to prevent leaks

### Production Considerations

```js
// Complete voice error handling system
class ProductionVoiceErrorManager {
  constructor(client) {
    this.client = client

    // Core error handlers
    this.connectionErrorHandler = new VoiceConnectionErrorHandler(client)
    this.playbackErrorHandler = new AudioPlaybackErrorHandler()
    this.circuitBreaker = new VoiceCircuitBreaker()
    this.fallbackManager = new VoiceFallbackManager(client)
    this.errorMonitor = new VoiceErrorMonitor(client)

    // Integration flags
    this.integrated = false
  }

  async integrateWithVoiceManager(voiceManager) {
    if (this.integrated) return

    // Set up error handling for voice connections
    voiceManager.on('connectionError', async (error, context) => {
      await this.handleConnectionError(error, context)
    })

    // Set up error handling for audio playback
    voiceManager.on('playbackError', async (error, context) => {
      await this.handlePlaybackError(error, context)
    })

    this.integrated = true
    console.log('Voice error manager integrated with voice manager')
  }

  async handleConnectionError(error, context) {
    // Log the error
    this.errorMonitor.logError('connection_error', error, context)

    // Try circuit breaker
    try {
      return await this.circuitBreaker.execute(async () => {
        // Try normal recovery first
        const recovered = await this.connectionErrorHandler.attemptRecovery(
          this.connectionErrorHandler.classifyError(error),
          context
        )

        if (!recovered) {
          // Try fallbacks
          return await this.fallbackManager.executeFallbacks('connection_failed', context)
        }

        return recovered
      })
    } catch (circuitError) {
      console.error('Circuit breaker blocked recovery:', circuitError)
      return false
    }
  }

  async handlePlaybackError(error, context) {
    // Log the error
    this.errorMonitor.logError('playback_error', error, context)

    // Try recovery
    const recovered = await this.playbackErrorHandler.handlePlaybackError(error, context)

    if (!recovered) {
      // Try fallbacks
      return await this.fallbackManager.executeFallbacks('playback_failed', context)
    }

    return recovered
  }

  getSystemHealth() {
    return {
      circuitBreaker: this.circuitBreaker.getState(),
      errorStats: this.errorMonitor.getErrorReport(),
      fallbackStats: this.fallbackManager.getFallbackStats(),
      connectionErrors: this.connectionErrorHandler.getErrorStats(),
      playbackErrors: this.playbackErrorHandler.getPlaybackErrorStats()
    }
  }

  updateErrorThresholds(newThresholds) {
    this.errorMonitor.errorThresholds = {
      ...this.errorMonitor.errorThresholds,
      ...newThresholds
    }

    if (newThresholds.failureThreshold) {
      this.circuitBreaker.failureThreshold = newThresholds.failureThreshold
    }

    console.log('Updated voice error thresholds:', newThresholds)
  }

  async gracefulShutdown() {
    console.log('Voice error manager shutting down...')

    // Export final error report
    const finalReport = this.getSystemHealth()
    console.log('Final error report:', JSON.stringify(finalReport, null, 2))

    console.log('Voice error manager shutdown complete')
  }
}
```

This comprehensive voice error handling system provides robust error detection, recovery, and fallback mechanisms for production voice applications.