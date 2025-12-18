# Lavalink Integration

Discord.js v14.25.1 Lavalink integration for scalable audio processing. This section covers Lavalink setup, load balancing, high availability, and production deployment patterns.

## Lavalink Fundamentals

Understanding Lavalink architecture and integration with Discord.js.

### Lavalink Architecture

Lavalink provides distributed audio processing for Discord bots.

```js
const { Manager } = require('lavacord')

class LavalinkManager {
  constructor(client, nodes) {
    this.client = client
    this.manager = new Manager(nodes, {
      user: client.user.id,
      shards: client.shard ? client.shard.count : 1,
      send: (packet) => {
        const guild = client.guilds.cache.get(packet.d.guild_id)
        if (guild) guild.shard.send(packet)
      }
    })

    this.players = new Map()
    this.stats = {
      totalPlayers: 0,
      activePlayers: 0,
      totalUptime: 0
    }

    this.setupEventHandlers()
  }

  setupEventHandlers() {
    this.manager.on('ready', (node) => {
      console.log(`Lavalink node ${node.id} is ready`)
    })

    this.manager.on('error', (error, node) => {
      console.error(`Lavalink node ${node.id} error:`, error)
    })

    this.manager.on('disconnect', (code, reason, node) => {
      console.log(`Lavalink node ${node.id} disconnected: ${code} - ${reason}`)
    })

    this.manager.on('reconnecting', (node) => {
      console.log(`Lavalink node ${node.id} reconnecting`)
    })

    this.client.on('raw', (packet) => {
      this.manager.updateVoiceState(packet)
    })
  }

  async connect() {
    await this.manager.connect()
    console.log('Connected to Lavalink nodes')
  }

  async joinChannel(guildId, channelId, options = {}) {
    try {
      const player = await this.manager.join({
        guild: guildId,
        channel: channelId,
        node: options.node || this.getBestNode()
      })

      this.players.set(guildId, player)
      this.stats.totalPlayers++
      this.stats.activePlayers++

      // Set up player event handlers
      this.setupPlayerEvents(guildId, player)

      return player
    } catch (error) {
      console.error('Failed to join voice channel with Lavalink:', error)
      throw error
    }
  }

  setupPlayerEvents(guildId, player) {
    player.on('end', (data) => {
      console.log(`Track ended in guild ${guildId}: ${data.reason}`)

      // Handle track end (queue next, etc.)
      this.handleTrackEnd(guildId, data)
    })

    player.on('error', (error) => {
      console.error(`Player error in guild ${guildId}:`, error)
    })

    player.on('stuck', (data) => {
      console.log(`Player stuck in guild ${guildId}, skipping track`)
      player.stop()
    })

    player.on('start', (data) => {
      console.log(`Track started in guild ${guildId}`)
    })
  }

  handleTrackEnd(guildId, data) {
    // Implementation depends on your queue system
    // This is a basic example
    const player = this.players.get(guildId)
    if (!player) return

    switch (data.reason) {
      case 'FINISHED':
        // Play next track
        console.log('Track finished, playing next...')
        break
      case 'LOAD_FAILED':
        console.log('Track failed to load')
        break
      case 'STOPPED':
        console.log('Track stopped')
        break
      case 'REPLACED':
        console.log('Track replaced')
        break
      case 'CLEANUP':
        console.log('Player cleanup')
        break
    }
  }

  getPlayer(guildId) {
    return this.players.get(guildId)
  }

  leaveChannel(guildId) {
    const player = this.players.get(guildId)
    if (player) {
      player.destroy()
      this.players.delete(guildId)
      this.stats.activePlayers--
    }
  }

  getBestNode() {
    // Simple load balancing - pick node with least players
    let bestNode = null
    let minPlayers = Infinity

    for (const node of this.manager.nodes.values()) {
      if (node.connected && node.stats.players < minPlayers) {
        minPlayers = node.stats.players
        bestNode = node.id
      }
    }

    return bestNode
  }

  getStats() {
    const nodeStats = {}

    for (const [id, node] of this.manager.nodes) {
      nodeStats[id] = {
        connected: node.connected,
        players: node.stats.players || 0,
        playingPlayers: node.stats.playingPlayers || 0,
        uptime: node.stats.uptime || 0,
        memory: node.stats.memory || {},
        cpu: node.stats.cpu || {}
      }
    }

    return {
      ...this.stats,
      nodes: nodeStats
    }
  }

  async destroy() {
    for (const player of this.players.values()) {
      player.destroy()
    }

    this.players.clear()
    await this.manager.destroy()
  }
}
```

