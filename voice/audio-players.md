# Audio Players

Discord.js v14.25.1 audio player implementation for production voice bots. This section covers AudioPlayer lifecycle, resource management, codec support, and advanced playback features.

## AudioPlayer Lifecycle

Managing the complete lifecycle of audio playback.

### Player States

Audio players transition through defined states with proper state management:

```js
const { AudioPlayerStatus } = require('@discordjs/voice')

class AudioPlayerLifecycleManager {
  constructor(player) {
    this.player = player
    this.stateHistory = []
    this.currentState = null
    this.playbackStats = {
      totalPlayTime: 0,
      totalPauses: 0,
      totalResumes: 0,
      totalStops: 0,
      averagePlaybackTime: 0
    }

    this.playbackStartTime = null
    this.setupStateTracking()
  }

  setupStateTracking() {
    this.player.on('stateChange', (oldState, newState) => {
      this.handleStateChange(oldState, newState)
    })

    // Set initial state
    this.updateState(this.player.state.status)
  }

  handleStateChange(oldState, newState) {
    const oldStatus = oldState.status
    const newStatus = newState.status

    console.log(`Audio player state: ${oldStatus} -> ${newStatus}`)

    this.updateState(newStatus)

    // Handle specific state transitions
    switch (newStatus) {
      case AudioPlayerStatus.Playing:
        this.handlePlaying()
        break
      case AudioPlayerStatus.Paused:
        this.handlePaused()
        break
      case AudioPlayerStatus.Idle:
        this.handleIdle(oldState)
        break
      case AudioPlayerStatus.Buffering:
        this.handleBuffering()
        break
      case AudioPlayerStatus.AutoPaused:
        this.handleAutoPaused()
        break
    }
  }

  updateState(status) {
    const timestamp = Date.now()
    const previousState = this.currentState

    this.currentState = {
      status,
      timestamp,
      duration: previousState ? timestamp - previousState.timestamp : 0
    }

    this.stateHistory.push(this.currentState)

    // Keep only last 100 state changes
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift()
    }
  }

  handlePlaying() {
    this.playbackStartTime = Date.now()
    this.playbackStats.totalResumes++
  }

  handlePaused() {
    if (this.playbackStartTime) {
      const playbackDuration = Date.now() - this.playbackStartTime
      this.playbackStats.totalPlayTime += playbackDuration
      this.playbackStartTime = null
    }
    this.playbackStats.totalPauses++
  }

  handleIdle(oldState) {
    if (this.playbackStartTime && oldState.status === AudioPlayerStatus.Playing) {
      const playbackDuration = Date.now() - this.playbackStartTime
      this.playbackStats.totalPlayTime += playbackDuration
      this.playbackStartTime = null
    }

    this.playbackStats.totalStops++
    this.updateAveragePlaybackTime()
  }

  handleBuffering() {
    // Buffering state - prepare for playback
    console.log('Audio player is buffering...')
  }

  handleAutoPaused() {
    // Auto-paused due to connection issues
    console.log('Audio player auto-paused')
    this.playbackStats.totalPauses++
  }

  updateAveragePlaybackTime() {
    const totalSessions = this.playbackStats.totalStops
    if (totalSessions > 0) {
      this.playbackStats.averagePlaybackTime = this.playbackStats.totalPlayTime / totalSessions
    }
  }

  getCurrentState() {
    return { ...this.currentState }
  }

  getPlaybackStats() {
    return { ...this.playbackStats }
  }

  getStateHistory() {
    return [...this.stateHistory]
  }

  resetStats() {
    this.playbackStats = {
      totalPlayTime: 0,
      totalPauses: 0,
      totalResumes: 0,
      totalStops: 0,
      averagePlaybackTime: 0
    }
    this.stateHistory = []
    this.playbackStartTime = null
  }
}
```

### Playback Queue Management

