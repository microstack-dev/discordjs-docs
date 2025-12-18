# Memory Optimization

Discord.js v14.25.1 memory management for production bots. This section covers memory profiling, garbage collection optimization, memory leak detection, and efficient memory usage patterns.

## Memory Profiling

Understanding memory usage is crucial for long-running Discord bots.

### Memory Usage Monitoring

```js
class MemoryProfiler {
  constructor() {
    this.snapshots = []
    this.startTime = Date.now()
  }

  takeSnapshot(label = '') {
    const memUsage = process.memoryUsage()

    const snapshot = {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      label
    }

    this.snapshots.push(snapshot)
    return snapshot
  }

  getMemoryReport() {
    const current = this.takeSnapshot('report')
    const previous = this.snapshots[this.snapshots.length - 2]

    if (!previous) return current

    const growth = {
      rss: current.rss - previous.rss,
      heapTotal: current.heapTotal - previous.heapTotal,
      heapUsed: current.heapUsed - previous.heapUsed,
      external: current.external - previous.external
    }

    return {
      current,
      growth,
      trend: this.analyzeTrend()
    }
  }

  analyzeTrend() {
    if (this.snapshots.length < 5) return 'insufficient_data'

    const recent = this.snapshots.slice(-5)
    const heapGrowth = recent[recent.length - 1].heapUsed - recent[0].heapUsed

    if (heapGrowth > 10 * 1024 * 1024) return 'increasing'  // 10MB growth
    if (heapGrowth < -10 * 1024 * 1024) return 'decreasing'
    return 'stable'
  }
}
```

### Heap Analysis

```js
const v8 = require('v8')
const fs = require('fs')

class HeapAnalyzer {
  constructor() {
    this.heapSnapshots = []
  }

  takeHeapSnapshot(filename) {
    const snapshot = v8.writeHeapSnapshot(filename)
    this.heapSnapshots.push({
      filename,
      timestamp: Date.now(),
      size: fs.statSync(filename).size
    })
    return snapshot
  }

  compareSnapshots(snapshot1, snapshot2) {
    // Use heap analysis tools to compare
    // This is a simplified example
    const stats1 = fs.statSync(snapshot1)
    const stats2 = fs.statSync(snapshot2)

    return {
      sizeDifference: stats2.size - stats1.size,
      growthRate: ((stats2.size - stats1.size) / stats1.size) * 100
    }
  }

  getHeapStats() {
    const stats = v8.getHeapStatistics()
    return {
      totalHeapSize: stats.total_heap_size,
      usedHeapSize: stats.used_heap_size,
      heapSizeLimit: stats.heap_size_limit,
      mallocedMemory: stats.malloced_memory,
      peakMallocedMemory: stats.peak_malloced_memory,
      doesZapGarbage: stats.does_zap_garbage
    }
  }
}
```

## Garbage Collection Optimization

Manual GC triggering and optimization strategies.

### GC Monitoring

```js
class GCMonitor {
  constructor() {
    this.gcStats = {
      collections: 0,
      totalTime: 0,
      averageTime: 0,
      lastGC: 0
    }

    if (typeof gc !== 'undefined') {
      this.setupGCMonitoring()
    }
  }

  setupGCMonitoring() {
    const originalGc = gc

    global.gc = () => {
      const startTime = Date.now()
      const result = originalGc()
      const duration = Date.now() - startTime

      this.gcStats.collections++
      this.gcStats.totalTime += duration
      this.gcStats.averageTime = this.gcStats.totalTime / this.gcStats.collections
      this.gcStats.lastGC = Date.now()

      console.log(`GC completed in ${duration}ms`)
      return result
    }
  }

  forceGC() {
    if (typeof gc === 'function') {
      const startTime = Date.now()
      gc()
      const duration = Date.now() - startTime
      console.log(`Manual GC completed in ${duration}ms`)
    }
  }

  getGCStats() {
    return { ...this.gcStats }
  }
}
```

### Memory Pressure Handling

