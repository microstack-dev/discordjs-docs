# Performance

Collector performance optimization for large-scale Discord.js applications. This page covers scaling strategies, memory management, and performance monitoring.

## Performance Fundamentals

### Collector Overhead

Each collector consumes:
- **Memory**: For storing collected items
- **CPU**: For filter evaluation
- **Network**: For event processing
- **Event Loop**: Blocking during processing

### Performance Metrics

```js
class CollectorMetrics {
  constructor() {
    this.metrics = {
      activeCollectors: 0,
      totalCollected: 0,
      averageProcessingTime: 0,
      memoryUsage: 0,
      errorRate: 0
    }
  }

  trackCollectorStart() {
    this.metrics.activeCollectors++
  }

  trackCollectorEnd(duration, itemCount, errors = 0) {
    this.metrics.activeCollectors--
    this.metrics.totalCollected += itemCount
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime + duration) / 2

    if (errors > 0) {
      this.metrics.errorRate = (this.metrics.errorRate + errors) / 2
    }
  }

  updateMemoryUsage() {
    const usage = process.memoryUsage()
    this.metrics.memoryUsage = usage.heapUsed
  }

  getReport() {
    return { ...this.metrics }
  }
}

const metrics = new CollectorMetrics()
```

## Scaling Strategies

### Collector Pooling

```js
class CollectorPool {
  constructor(maxCollectors = 100) {
    this.maxCollectors = maxCollectors
    this.activeCollectors = new Map()
    this.queue = []
  }

  async createCollector(channel, options) {
    if (this.activeCollectors.size >= this.maxCollectors) {
      return new Promise((resolve, reject) => {
        this.queue.push({ channel, options, resolve, reject })

        // Timeout queued requests
        setTimeout(() => {
          const index = this.queue.findIndex(item => item.resolve === resolve)
          if (index > -1) {
            this.queue.splice(index, 1)
            reject(new Error('Collector queue timeout'))
          }
        }, 30000)
      })
    }

    const collector = channel.createMessageCollector(options)
    const id = `collector_${Date.now()}_${Math.random()}`

    this.activeCollectors.set(id, collector)

    collector.on('end', () => {
      this.activeCollectors.delete(id)

      // Process queued request
      if (this.queue.length > 0) {
        const queued = this.queue.shift()
        this.createCollector(queued.channel, queued.options)
          .then(queued.resolve)
          .catch(queued.reject)
      }
    })

    return collector
  }

  getStats() {
    return {
      active: this.activeCollectors.size,
      queued: this.queue.length,
      max: this.maxCollectors
    }
  }
}

const collectorPool = new CollectorPool(50)
```

### Sharded Collector Management

```js
class ShardedCollectorManager {
  constructor(client) {
    this.client = client
    this.shardCollectors = new Map()
    this.setupShardListeners()
  }

  setupShardListeners() {
    this.client.on('shardCreate', (shard) => {
      this.shardCollectors.set(shard.id, new Map())
    })

    this.client.on('shardDisconnect', (shard) => {
      const shardCollectors = this.shardCollectors.get(shard.id)
      if (shardCollectors) {
        shardCollectors.forEach(collector => collector.stop())
        this.shardCollectors.delete(shard.id)
      }
    })
  }

  registerCollector(shardId, collectorId, collector) {
    const shardCollectors = this.shardCollectors.get(shardId)
    if (shardCollectors) {
      shardCollectors.set(collectorId, collector)
    }
  }

  stopShardCollectors(shardId) {
    const shardCollectors = this.shardCollectors.get(shardId)
    if (shardCollectors) {
      shardCollectors.forEach(collector => collector.stop())
      shardCollectors.clear()
    }
  }

  getShardStats(shardId) {
    const shardCollectors = this.shardCollectors.get(shardId)
    return shardCollectors ? shardCollectors.size : 0
  }
}
```

## Memory Management

### Collector Cleanup