### Player Management

```js
class LavalinkPlayerManager {
  constructor(lavalinkManager) {
    this.lavalinkManager = lavalinkManager
    this.players = new Map()
    this.queueManagers = new Map()
  }

  async createPlayer(guildId, channelId) {
    const player = await this.lavalinkManager.joinChannel(guildId, channelId)
    const queueManager = new LavalinkQueueManager(player)

    this.players.set(guildId, player)
    this.queueManagers.set(guildId, queueManager)

    return { player, queueManager }
  }

  async loadTrack(query, options = {}) {
    const node = options.node || this.lavalinkManager.getBestNode()

    try {
      const result = await this.lavalinkManager.manager.loadTracks(query, node)

      if (result.loadType === 'LOAD_FAILED') {
        throw new Error('Failed to load track')
      }

      return result
    } catch (error) {
      console.error('Failed to load track:', error)
      throw error
    }
  }

  async playTrack(guildId, track, options = {}) {
    const player = this.players.get(guildId)
    if (!player) {
      throw new Error('No player found for guild')
    }

    try {
      await player.play(track, options)
      return true
    } catch (error) {
      console.error('Failed to play track:', error)
      throw error
    }
  }

  pausePlayer(guildId) {
    const player = this.players.get(guildId)
    if (player) {
      player.pause(true)
      return true
    }
    return false
  }

  resumePlayer(guildId) {
    const player = this.players.get(guildId)
    if (player) {
      player.pause(false)
      return true
    }
    return false
  }

  stopPlayer(guildId) {
    const player = this.players.get(guildId)
    if (player) {
      player.stop()
      return true
    }
    return false
  }

  setVolume(guildId, volume) {
    const player = this.players.get(guildId)
    if (player) {
      player.volume(volume)
      return true
    }
    return false
  }

  seekTrack(guildId, position) {
    const player = this.players.get(guildId)
    if (player) {
      player.seek(position)
      return true
    }
    return false
  }

  destroyPlayer(guildId) {
    const player = this.players.get(guildId)
    const queueManager = this.queueManagers.get(guildId)

    if (player) {
      player.destroy()
      this.players.delete(guildId)
    }

    if (queueManager) {
      queueManager.clear()
      this.queueManagers.delete(guildId)
    }

    this.lavalinkManager.leaveChannel(guildId)
  }

  getPlayerInfo(guildId) {
    const player = this.players.get(guildId)
    const queueManager = this.queueManagers.get(guildId)

    if (!player) return null

    return {
      playing: player.playing,
      paused: player.paused,
      volume: player.volume,
      position: player.position,
      track: player.track,
      queue: queueManager ? queueManager.getQueueInfo() : null
    }
  }
}

class LavalinkQueueManager {
  constructor(player) {
    this.player = player
    this.queue = []
    this.currentTrack = null
    this.repeatMode = 'off' // 'off', 'track', 'queue'
    this.shuffle = false
  }

  addTrack(track, options = {}) {
    const queueItem = {
      track,
      requestedBy: options.requestedBy,
      addedAt: Date.now(),
      metadata: options.metadata || {}
    }

    if (options.position !== undefined) {
      this.queue.splice(options.position, 0, queueItem)
    } else {
      this.queue.push(queueItem)
    }

    // Start playing if queue was empty
    if (!this.currentTrack && this.queue.length === 1) {
      this.playNext()
    }

    return queueItem
  }

  playNext() {
    if (this.queue.length === 0) {
      this.currentTrack = null
      return null
    }

    let nextTrack

    if (this.repeatMode === 'track' && this.currentTrack) {
      nextTrack = this.currentTrack
    } else {
      if (this.shuffle) {
        const randomIndex = Math.floor(Math.random() * this.queue.length)
        nextTrack = this.queue.splice(randomIndex, 1)[0]
      } else {
        nextTrack = this.queue.shift()
      }

      if (this.repeatMode === 'queue' && !nextTrack) {
        // Re-queue all tracks
        this.queue = [...this.originalQueue || []]
        nextTrack = this.queue.shift()
      }
    }

    if (nextTrack) {
      this.currentTrack = nextTrack
      this.player.play(nextTrack.track)
    }

    return nextTrack
  }

  skip() {
    if (this.player) {
      this.player.stop()
      // playNext will be called by the 'end' event
    }
  }

  clear() {
    this.queue = []
    this.currentTrack = null
  }

  removeTrack(position) {
    if (position < 0 || position >= this.queue.length) {
      throw new Error('Invalid queue position')
    }

    return this.queue.splice(position, 1)[0]
  }

  moveTrack(fromPosition, toPosition) {
    if (fromPosition < 0 || fromPosition >= this.queue.length ||
        toPosition < 0 || toPosition >= this.queue.length) {
      throw new Error('Invalid positions')
    }

    const track = this.queue.splice(fromPosition, 1)[0]
    this.queue.splice(toPosition, 0, track)
  }

  setRepeatMode(mode) {
    if (!['off', 'track', 'queue'].includes(mode)) {
      throw new Error('Invalid repeat mode')
    }

    this.repeatMode = mode

    if (mode === 'queue') {
      this.originalQueue = [...this.queue]
    }
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle

    if (this.shuffle) {
      this.originalQueue = [...this.queue]
    }
  }

  getQueueInfo() {
    return {
      currentTrack: this.currentTrack,
      queue: [...this.queue],
      length: this.queue.length,
      repeatMode: this.repeatMode,
      shuffle: this.shuffle,
      totalDuration: this.calculateTotalDuration()
    }
  }

  calculateTotalDuration() {
    const currentDuration = this.currentTrack?.track?.info?.length || 0
    const queueDuration = this.queue.reduce((total, item) => {
      return total + (item.track?.info?.length || 0)
    }, 0)

    return currentDuration + queueDuration
  }
}
```