```js
class AudioPlaybackQueue {
  constructor(player, lifecycleManager) {
    this.player = player
    this.lifecycleManager = lifecycleManager
    this.queue = []
    this.currentTrack = null
    this.isShuffled = false
    this.repeatMode = 'off' // 'off', 'track', 'queue'

    this.setupPlayerEvents()
  }

  setupPlayerEvents() {
    this.player.on('stateChange', (oldState, newState) => {
      if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
        this.handleTrackEnd()
      }
    })
  }

  async addTrack(track, options = {}) {
    const queueItem = {
      track,
      addedBy: options.addedBy,
      addedAt: Date.now(),
      priority: options.priority || 0,
      metadata: options.metadata || {}
    }

    if (options.position !== undefined) {
      this.queue.splice(options.position, 0, queueItem)
    } else {
      this.queue.push(queueItem)
    }

    // Sort by priority if needed
    if (queueItem.priority > 0) {
      this.queue.sort((a, b) => b.priority - a.priority)
    }

    // Start playback if queue was empty
    if (!this.currentTrack && this.queue.length === 1) {
      await this.playNext()
    }

    return queueItem
  }

  async playNext() {
    if (this.queue.length === 0) {
      this.currentTrack = null
      return null
    }

    let nextTrack

    if (this.repeatMode === 'track' && this.currentTrack) {
      nextTrack = this.currentTrack
    } else {
      nextTrack = this.isShuffled ? this.getRandomTrack() : this.queue.shift()

      if (this.repeatMode === 'queue' && !nextTrack) {
        // Re-queue all tracks for repeat
        this.queue = [...this.originalQueue]
        nextTrack = this.queue.shift()
      }
    }

    if (nextTrack) {
      this.currentTrack = nextTrack
      await this.player.play(nextTrack.track)
    }

    return nextTrack
  }

  getRandomTrack() {
    if (this.queue.length === 0) return null
    const randomIndex = Math.floor(Math.random() * this.queue.length)
    return this.queue.splice(randomIndex, 1)[0]
  }

  async skipTo(position) {
    if (position < 0 || position >= this.queue.length) {
      throw new Error('Invalid queue position')
    }

    const skippedTrack = this.queue.splice(position, 1)[0]
    this.queue.unshift(skippedTrack)
    await this.playNext()
  }

  removeTrack(position) {
    if (position < 0 || position >= this.queue.length) {
      throw new Error('Invalid queue position')
    }

    return this.queue.splice(position, 1)[0]
  }

  clearQueue() {
    this.queue = []
    this.currentTrack = null
  }

  shuffle() {
    this.isShuffled = !this.isShuffled

    if (this.isShuffled) {
      this.originalQueue = [...this.queue]
      this.shuffleArray(this.queue)
    } else {
      // Restore original order
      this.queue = [...this.originalQueue]
      this.originalQueue = null
    }
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
  }

  setRepeatMode(mode) {
    if (!['off', 'track', 'queue'].includes(mode)) {
      throw new Error('Invalid repeat mode')
    }

    this.repeatMode = mode
  }

  handleTrackEnd() {
    // Handle track completion
    setImmediate(() => {
      this.playNext()
    })
  }

  getQueueInfo() {
    return {
      currentTrack: this.currentTrack,
      queue: [...this.queue],
      length: this.queue.length,
      isShuffled: this.isShuffled,
      repeatMode: this.repeatMode,
      totalDuration: this.calculateTotalDuration()
    }
  }

  calculateTotalDuration() {
    // Calculate total duration of queue
    // Implementation depends on track metadata
    return this.queue.reduce((total, item) => {
      return total + (item.metadata.duration || 0)
    }, this.currentTrack ? (this.currentTrack.metadata.duration || 0) : 0)
  }

  moveTrack(fromPosition, toPosition) {
    if (fromPosition < 0 || fromPosition >= this.queue.length ||
        toPosition < 0 || toPosition >= this.queue.length) {
      throw new Error('Invalid positions')
    }

    const track = this.queue.splice(fromPosition, 1)[0]
    this.queue.splice(toPosition, 0, track)
  }
}
```