```js
class CollectorCleanupManager {
  constructor() {
    this.collectors = new Set()
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  register(collector) {
    this.collectors.add(collector)

    collector.on('end', () => {
      this.collectors.delete(collector)
    })
  }

  cleanup() {
    let cleaned = 0

    for (const collector of this.collectors) {
      if (this.shouldCleanup(collector)) {
        collector.stop('cleanup')
        this.collectors.delete(collector)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} collectors`)
    }
  }

  shouldCleanup(collector) {
    // Check if collector is older than 30 minutes
    const age = Date.now() - (collector.createdAt || 0)
    return age > 30 * 60 * 1000
  }

  forceCleanup() {
    const count = this.collectors.size
    this.collectors.forEach(collector => collector.stop('force_cleanup'))
    this.collectors.clear()
    console.log(`Force cleaned up ${count} collectors`)
  }

  getStats() {
    return {
      activeCollectors: this.collectors.size,
      oldestCollector: this.getOldestCollectorAge()
    }
  }

  getOldestCollectorAge() {
    let oldest = 0

    for (const collector of this.collectors) {
      const age = Date.now() - (collector.createdAt || 0)
      oldest = Math.max(oldest, age)
    }

    return oldest
  }
}

const cleanupManager = new CollectorCleanupManager()

// Emergency cleanup on memory warning
process.on('warning', (warning) => {
  if (warning.name === 'MemoryWarning') {
    console.warn('Memory warning: cleaning up collectors')
    cleanupManager.forceCleanup()
  }
})
```

### Memory-Efficient Collection

```js
class MemoryEfficientCollector {
  constructor(channel, options) {
    this.channel = channel
    this.options = options
    this.collected = new Set() // Use Set for O(1) lookups
    this.maxMemoryItems = 1000
  }

  async collect() {
    const collector = this.channel.createMessageCollector({
      ...this.options,
      dispose: true // Handle deleted messages
    })

    collector.on('collect', (item) => {
      // Limit memory usage
      if (this.collected.size >= this.maxMemoryItems) {
        // Remove oldest items (simple FIFO)
        const toRemove = Array.from(this.collected).slice(0, 100)
        toRemove.forEach(item => this.collected.delete(item))
      }

      this.collected.add(item.id)
      this.processItem(item)
    })

    collector.on('dispose', (item) => {
      this.collected.delete(item.id)
    })

    return new Promise((resolve) => {
      collector.on('end', (collected, reason) => {
        resolve({ collected, reason, memoryItems: this.collected.size })
      })
    })
  }

  async processItem(item) {
    // Process without storing large objects
    const summary = {
      id: item.id,
      author: item.author.id,
      channel: item.channel.id,
      timestamp: item.createdTimestamp,
      contentLength: item.content.length
    }

    // Process summary instead of full object
    await processItemSummary(summary)
  }
}
```

## Performance Monitoring

### Collector Performance Tracker

```js
class CollectorPerformanceTracker {
  constructor() {
    this.performanceData = new Map()
    this.alerts = []
  }

  trackCollectorStart(collectorId, type) {
    this.performanceData.set(collectorId, {
      type,
      startTime: Date.now(),
      itemCount: 0,
      processingTime: 0,
      memoryUsage: process.memoryUsage().heapUsed
    })
  }

  trackItemProcessing(collectorId, processingTime) {
    const data = this.performanceData.get(collectorId)
    if (data) {
      data.itemCount++
      data.processingTime += processingTime
    }
  }

  trackCollectorEnd(collectorId, reason) {
    const data = this.performanceData.get(collectorId)
    if (!data) return

    data.endTime = Date.now()
    data.duration = data.endTime - data.startTime
    data.reason = reason
    data.finalMemoryUsage = process.memoryUsage().heapUsed
    data.memoryDelta = data.finalMemoryUsage - data.memoryUsage

    this.analyzePerformance(data)
    this.performanceData.delete(collectorId)
  }

  analyzePerformance(data) {
    // Performance thresholds
    const thresholds = {
      maxDuration: 10 * 60 * 1000, // 10 minutes
      maxMemoryDelta: 50 * 1024 * 1024, // 50MB
      maxProcessingTimePerItem: 1000, // 1 second per item
      maxItemCount: 1000
    }

    const alerts = []

    if (data.duration > thresholds.maxDuration) {
      alerts.push(`Long-running collector: ${data.duration}ms`)
    }

    if (data.memoryDelta > thresholds.maxMemoryDelta) {
      alerts.push(`High memory usage: +${Math.round(data.memoryDelta / 1024 / 1024)}MB`)
    }

    if (data.itemCount > thresholds.maxItemCount) {
      alerts.push(`High item count: ${data.itemCount}`)
    }

    if (data.itemCount > 0) {
      const avgProcessingTime = data.processingTime / data.itemCount
      if (avgProcessingTime > thresholds.maxProcessingTimePerItem) {
        alerts.push(`Slow processing: ${avgProcessingTime}ms per item`)
      }
    }

    if (alerts.length > 0) {
      console.warn(`Collector performance alert for ${data.type}:`, alerts)
      this.alerts.push({
        collectorId: data.id,
        type: data.type,
        alerts,
        timestamp: Date.now(),
        data
      })
    }
  }