## Load Balancing

Distributing load across multiple Lavalink nodes.

### Node Selection Strategies

```js
class LavalinkLoadBalancer {
  constructor(manager) {
    this.manager = manager
    this.strategies = {
      least_players: this.leastPlayersStrategy.bind(this),
      round_robin: this.roundRobinStrategy.bind(this),
      weighted_random: this.weightedRandomStrategy.bind(this),
      performance_based: this.performanceBasedStrategy.bind(this)
    }

    this.currentStrategy = 'least_players'
    this.roundRobinIndex = 0
    this.nodeScores = new Map()
  }

  selectNode(options = {}) {
    const strategy = options.strategy || this.currentStrategy
    const strategyFn = this.strategies[strategy]

    if (!strategyFn) {
      throw new Error(`Unknown load balancing strategy: ${strategy}`)
    }

    const availableNodes = this.getAvailableNodes()
    if (availableNodes.length === 0) {
      throw new Error('No available Lavalink nodes')
    }

    return strategyFn(availableNodes, options)
  }

  getAvailableNodes() {
    const available = []

    for (const [id, node] of this.manager.nodes) {
      if (node.connected && node.stats) {
        available.push({ id, node })
      }
    }

    return available
  }

  leastPlayersStrategy(nodes) {
    let bestNode = nodes[0]
    let minPlayers = bestNode.node.stats.players || 0

    for (const nodeInfo of nodes.slice(1)) {
      const playerCount = nodeInfo.node.stats.players || 0
      if (playerCount < minPlayers) {
        minPlayers = playerCount
        bestNode = nodeInfo
      }
    }

    return bestNode.id
  }

  roundRobinStrategy(nodes) {
    const selectedNode = nodes[this.roundRobinIndex % nodes.length]
    this.roundRobinIndex = (this.roundRobinIndex + 1) % nodes.length
    return selectedNode.id
  }

  weightedRandomStrategy(nodes) {
    // Calculate weights based on available resources
    const weights = nodes.map(nodeInfo => {
      const stats = nodeInfo.node.stats
      const cpuLoad = stats.cpu ? stats.cpu.systemLoad : 0
      const memoryUsage = stats.memory ? stats.memory.used / stats.memory.reserved : 0

      // Lower load = higher weight
      return Math.max(0.1, 1 - (cpuLoad + memoryUsage) / 2)
    })

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    let random = Math.random() * totalWeight

    for (let i = 0; i < nodes.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        return nodes[i].id
      }
    }

    return nodes[0].id // Fallback
  }

  performanceBasedStrategy(nodes) {
    let bestNode = nodes[0]
    let bestScore = this.calculateNodeScore(bestNode)

    for (const nodeInfo of nodes.slice(1)) {
      const score = this.calculateNodeScore(nodeInfo)
      if (score > bestScore) {
        bestScore = score
        bestNode = nodeInfo
      }
    }

    return bestNode.id
  }

  calculateNodeScore(nodeInfo) {
    const stats = nodeInfo.node.stats
    const id = nodeInfo.id

    // Get or initialize score history
    if (!this.nodeScores.has(id)) {
      this.nodeScores.set(id, [])
    }

    const scoreHistory = this.nodeScores.get(id)

    // Calculate current performance score
    const uptime = stats.uptime || 0
    const players = stats.players || 0
    const playingPlayers = stats.playingPlayers || 0
    const cpuLoad = stats.cpu ? stats.cpu.systemLoad : 0
    const memoryUsage = stats.memory ? stats.memory.used / stats.memory.reserved : 0

    // Performance score (higher is better)
    const performanceScore = Math.max(0, 1 - cpuLoad) * Math.max(0, 1 - memoryUsage)
    const utilizationScore = Math.min(1, players / 100) // Cap at 100 players
    const uptimeBonus = Math.min(1, uptime / (24 * 60 * 60 * 1000)) // 24 hours

    const currentScore = (performanceScore * 0.5) + (utilizationScore * 0.3) + (uptimeBonus * 0.2)

    // Update score history
    scoreHistory.push(currentScore)
    if (scoreHistory.length > 10) {
      scoreHistory.shift()
    }

    // Return average score
    return scoreHistory.reduce((sum, score) => sum + score, 0) / scoreHistory.length
  }

  setStrategy(strategy) {
    if (!this.strategies[strategy]) {
      throw new Error(`Unknown strategy: ${strategy}`)
    }

    this.currentStrategy = strategy
    console.log(`Load balancing strategy changed to: ${strategy}`)
  }

  getStrategyStats() {
    const availableNodes = this.getAvailableNodes()
    const strategyStats = {}

    for (const [name, strategyFn] of Object.entries(this.strategies)) {
      try {
        const selectedNode = strategyFn(availableNodes.slice())
        strategyStats[name] = {
          selectedNode,
          wouldSelect: selectedNode
        }
      } catch (error) {
        strategyStats[name] = {
          error: error.message
        }
      }
    }

    return {
      currentStrategy: this.currentStrategy,
      availableNodes: availableNodes.length,
      strategies: strategyStats
    }
  }
}
```