```js
class MemoryPressureHandler {
  constructor(thresholds = {}) {
    this.thresholds = {
      heapUsedRatio: thresholds.heapUsedRatio || 0.8,  // 80% heap usage
      rssLimit: thresholds.rssLimit || 512 * 1024 * 1024,  // 512MB
      checkInterval: thresholds.checkInterval || 30000  // 30 seconds
    }

    this.profiler = new MemoryProfiler()
    this.gcMonitor = new GCMonitor()

    this.startMonitoring()
  }

  startMonitoring() {
    setInterval(() => {
      this.checkMemoryPressure()
    }, this.thresholds.checkInterval)
  }

  checkMemoryPressure() {
    const memUsage = process.memoryUsage()
    const heapStats = v8.getHeapStatistics()

    const heapUsedRatio = memUsage.heapUsed / heapStats.heap_size_limit
    const rssExceeded = memUsage.rss > this.thresholds.rssLimit

    if (heapUsedRatio > this.thresholds.heapUsedRatio || rssExceeded) {
      console.warn('High memory pressure detected, triggering GC')
      this.handleMemoryPressure()
    }
  }

  handleMemoryPressure() {
    // Force garbage collection
    this.gcMonitor.forceGC()

    // Clear caches if available
    if (global.gc && typeof global.gc.forceGC === 'function') {
      global.gc.forceGC()
    }

    // Take memory snapshot for analysis
    this.profiler.takeSnapshot('memory-pressure')

    // Implement cache clearing strategies
    this.clearCaches()
  }

  clearCaches() {
    // Clear any application-specific caches
    // This depends on your bot's architecture
    console.log('Clearing application caches...')
  }
}
```

## Object Pooling

Reuse objects to reduce GC pressure.

### Message Pool

```js
class MessagePool {
  constructor(maxSize = 1000) {
    this.pool = []
    this.maxSize = maxSize
    this.created = 0
    this.reused = 0
  }

  acquire() {
    let message = this.pool.pop()

    if (!message) {
      message = this.createMessage()
      this.created++
    } else {
      this.reused++
    }

    return message
  }

  release(message) {
    if (this.pool.length < this.maxSize) {
      // Reset message properties
      this.resetMessage(message)
      this.pool.push(message)
    }
  }

  createMessage() {
    return {
      content: null,
      embeds: [],
      components: [],
      files: [],
      timestamp: null,
      _poolRef: this
    }
  }

  resetMessage(message) {
    message.content = null
    message.embeds.length = 0
    message.components.length = 0
    message.files.length = 0
    message.timestamp = null
  }

  getStats() {
    return {
      poolSize: this.pool.length,
      created: this.created,
      reused: this.reused,
      reuseRate: this.reused / (this.created + this.reused)
    }
  }
}
```

### Embed Pool

```js
class EmbedPool {
  constructor(maxSize = 500) {
    this.pool = []
    this.maxSize = maxSize
  }

  acquire() {
    let embed = this.pool.pop()

    if (!embed) {
      embed = {
        title: null,
        description: null,
        fields: [],
        _poolRef: this
      }
    }

    return embed
  }

  release(embed) {
    // Reset embed properties
    embed.title = null
    embed.description = null
    embed.fields.length = 0

    if (this.pool.length < this.maxSize) {
      this.pool.push(embed)
    }
  }
}
```

## Memory Leak Detection

Identify and fix memory leaks in production.

### Leak Detection

```js
class MemoryLeakDetector {
  constructor() {
    this.snapshots = []
    this.leakThreshold = 50 * 1024 * 1024  // 50MB
    this.checkInterval = 5 * 60 * 1000  // 5 minutes
  }

  startDetection() {
    setInterval(() => {
      this.takeSnapshot()
      this.analyzeLeaks()
    }, this.checkInterval)
  }

  takeSnapshot() {
    const memUsage = process.memoryUsage()

    this.snapshots.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      rss: memUsage.rss
    })

    // Keep only last 12 snapshots (1 hour)
    if (this.snapshots.length > 12) {
      this.snapshots.shift()
    }
  }

  analyzeLeaks() {
    if (this.snapshots.length < 6) return

    const recent = this.snapshots.slice(-6)
    const oldest = recent[0]
    const newest = recent[recent.length - 1]

    const heapGrowth = newest.heapUsed - oldest.heapUsed
    const rssGrowth = newest.rss - oldest.rss

    if (heapGrowth > this.leakThreshold || rssGrowth > this.leakThreshold) {
      this.reportLeak(heapGrowth, rssGrowth)
    }
  }

  reportLeak(heapGrowth, rssGrowth) {
    console.error('🚨 MEMORY LEAK DETECTED!')
    console.error(`Heap growth: ${this.formatBytes(heapGrowth)}`)
    console.error(`RSS growth: ${this.formatBytes(rssGrowth)}`)

    // Take heap snapshot for analysis
    if (typeof v8 !== 'undefined') {
      const filename = `leak-snapshot-${Date.now()}.heapsnapshot`
      v8.writeHeapSnapshot(filename)
      console.error(`Heap snapshot saved: ${filename}`)
    }
  }

  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB']
    let value = bytes
    let unitIndex = 0

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024
      unitIndex++
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`
  }
}
```

### Event Listener Leak Detection

```js
class EventListenerLeakDetector {
  constructor(client) {
    this.client = client
    this.listenerCounts = new Map()
    this.checkInterval = 10 * 60 * 1000  // 10 minutes
  }