## Resource Management

Efficient management of audio resources and memory.

### Audio Resource Pool

```js
class AudioResourcePool {
  constructor(maxSize = 50) {
    this.pool = new Map()
    this.maxSize = maxSize
    this.accessOrder = []
    this.stats = {
      created: 0,
      reused: 0,
      evicted: 0,
      hits: 0,
      misses: 0
    }
  }

  async getResource(key, factory, ttl = 3600000) { // 1 hour default TTL
    const now = Date.now()

    // Check if resource exists and is still valid
    if (this.pool.has(key)) {
      const entry = this.pool.get(key)

      if (now - entry.createdAt < ttl) {
        this.stats.hits++
        this.updateAccessOrder(key)
        return entry.resource
      } else {
        // Resource expired, remove it
        this.pool.delete(key)
        this.removeFromAccessOrder(key)
      }
    }

    this.stats.misses++

    // Check pool size limit
    if (this.pool.size >= this.maxSize) {
      this.evictLRU()
    }

    // Create new resource
    try {
      const resource = await factory()
      this.pool.set(key, {
        resource,
        createdAt: now,
        lastAccessed: now,
        ttl
      })

      this.accessOrder.push(key)
      this.stats.created++

      return resource
    } catch (error) {
      console.error('Failed to create audio resource:', error)
      throw error
    }
  }

  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
    this.accessOrder.push(key)

    // Update last accessed time
    const entry = this.pool.get(key)
    if (entry) {
      entry.lastAccessed = Date.now()
    }
  }

  evictLRU() {
    if (this.accessOrder.length === 0) return

    const lruKey = this.accessOrder.shift()
    const entry = this.pool.get(lruKey)

    if (entry && entry.resource.destroy) {
      entry.resource.destroy()
    }

    this.pool.delete(lruKey)
    this.stats.evicted++
  }

  invalidate(key) {
    const entry = this.pool.get(key)
    if (entry && entry.resource.destroy) {
      entry.resource.destroy()
    }

    this.pool.delete(key)
    this.removeFromAccessOrder(key)
  }

  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  cleanup() {
    const now = Date.now()

    for (const [key, entry] of this.pool) {
      if (now - entry.createdAt > entry.ttl) {
        if (entry.resource.destroy) {
          entry.resource.destroy()
        }
        this.pool.delete(key)
        this.removeFromAccessOrder(key)
      }
    }
  }

  getStats() {
    return {
      ...this.stats,
      poolSize: this.pool.size,
      maxSize: this.maxSize,
      utilization: (this.pool.size / this.maxSize) * 100,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses)
    }
  }

  clear() {
    for (const entry of this.pool.values()) {
      if (entry.resource.destroy) {
        entry.resource.destroy()
      }
    }

    this.pool.clear()
    this.accessOrder = []
  }
}
```

### Memory-Efficient Streaming