### Failover Management

```js
class LavalinkFailoverManager {
  constructor(manager, loadBalancer) {
    this.manager = manager
    this.loadBalancer = loadBalancer
    this.failedNodes = new Map()
    this.failoverHistory = []

    this.failureThreshold = 3
    this.recoveryTime = 5 * 60 * 1000 // 5 minutes
    this.maxFailoverAttempts = 5

    this.setupFailoverHandling()
  }

  setupFailoverHandling() {
    this.manager.on('error', (error, node) => {
      this.handleNodeFailure(node.id, error, 'error')
    })

    this.manager.on('disconnect', (code, reason, node) => {
      this.handleNodeFailure(node.id, { code, reason }, 'disconnect')
    })

    this.manager.on('ready', (node) => {
      this.handleNodeRecovery(node.id)
    })
  }

  handleNodeFailure(nodeId, error, failureType) {
    console.error(`Lavalink node ${nodeId} failed (${failureType}):`, error)

    const failureCount = (this.failedNodes.get(nodeId) || 0) + 1
    this.failedNodes.set(nodeId, failureCount)

    this.failoverHistory.push({
      nodeId,
      failureType,
      error,
      timestamp: Date.now(),
      failureCount
    })

    // Keep only last 100 failures
    if (this.failoverHistory.length > 100) {
      this.failoverHistory.shift()
    }

    if (failureCount >= this.failureThreshold) {
      console.warn(`Node ${nodeId} exceeded failure threshold (${failureCount})`)
      this.markNodeUnhealthy(nodeId)
    }

    // Trigger failover for affected players
    this.failoverPlayers(nodeId)
  }

  handleNodeRecovery(nodeId) {
    console.log(`Lavalink node ${nodeId} recovered`)

    this.failedNodes.delete(nodeId)

    // Mark node as healthy again
    this.markNodeHealthy(nodeId)
  }

  markNodeUnhealthy(nodeId) {
    const node = this.manager.nodes.get(nodeId)
    if (node) {
      node.unhealthy = true
      node.unhealthySince = Date.now()

      // Schedule recovery check
      setTimeout(() => {
        this.checkNodeRecovery(nodeId)
      }, this.recoveryTime)
    }
  }

  markNodeHealthy(nodeId) {
    const node = this.manager.nodes.get(nodeId)
    if (node) {
      node.unhealthy = false
      delete node.unhealthySince
    }
  }

  async checkNodeRecovery(nodeId) {
    const node = this.manager.nodes.get(nodeId)
    if (!node || !node.unhealthy) return

    try {
      // Attempt to test node connectivity
      const isHealthy = await this.testNodeHealth(node)

      if (isHealthy) {
        console.log(`Node ${nodeId} health check passed`)
        this.markNodeHealthy(nodeId)
      } else {
        console.log(`Node ${nodeId} still unhealthy, extending quarantine`)
        // Keep unhealthy and check again later
        setTimeout(() => {
          this.checkNodeRecovery(nodeId)
        }, this.recoveryTime)
      }
    } catch (error) {
      console.error(`Health check failed for node ${nodeId}:`, error)
    }
  }

  async testNodeHealth(node) {
    // Simple health check - attempt to get stats
    try {
      // This is a simplified health check
      // In practice, you'd make an actual Lavalink API call
      return node.connected && node.stats !== null
    } catch (error) {
      return false
    }
  }

  failoverPlayers(failedNodeId) {
    // Find all players on the failed node and migrate them
    const affectedPlayers = []

    for (const [guildId, player] of this.manager.players || new Map()) {
      if (player.node.id === failedNodeId) {
        affectedPlayers.push({ guildId, player })
      }
    }

    console.log(`Failing over ${affectedPlayers.length} players from node ${failedNodeId}`)

    for (const { guildId, player } of affectedPlayers) {
      this.failoverPlayer(guildId, player)
    }
  }

  async failoverPlayer(guildId, player) {
    let attempts = 0
    let success = false

    while (attempts < this.maxFailoverAttempts && !success) {
      attempts++

      try {
        // Select new node using load balancer
        const newNodeId = this.loadBalancer.selectNode({
          excludeNodes: [player.node.id]
        })

        console.log(`Failover attempt ${attempts} for guild ${guildId} to node ${newNodeId}`)

        // Migrate player to new node
        await this.migratePlayerToNode(player, newNodeId)

        success = true
        console.log(`Successfully failed over player for guild ${guildId}`)
      } catch (error) {
        console.error(`Failover attempt ${attempts} failed for guild ${guildId}:`, error)

        if (attempts >= this.maxFailoverAttempts) {
          console.error(`All failover attempts failed for guild ${guildId}`)
          // Could destroy player or implement other fallback strategies
        }
      }
    }
  }

  async migratePlayerToNode(player, newNodeId) {
    // This is a simplified migration
    // Actual implementation depends on Lavalink client capabilities

    const newNode = this.manager.nodes.get(newNodeId)
    if (!newNode) {
      throw new Error(`Node ${newNodeId} not found`)
    }

    // Store current player state
    const currentTrack = player.track
    const position = player.position
    const paused = player.paused
    const volume = player.volume

    // Destroy current player
    player.destroy()

    // Create new player on different node
    const newPlayer = await this.manager.join({
      guild: player.guildId,
      channel: player.channelId,
      node: newNodeId
    })

    // Restore state
    if (currentTrack) {
      await newPlayer.play(currentTrack)
      if (position > 0) {
        newPlayer.seek(position)
      }
      if (paused) {
        newPlayer.pause(true)
      }
      newPlayer.volume(volume)
    }

    // Update player reference
    // This depends on how players are stored in your application
    this.manager.players.set(player.guildId, newPlayer)

    return newPlayer
  }

  getFailoverStats() {
    const nodeHealth = {}

    for (const [nodeId, node] of this.manager.nodes) {
      nodeHealth[nodeId] = {
        healthy: !node.unhealthy,
        failureCount: this.failedNodes.get(nodeId) || 0,
        unhealthySince: node.unhealthySince
      }
    }

    return {
      totalFailures: this.failoverHistory.length,
      recentFailures: this.failoverHistory.slice(-10),
      nodeHealth,
      failureThreshold: this.failureThreshold
    }
  }
}
```