  startDetection() {
    setInterval(() => {
      this.checkListenerLeaks()
    }, this.checkInterval)
  }

  checkListenerLeaks() {
    const currentCounts = this.getListenerCounts()

    for (const [event, count] of currentCounts) {
      const previousCount = this.listenerCounts.get(event) || 0

      if (count > previousCount + 10) {  // Allow some variance
        console.warn(`Potential event listener leak for '${event}': ${previousCount} → ${count}`)
      }
    }

    this.listenerCounts = currentCounts
  }

  getListenerCounts() {
    const counts = new Map()

    // Check client's event listeners
    for (const event of this.client.eventNames()) {
      counts.set(event, this.client.listenerCount(event))
    }

    return counts
  }
}
```

## Heap Monitoring

Continuous heap usage monitoring and alerting.

### Heap Monitor

```js
class HeapMonitor {
  constructor(thresholds = {}) {
    this.thresholds = {
      heapUsedPercent: thresholds.heapUsedPercent || 85,
      heapGrowthRate: thresholds.heapGrowthRate || 10 * 1024 * 1024,  // 10MB/min
      checkInterval: thresholds.checkInterval || 60000  // 1 minute
    }

    this.heapHistory = []
    this.alertCooldown = 5 * 60 * 1000  // 5 minutes
    this.lastAlert = 0
  }

  startMonitoring() {
    setInterval(() => {
      this.checkHeapUsage()
      this.checkHeapGrowth()
    }, this.thresholds.checkInterval)
  }

  checkHeapUsage() {
    const heapStats = v8.getHeapStatistics()
    const usedPercent = (heapStats.used_heap_size / heapStats.heap_size_limit) * 100

    if (usedPercent > this.thresholds.heapUsedPercent) {
      this.sendAlert(`High heap usage: ${usedPercent.toFixed(1)}%`)
    }

    this.heapHistory.push({
      timestamp: Date.now(),
      used: heapStats.used_heap_size,
      total: heapStats.total_heap_size
    })

    // Keep 60 minutes of history
    if (this.heapHistory.length > 60) {
      this.heapHistory.shift()
    }
  }

  checkHeapGrowth() {
    if (this.heapHistory.length < 10) return

    const recent = this.heapHistory.slice(-10)
    const oldest = recent[0]
    const newest = recent[recent.length - 1]

    const timeDiff = newest.timestamp - oldest.timestamp
    const growth = newest.used - oldest.used
    const growthRate = growth / (timeDiff / 60000)  // MB per minute

    if (growthRate > this.thresholds.heapGrowthRate) {
      this.sendAlert(`High heap growth rate: ${this.formatBytes(growthRate)}/min`)
    }
  }