```js
const { createAudioResource } = require('@discordjs/voice')
const { pipeline } = require('stream')

class MemoryEfficientAudioStreamer {
  constructor() {
    this.activeStreams = new Map()
    this.maxConcurrentStreams = 5
    this.streamBufferSize = 64 * 1024 // 64KB buffer
  }

  async createStreamResource(audioSource, options = {}) {
    if (this.activeStreams.size >= this.maxConcurrentStreams) {
      throw new Error('Maximum concurrent streams reached')
    }

    const streamId = `stream_${Date.now()}_${Math.random()}`

    try {
      // Create a controlled stream wrapper
      const controlledStream = new ControlledAudioStream(audioSource, {
        bufferSize: this.streamBufferSize,
        ...options
      })

      const resource = createAudioResource(controlledStream, {
        inputType: 'arbitrary',
        inlineVolume: options.inlineVolume || false
      })

      this.activeStreams.set(streamId, {
        resource,
        stream: controlledStream,
        createdAt: Date.now(),
        bytesStreamed: 0
      })

      // Monitor stream progress
      controlledStream.on('data', (chunk) => {
        const streamInfo = this.activeStreams.get(streamId)
        if (streamInfo) {
          streamInfo.bytesStreamed += chunk.length
        }
      })

      controlledStream.on('end', () => {
        this.cleanupStream(streamId)
      })

      controlledStream.on('error', (error) => {
        console.error(`Stream ${streamId} error:`, error)
        this.cleanupStream(streamId)
      })

      return { resource, streamId }
    } catch (error) {
      console.error('Failed to create stream resource:', error)
      throw error
    }
  }

  cleanupStream(streamId) {
    const streamInfo = this.activeStreams.get(streamId)
    if (streamInfo) {
      if (streamInfo.stream.destroy) {
        streamInfo.stream.destroy()
      }
      this.activeStreams.delete(streamId)
    }
  }

  getStreamInfo(streamId) {
    return this.activeStreams.get(streamId) || null
  }

  getActiveStreams() {
    return Array.from(this.activeStreams.entries()).map(([id, info]) => ({
      id,
      createdAt: info.createdAt,
      bytesStreamed: info.bytesStreamed,
      duration: Date.now() - info.createdAt
    }))
  }

  cleanupInactiveStreams(maxAge = 3600000) { // 1 hour
    const now = Date.now()
    const toCleanup = []

    for (const [streamId, streamInfo] of this.activeStreams) {
      if (now - streamInfo.createdAt > maxAge) {
        toCleanup.push(streamId)
      }
    }

    toCleanup.forEach(streamId => {
      this.cleanupStream(streamId)
    })

    return toCleanup.length
  }
}

class ControlledAudioStream extends require('stream').Transform {
  constructor(source, options = {}) {
    super(options)
    this.source = source
    this.bufferSize = options.bufferSize || 64 * 1024
    this.bytesRead = 0
    this.isReading = false

    this.setupSource()
  }

  setupSource() {
    this.source.on('data', (chunk) => {
      // Buffer control - only push when we have capacity
      if (!this.isReading) {
        this.isReading = true
        this.pushChunk(chunk)
      }
    })

    this.source.on('end', () => {
      this.end()
    })

    this.source.on('error', (error) => {
      this.emit('error', error)
    })
  }

  _read(size) {
    this.isReading = true

    // Continue reading from source
    if (this.source.readable && !this.source.readableEnded) {
      const chunk = this.source.read(size || this.bufferSize)
      if (chunk) {
        this.pushChunk(chunk)
      } else {
        this.isReading = false
      }
    }
  }

  pushChunk(chunk) {
    this.bytesRead += chunk.length

    if (this.push(chunk)) {
      this.isReading = false
    }
  }

  _destroy(error, callback) {
    if (this.source.destroy) {
      this.source.destroy()
    }
    callback(error)
  }
}
```

## Codec Support

Supporting multiple audio codecs and formats.

### Codec Detection and Conversion