## High Availability

Ensuring continuous audio service through redundancy and monitoring.

### Node Health Monitoring

```js
class LavalinkHealthMonitor {
  constructor(manager) {
    this.manager = manager
    this.nodeHealth = new Map()
    this.alertThresholds = {
      cpuUsage: 80,
      memoryUsage: 85,
      playerCount: 100,
      responseTime: 5000
    }

    this.monitoringInterval = 30000 // 30 seconds
    this.healthHistory = new Map()

    this.startMonitoring()
  }

  startMonitoring() {
    setInterval(() => {
      this.checkNodeHealth()
    }, this.monitoringInterval)
  }

  async checkNodeHealth() {
    const healthReports = {}

    for (const [nodeId, node] of this.manager.nodes) {
      const healthReport = await this.assessNodeHealth(node)

      healthReports[nodeId] = healthReport

      // Store health history
      if (!this.healthHistory.has(nodeId)) {
        this.healthHistory.set(nodeId, [])
      }

      const history = this.healthHistory.get(nodeId)
      history.push(healthReport)

      // Keep only last 20 health checks
      if (history.length > 20) {
        history.shift()
      }

      // Check for alerts
      this.checkHealthAlerts(nodeId, healthReport)
    }

    return healthReports
  }

  async assessNodeHealth(node) {
    const stats = node.stats
    const connected = node.connected

    if (!connected || !stats) {
      return {
        healthy: false,
        connected,
        reason: 'disconnected'
      }
    }

    // Calculate health metrics
    const cpuUsage = stats.cpu ? stats.cpu.systemLoad * 100 : 0
    const memoryUsage = stats.memory ? (stats.memory.used / stats.memory.reserved) * 100 : 0
    const playerCount = stats.players || 0

    // Response time check (simplified)
    const responseTime = await this.measureResponseTime(node)

    // Determine overall health
    const isHealthy = cpuUsage < this.alertThresholds.cpuUsage &&
                     memoryUsage < this.alertThresholds.memoryUsage &&
                     playerCount < this.alertThresholds.playerCount &&
                     responseTime < this.alertThresholds.responseTime

    return {
      healthy: isHealthy,
      connected: true,
      metrics: {
        cpuUsage,
        memoryUsage,
        playerCount,
        responseTime
      },
      timestamp: Date.now()
    }
  }

  async measureResponseTime(node) {
    const startTime = Date.now()

    try {
      // Simple ping-like operation
      // In practice, you'd make a Lavalink API call
      await new Promise(resolve => setTimeout(resolve, 100)) // Simulated delay
      return Date.now() - startTime
    } catch (error) {
      return Infinity
    }
  }

  checkHealthAlerts(nodeId, healthReport) {
    if (healthReport.healthy) return

    const alerts = []

    const metrics = healthReport.metrics
    if (metrics.cpuUsage > this.alertThresholds.cpuUsage) {
      alerts.push(`High CPU usage: ${metrics.cpuUsage.toFixed(1)}%`)
    }

    if (metrics.memoryUsage > this.alertThresholds.memoryUsage) {
      alerts.push(`High memory usage: ${metrics.memoryUsage.toFixed(1)}%`)
    }

    if (metrics.playerCount > this.alertThresholds.playerCount) {
      alerts.push(`High player count: ${metrics.playerCount}`)
    }

    if (metrics.responseTime > this.alertThresholds.responseTime) {
      alerts.push(`High response time: ${metrics.responseTime}ms`)
    }

    if (alerts.length > 0) {
      this.sendHealthAlert(nodeId, alerts, healthReport)
    }
  }

  sendHealthAlert(nodeId, alerts, healthReport) {
    console.error(`🚨 LAVALINK HEALTH ALERT - Node ${nodeId}`)
    alerts.forEach(alert => console.error(`  - ${alert}`))

    // In production, this would integrate with monitoring systems
    // like PagerDuty, Slack, email alerts, etc.

    this.sendToMonitoringSystem({
      nodeId,
      alerts,
      healthReport,
      timestamp: Date.now()
    })
  }

  sendToMonitoringSystem(alertData) {
    // Implementation depends on your monitoring solution
    console.log('Sending alert to monitoring system:', alertData)
  }

  getHealthReport() {
    const overallHealth = this.calculateOverallHealth()
    const nodeReports = {}

    for (const [nodeId, history] of this.healthHistory) {
      const latest = history[history.length - 1]
      const averageHealth = history.reduce((sum, report) => sum + (report.healthy ? 1 : 0), 0) / history.length

      nodeReports[nodeId] = {
        current: latest,
        averageHealth,
        historyLength: history.length
      }
    }

    return {
      overallHealth,
      nodes: nodeReports,
      alertThresholds: this.alertThresholds
    }
  }

  calculateOverallHealth() {
    const nodeHealths = Array.from(this.healthHistory.values())
      .map(history => history[history.length - 1])
      .filter(report => report !== undefined)

    if (nodeHealths.length === 0) return 'unknown'

    const healthyNodes = nodeHealths.filter(report => report.healthy).length
    const healthRatio = healthyNodes / nodeHealths.length

    if (healthRatio >= 0.8) return 'healthy'
    if (healthRatio >= 0.5) return 'degraded'
    return 'unhealthy'
  }

  updateAlertThresholds(newThresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds }
    console.log('Updated Lavalink health alert thresholds:', this.alertThresholds)
  }
}
```