  sendAlert(message) {
    const now = Date.now()

    if (now - this.lastAlert > this.alertCooldown) {
      console.error(`🚨 HEAP ALERT: ${message}`)
      this.lastAlert = now
    }
  }

  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB']
    let value = bytes
    let unitIndex = 0

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024
      unitIndex++
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`
  }
}
```

## Memory-Efficient Patterns

Best practices for memory-efficient Discord bot development.

### Efficient Caching

```js
class MemoryEfficientCache {
  constructor(maxSize = 10000, ttl = 30 * 60 * 1000) {  // 30 minutes
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
    this.accessOrder = []
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    const expiresAt = Date.now() + this.ttl
    this.cache.set(key, { value, expiresAt, lastAccess: Date.now() })
    this.updateAccessOrder(key)
  }

  get(key) {
    const entry = this.cache.get(key)

    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    entry.lastAccess = Date.now()
    this.updateAccessOrder(key)
    return entry.value
  }

  evictLRU() {
    if (this.accessOrder.length === 0) return

    const lruKey = this.accessOrder.shift()
    this.cache.delete(lruKey)
  }

  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
    this.accessOrder.push(key)
  }

  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}
```

### Streaming for Large Data

```js
class MemoryEfficientFileHandler {
  constructor(client) {
    this.client = client
  }

  async handleLargeFile(message, url) {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`)
    }

    // Stream file to Discord without loading entirely in memory
    const stream = response.body
    const filename = this.extractFilename(url)

    await message.channel.send({
      files: [{
        attachment: stream,
        name: filename
      }]
    })
  }

  extractFilename(url) {
    try {
      return new URL(url).pathname.split('/').pop() || 'file'
    } catch {
      return 'file'
    }
  }
}
```

### Bulk Operations

```js
class BulkOperationHandler {
  constructor(client) {
    this.client = client
    this.bulkSize = 10
    this.delayBetweenBulks = 1000  // 1 second
  }

  async bulkDeleteMessages(channel, messageIds) {
    const chunks = this.chunkArray(messageIds, this.bulkSize)

    for (const chunk of chunks) {
      try {
        await channel.bulkDelete(chunk)
        await this.delay(this.delayBetweenBulks)
      } catch (error) {
        console.error('Bulk delete failed:', error)
        // Handle rate limits or permission errors
      }
    }
  }

  async bulkCreateRoles(guild, roleData) {
    const createdRoles = []

    for (const data of roleData) {
      try {
        const role = await guild.roles.create({
          name: data.name,
          color: data.color,
          permissions: data.permissions
        })
        createdRoles.push(role)
        await this.delay(500)  // Rate limit protection
      } catch (error) {
        console.error('Role creation failed:', error)
      }
    }

    return createdRoles
  }

  chunkArray(array, size) {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

## Best Practices

### Implementation Guidelines

1. **Monitor memory usage continuously** in production
2. **Implement object pooling** for frequently created objects
3. **Use streaming** for large file operations
4. **Clean up event listeners** when components are destroyed
5. **Implement memory leak detection** and alerting
6. **Use efficient caching strategies** with TTL and size limits
7. **Force GC during low-traffic periods** to prevent memory pressure
8. **Profile memory usage** regularly with heap snapshots

### Production Considerations

```js
// Complete memory management system
class ProductionMemoryManager {
  constructor(client) {
    this.client = client

    // Initialize all memory management components
    this.profiler = new MemoryProfiler()
    this.analyzer = new HeapAnalyzer()
    this.gcMonitor = new GCMonitor()
    this.pressureHandler = new MemoryPressureHandler()
    this.leakDetector = new MemoryLeakDetector()
    this.heapMonitor = new HeapMonitor()
    this.listenerLeakDetector = new EventListenerLeakDetector(client)

    // Set up object pools
    this.messagePool = new MessagePool()
    this.embedPool = new EmbedPool()

    // Start monitoring
    this.leakDetector.startDetection()
    this.heapMonitor.startMonitoring()
    this.listenerLeakDetector.startDetection()

    this.setupPeriodicCleanup()
  }

  setupPeriodicCleanup() {
    // Clean up expired cache entries every 5 minutes
    setInterval(() => {
      // Any cleanup logic here
    }, 5 * 60 * 1000)

    // Force GC during low usage hours (e.g., 3 AM)
    const now = new Date()
    const nextGC = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 3, 0, 0)
    const timeUntilGC = nextGC - now

    setTimeout(() => {
      this.gcMonitor.forceGC()
      // Schedule next daily GC
      setInterval(() => {
        this.gcMonitor.forceGC()
      }, 24 * 60 * 60 * 1000)
    }, timeUntilGC)
  }

  getMemoryReport() {
    return {
      profiler: this.profiler.getMemoryReport(),
      gcStats: this.gcMonitor.getGCStats(),
      heapStats: this.analyzer.getHeapStats(),
      poolStats: {
        messages: this.messagePool.getStats(),
        embeds: this.embedPool.getStats()
      }
    }
  }
}
```

This comprehensive memory optimization approach ensures your Discord bot maintains stable memory usage and prevents memory-related crashes in production environments.