  getPerformanceReport() {
    return {
      activeCollectors: this.performanceData.size,
      recentAlerts: this.alerts.slice(-10),
      memoryUsage: process.memoryUsage()
    }
  }
}

const performanceTracker = new CollectorPerformanceTracker()
```

## Optimization Techniques

### Filter Optimization

```js
// Fast filter checks (do cheap checks first)
const optimizedFilter = (interaction) => {
  // 1. Fast checks first
  if (interaction.user.id !== targetUserId) return false
  if (!interaction.isButton()) return false

  // 2. Medium checks
  if (!interaction.customId.startsWith('menu_')) return false

  // 3. Expensive checks last
  return checkComplexCondition(interaction)
}

// Cached filter results
class CachedFilter {
  constructor(filterFn, ttl = 30000) {
    this.filterFn = filterFn
    this.cache = new Map()
    this.ttl = ttl
  }

  evaluate(item) {
    const key = this.getCacheKey(item)
    const cached = this.cache.get(key)

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.result
    }

    const result = this.filterFn(item)
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    })

    return result
  }

  getCacheKey(item) {
    return `${item.id || item.user.id}_${item.customId || item.content?.substring(0, 10)}`
  }
}
```

### Collector Batching

```js
class BatchedCollector {
  constructor(channel, batchSize = 10, batchTimeout = 5000) {
    this.channel = channel
    this.batchSize = batchSize
    this.batchTimeout = batchTimeout
    this.batch = []
    this.timeoutId = null
  }

  async start(filter, processor) {
    const collector = this.channel.createMessageCollector({
      filter,
      time: 300000 // 5 minutes
    })

    collector.on('collect', (item) => {
      this.batch.push(item)

      if (this.batch.length >= this.batchSize) {
        this.processBatch(processor)
      } else {
        this.scheduleBatchProcessing(processor)
      }
    })

    collector.on('end', () => {
      if (this.batch.length > 0) {
        this.processBatch(processor)
      }
      this.clearTimeout()
    })

    return collector
  }

  scheduleBatchProcessing(processor) {
    this.clearTimeout()
    this.timeoutId = setTimeout(() => {
      if (this.batch.length > 0) {
        this.processBatch(processor)
      }
    }, this.batchTimeout)
  }

  async processBatch(processor) {
    const currentBatch = [...this.batch]
    this.batch = []
    this.clearTimeout()

    try {
      await processor(currentBatch)
    } catch (error) {
      console.error('Batch processing error:', error)
    }
  }

  clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }
}
```

## Best Practices

### Resource Limits

```js
const limits = {
  maxConcurrentCollectors: 50,
  maxItemsPerCollector: 100,
  maxCollectorLifetime: 10 * 60 * 1000, // 10 minutes
  maxMemoryUsage: 100 * 1024 * 1024 // 100MB
}

function shouldCreateCollector() {
  const currentCollectors = getActiveCollectorCount()
  const memoryUsage = process.memoryUsage().heapUsed

  return currentCollectors < limits.maxConcurrentCollectors &&
         memoryUsage < limits.maxMemoryUsage
}
```

### Monitoring and Alerts

```js
setInterval(() => {
  const stats = {
    collectors: collectorPool.getStats(),
    cleanup: cleanupManager.getStats(),
    performance: performanceTracker.getPerformanceReport()
  }

  // Check thresholds
  if (stats.collectors.active > limits.maxConcurrentCollectors * 0.8) {
    console.warn('High collector count detected')
  }

  if (stats.cleanup.activeCollectors > 100) {
    console.warn('Many collectors pending cleanup')
  }

  // Log stats
  console.log('Collector performance stats:', stats)
}, 60000)
```

## Next Steps

- [Permissions Overview](/permissions/overview) - Access control and security