### Production Deployment

```js
class ProductionLavalinkManager {
  constructor(client, config) {
    this.client = client
    this.config = config

    // Core components
    this.lavalinkManager = new LavalinkManager(client, config.nodes)
    this.loadBalancer = new LavalinkLoadBalancer(this.lavalinkManager.manager)
    this.failoverManager = new LavalinkFailoverManager(
      this.lavalinkManager.manager,
      this.loadBalancer
    )
    this.healthMonitor = new LavalinkHealthMonitor(this.lavalinkManager.manager)
    this.playerManager = new LavalinkPlayerManager(this.lavalinkManager)

    // Stats and monitoring
    this.stats = {
      uptime: Date.now(),
      totalPlayersCreated: 0,
      totalTracksPlayed: 0,
      totalErrors: 0
    }

    this.setupEventHandlers()
  }

  setupEventHandlers() {
    // Lavalink events
    this.lavalinkManager.manager.on('ready', () => {
      console.log('Production Lavalink manager ready')
    })

    // Player events
    this.client.on('voiceStateUpdate', (oldState, newState) => {
      // Handle voice state changes that affect Lavalink
    })

    // Error handling
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection in Lavalink manager:', reason)
      this.stats.totalErrors++
    })
  }

  async initialize() {
    try {
      await this.lavalinkManager.connect()
      console.log('Production Lavalink manager initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Lavalink manager:', error)
      throw error
    }
  }

  async joinVoiceChannel(guildId, channelId, options = {}) {
    try {
      // Select optimal node
      const selectedNode = this.loadBalancer.selectNode(options)

      // Create player
      const { player, queueManager } = await this.playerManager.createPlayer(guildId, channelId)

      this.stats.totalPlayersCreated++

      return { player, queueManager, node: selectedNode }
    } catch (error) {
      console.error('Failed to join voice channel:', error)
      this.stats.totalErrors++
      throw error
    }
  }

  getSystemStats() {
    return {
      ...this.stats,
      lavalink: this.lavalinkManager.getStats(),
      loadBalancer: this.loadBalancer.getStrategyStats(),
      failover: this.failoverManager.getFailoverStats(),
      health: this.healthMonitor.getHealthReport()
    }
  }

  async loadAndPlayTrack(guildId, query, options = {}) {
    try {
      const result = await this.playerManager.loadTrack(query, options)

      if (result.tracks && result.tracks.length > 0) {
        const track = result.tracks[0]
        await this.playerManager.playTrack(guildId, track, options)
        this.stats.totalTracksPlayed++
        return track
      } else {
        throw new Error('No tracks found')
      }
    } catch (error) {
      console.error('Failed to load and play track:', error)
      this.stats.totalErrors++
      throw error
    }
  }

  setLoadBalancingStrategy(strategy) {
    this.loadBalancer.setStrategy(strategy)
  }

  updateHealthThresholds(thresholds) {
    this.healthMonitor.updateAlertThresholds(thresholds)
  }

  async gracefulShutdown() {
    console.log('Starting Lavalink manager graceful shutdown...')

    // Stop all players
    for (const [guildId] of this.playerManager.players) {
      this.playerManager.destroyPlayer(guildId)
    }

    // Disconnect from nodes
    await this.lavalinkManager.destroy()

    console.log('Lavalink manager shutdown complete')
  }
}

// Usage example
const lavalinkConfig = {
  nodes: [
    {
      id: 'node1',
      host: 'localhost',
      port: 2333,
      password: 'youshallnotpass'
    },
    {
      id: 'node2',
      host: 'localhost',
      port: 2334,
      password: 'youshallnotpass'
    }
  ]
}

const manager = new ProductionLavalinkManager(client, lavalinkConfig)
```

## Best Practices

### Implementation Guidelines

1. **Deploy multiple Lavalink nodes** for redundancy and load distribution
2. **Implement intelligent load balancing** to optimize resource usage
3. **Set up comprehensive health monitoring** with automated alerts
4. **Configure automatic failover** to maintain service continuity
5. **Monitor node performance metrics** continuously
6. **Use connection pooling** to manage Lavalink connections efficiently
7. **Implement proper error handling** with retry mechanisms
8. **Configure resource limits** to prevent overload
9. **Set up logging and metrics collection** for debugging
10. **Test failover scenarios** regularly

### Production Considerations

This comprehensive Lavalink integration provides scalable, highly available audio processing with automatic load balancing and failover capabilities for production Discord bots.