```js
const { spawn } = require('child_process')
const { createReadStream, createWriteStream } = require('fs')
const { pipeline } = require('stream')

class AudioCodecManager {
  constructor() {
    this.supportedCodecs = {
      'audio/mpeg': ['mp3'],
      'audio/ogg': ['ogg', 'oga'],
      'audio/wav': ['wav'],
      'audio/flac': ['flac'],
      'audio/aac': ['aac', 'm4a'],
      'audio/opus': ['opus']
    }

    this.ffmpegPath = 'ffmpeg' // Assume ffmpeg is available
  }

  async detectCodec(audioSource) {
    // Simple MIME type detection
    if (typeof audioSource === 'string') {
      const extension = audioSource.split('.').pop().toLowerCase()
      return this.getCodecFromExtension(extension)
    }

    // For streams, we might need to read the header
    // This is a simplified implementation
    return 'unknown'
  }

  getCodecFromExtension(extension) {
    for (const [codec, extensions] of Object.entries(this.supportedCodecs)) {
      if (extensions.includes(extension)) {
        return codec
      }
    }
    return 'unknown'
  }

  async convertToOpus(inputSource, outputPath) {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(this.ffmpegPath, [
        '-i', 'pipe:0',           // Input from stdin
        '-c:a', 'libopus',        // Opus codec
        '-b:a', '64k',            // 64kbps bitrate
        '-vbr', 'on',             // Variable bitrate
        '-compression_level', '10', // High compression
        '-frame_duration', '20',  // 20ms frames
        '-application', 'audio', // Audio application
        'pipe:1'                  // Output to stdout
      ])

      const inputStream = typeof inputSource === 'string'
        ? createReadStream(inputSource)
        : inputSource

      pipeline(inputStream, ffmpeg.stdin, (error) => {
        if (error) {
          reject(error)
        }
      })

      const outputStream = createWriteStream(outputPath)
      ffmpeg.stdout.pipe(outputStream)

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath)
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`))
        }
      })

      ffmpeg.on('error', reject)
    })
  }

  async getAudioInfo(audioSource) {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(this.ffmpegPath, [
        '-i', typeof audioSource === 'string' ? audioSource : 'pipe:0',
        '-f', 'null', // No output file
        '-' // Output to null
      ])

      let stderr = ''

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      if (typeof audioSource !== 'string') {
        audioSource.pipe(ffmpeg.stdin)
      }

      ffmpeg.on('close', (code) => {
        if (code === 0 || code === 1) { // FFmpeg returns 1 for successful probe
          const info = this.parseFFmpegInfo(stderr)
          resolve(info)
        } else {
          reject(new Error(`Failed to get audio info: ${code}`))
        }
      })

      ffmpeg.on('error', reject)
    })
  }

  parseFFmpegInfo(stderr) {
    const info = {
      duration: null,
      bitrate: null,
      codec: null,
      sampleRate: null,
      channels: null
    }

    const durationMatch = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/)
    if (durationMatch) {
      const [, hours, minutes, seconds] = durationMatch
      info.duration = (parseInt(hours) * 3600) + (parseInt(minutes) * 60) + parseFloat(seconds)
    }

    const bitrateMatch = stderr.match(/bitrate: (\d+) kb\/s/)
    if (bitrateMatch) {
      info.bitrate = parseInt(bitrateMatch[1])
    }

    const codecMatch = stderr.match(/Audio: ([^,\s]+)/)
    if (codecMatch) {
      info.codec = codecMatch[1]
    }

    const sampleRateMatch = stderr.match(/(\d+) Hz/)
    if (sampleRateMatch) {
      info.sampleRate = parseInt(sampleRateMatch[1])
    }

    const channelsMatch = stderr.match(/(\d+) channels/)
    if (channelsMatch) {
      info.channels = parseInt(channelsMatch[1])
    }

    return info
  }

  isSupportedCodec(codec) {
    return Object.keys(this.supportedCodecs).includes(codec)
  }

  getSupportedFormats() {
    return Object.values(this.supportedCodecs).flat()
  }
}
```

### Advanced Playback Features

```js
class AdvancedAudioPlayer {
  constructor(player, lifecycleManager, queueManager) {
    this.player = player
    this.lifecycleManager = lifecycleManager
    this.queueManager = queueManager

    this.effects = new Map()
    this.filters = []
    this.crossfadeEnabled = false
    this.crossfadeDuration = 3000 // 3 seconds

    this.setupAdvancedFeatures()
  }

  setupAdvancedFeatures() {
    this.player.on('stateChange', (oldState, newState) => {
      if (newState.status === AudioPlayerStatus.Idle &&
          oldState.status === AudioPlayerStatus.Playing &&
          this.crossfadeEnabled) {
        this.handleCrossfade()
      }
    })
  }

  async playWithEffects(track, effects = []) {
    // Apply audio effects before playback
    const processedTrack = await this.applyEffects(track, effects)
    await this.player.play(processedTrack)
  }

  async applyEffects(track, effects) {
    let processedTrack = track

    for (const effect of effects) {
      switch (effect.type) {
        case 'volume':
          processedTrack = await this.applyVolumeEffect(processedTrack, effect.value)
          break
        case 'speed':
          processedTrack = await this.applySpeedEffect(processedTrack, effect.value)
          break
        case 'pitch':
          processedTrack = await this.applyPitchEffect(processedTrack, effect.value)
          break
        case 'bassboost':
          processedTrack = await this.applyBassBoostEffect(processedTrack, effect.value)
          break
      }
    }

    return processedTrack
  }

  async applyVolumeEffect(track, volume) {
    // Volume adjustment using FFmpeg
    const outputPath = `/tmp/volume_${Date.now()}.opus`
    await this.runFFmpeg([
      '-i', track,
      '-filter:a', `volume=${volume}`,
      '-c:a', 'libopus',
      outputPath
    ])
    return outputPath
  }

  async applySpeedEffect(track, speed) {
    const outputPath = `/tmp/speed_${Date.now()}.opus`
    await this.runFFmpeg([
      '-i', track,
      '-filter:a', `atempo=${speed}`,
      '-c:a', 'libopus',
      outputPath
    ])
    return outputPath
  }

  async applyPitchEffect(track, pitch) {
    const outputPath = `/tmp/pitch_${Date.now()}.opus`
    await this.runFFmpeg([
      '-i', track,
      '-filter:a', `rubberband=pitch=${pitch}`,
      '-c:a', 'libopus',
      outputPath
    ])
    return outputPath
  }

  async applyBassBoostEffect(track, gain) {
    const outputPath = `/tmp/bass_${Date.now()}.opus`
    await this.runFFmpeg([
      '-i', track,
      '-filter:a', `bass=g=${gain}`,
      '-c:a', 'libopus',
      outputPath
    ])
    return outputPath
  }

  async runFFmpeg(args) {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', args)

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`))
        }
      })

      ffmpeg.on('error', reject)
    })
  }

  enableCrossfade(duration = 3000) {
    this.crossfadeEnabled = true
    this.crossfadeDuration = duration
  }

  disableCrossfade() {
    this.crossfadeEnabled = false
  }

  async handleCrossfade() {
    const nextTrack = this.queueManager.queue[0]
    if (!nextTrack) return

    // Start next track with fade in
    const fadedTrack = await this.applyFadeEffect(nextTrack.track, 'in', this.crossfadeDuration)
    await this.player.play(fadedTrack)

    // Remove the track from queue since we're playing it
    this.queueManager.queue.shift()
  }

  async applyFadeEffect(track, direction, duration) {
    const fadeType = direction === 'in' ? 'afade=t=in:ss=0:d=' : 'afade=t=out:st=0:d='
    const outputPath = `/tmp/fade_${direction}_${Date.now()}.opus`

    await this.runFFmpeg([
      '-i', track,
      '-filter:a', `${fadeType}${duration / 1000}`,
      '-c:a', 'libopus',
      outputPath
    ])

    return outputPath
  }

  addFilter(filter) {
    this.filters.push(filter)
  }

  removeFilter(filterId) {
    this.filters = this.filters.filter(f => f.id !== filterId)
  }

  getActiveEffects() {
    return {
      effects: Array.from(this.effects.values()),
      filters: [...this.filters],
      crossfadeEnabled: this.crossfadeEnabled,
      crossfadeDuration: this.crossfadeDuration
    }
  }
}
```

## Best Practices

### Implementation Guidelines

1. **Monitor player states** and handle transitions appropriately
2. **Implement queue management** with shuffle and repeat functionality
3. **Use resource pooling** to cache frequently played audio
4. **Stream audio efficiently** to prevent memory issues
5. **Support multiple codecs** with automatic conversion to Opus
6. **Apply audio effects** judiciously to maintain quality
7. **Implement crossfading** for seamless track transitions
8. **Handle playback errors** gracefully with fallback mechanisms
9. **Clean up resources** when playback ends or fails
10. **Monitor playback statistics** for performance optimization

### Production Considerations

```js
// Complete audio player management system
class ProductionAudioPlayerManager {
  constructor(client) {
    this.client = client

    // Core components
    this.players = new Map()
    this.lifecycleManagers = new Map()
    this.queueManagers = new Map()
    this.resourcePool = new AudioResourcePool()
    this.streamer = new MemoryEfficientAudioStreamer()
    this.codecManager = new AudioCodecManager()
    this.advancedPlayer = null

    // Stats
    this.stats = {
      totalPlayers: 0,
      activePlayers: 0,
      totalTracksPlayed: 0,
      totalPlaybackTime: 0
    }
  }

  createPlayer(guildId, connection) {
    const player = createAudioPlayer()
    connection.subscribe(player)

    const lifecycleManager = new AudioPlayerLifecycleManager(player)
    const queueManager = new AudioPlaybackQueue(player, lifecycleManager)
    const advancedPlayer = new AdvancedAudioPlayer(player, lifecycleManager, queueManager)

    this.players.set(guildId, player)
    this.lifecycleManagers.set(guildId, lifecycleManager)
    this.queueManagers.set(guildId, queueManager)

    this.stats.totalPlayers++
    this.stats.activePlayers++

    // Handle player end
    player.on('stateChange', (oldState, newState) => {
      if (newState.status === AudioPlayerStatus.Idle) {
        this.stats.totalTracksPlayed++
      }
    })

    return {
      player,
      lifecycleManager,
      queueManager,
      advancedPlayer
    }
  }

  getPlayer(guildId) {
    return this.players.get(guildId) || null
  }

  async playTrack(guildId, trackSource, options = {}) {
    const player = this.getPlayer(guildId)
    if (!player) {
      throw new Error('No player found for guild')
    }

    // Detect codec and convert if necessary
    const codec = await this.codecManager.detectCodec(trackSource)
    let processedSource = trackSource

    if (codec !== 'audio/opus') {
      const tempPath = `/tmp/converted_${Date.now()}.opus`
      processedSource = await this.codecManager.convertToOpus(trackSource, tempPath)
    }

    // Get or create resource
    const resourceKey = `${guildId}_${Date.now()}`
    const resource = await this.resourcePool.getResource(resourceKey, async () => {
      return await this.streamer.createStreamResource(processedSource)
    })

    // Apply effects if specified
    if (options.effects && options.effects.length > 0) {
      const { resource: effectedResource } = await this.advancedPlayer.applyEffects(resource.resource, options.effects)
      await player.play(effectedResource)
    } else {
      await player.play(resource.resource)
    }
  }

  destroyPlayer(guildId) {
    const player = this.players.get(guildId)
    if (player) {
      player.stop()
      this.players.delete(guildId)
      this.lifecycleManagers.delete(guildId)
      this.queueManagers.delete(guildId)
      this.stats.activePlayers--
    }
  }

  getSystemStats() {
    return {
      ...this.stats,
      resourcePool: this.resourcePool.getStats(),
      activeStreams: this.streamer.getActiveStreams()
    }
  }

  async cleanup() {
    // Destroy all players
    for (const guildId of this.players.keys()) {
      this.destroyPlayer(guildId)
    }

    // Clean up resources
    this.resourcePool.clear()
    this.streamer.cleanupInactiveStreams(0) // Clean all

    console.log('Audio player manager cleanup complete')
  }
}
```

This comprehensive audio player system provides robust playback capabilities with advanced features like effects, crossfading, codec support, and efficient resource management for production voice bots.