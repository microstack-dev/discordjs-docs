# Rate Limits

Discord.js v14.25.1 rate limit handling for production bots. This section covers REST API limits, Gateway limits, backoff strategies, and monitoring techniques for reliable operation.

## REST API Rate Limits

Discord's REST API enforces rate limits to prevent abuse. Understanding and respecting these limits is crucial for production bots.

### Rate Limit Headers

Discord provides rate limit information in response headers:

```js
const axios = require('axios')

async function makeRequest(endpoint, options = {}) {
  try {
    const response = await axios({
      method: options.method || 'GET',
      url: `https://discord.com/api/v10${endpoint}`,
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      data: options.data
    })

    // Check rate limit headers
    const remaining = response.headers['x-ratelimit-remaining']
    const reset = response.headers['x-ratelimit-reset']
    const limit = response.headers['x-ratelimit-limit']

    console.log(`Rate limit: ${remaining}/${limit} remaining, resets at ${new Date(reset * 1000)}`)

    return response.data
  } catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after']
      console.log(`Rate limited! Retry after ${retryAfter}ms`)
      throw new Error('Rate limited')
    }
    throw error
  }
}
```

### Global vs Per-Route Limits

Discord uses two types of rate limits:

- **Global Rate Limit**: 50 requests per second across all endpoints
- **Per-Route Limits**: Vary by endpoint (e.g., channels: 5/5s, webhooks: 10/10s)

```js
class RateLimiter {
  constructor() {
    this.globalReset = 0
    this.globalRemaining = 50
    this.routeLimits = new Map()
  }

  async waitForLimit(endpoint) {
    const now = Date.now() / 1000

    // Check global limit
    if (this.globalRemaining <= 0 && now < this.globalReset) {
      const waitTime = (this.globalReset - now) * 1000
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    // Check route-specific limit
    const routeKey = this.getRouteKey(endpoint)
    const routeLimit = this.routeLimits.get(routeKey)

    if (routeLimit && routeLimit.remaining <= 0 && now < routeLimit.reset) {
      const waitTime = (routeLimit.reset - now) * 1000
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  updateLimits(response) {
    const headers = response.headers
    const now = Date.now() / 1000

    // Update global limits
    this.globalRemaining = parseInt(headers['x-ratelimit-remaining'])
    this.globalReset = parseInt(headers['x-ratelimit-reset'])

    // Update route limits
    const routeKey = headers['x-ratelimit-bucket']
    if (routeKey) {
      this.routeLimits.set(routeKey, {
        remaining: parseInt(headers['x-ratelimit-remaining']),
        reset: parseInt(headers['x-ratelimit-reset']),
        limit: parseInt(headers['x-ratelimit-limit'])
      })
    }
  }

  getRouteKey(endpoint) {
    // Extract major route parameters
    return endpoint.replace(/\d+/g, ':id')
  }
}
```

## Gateway Rate Limits

Gateway connections have their own rate limiting to prevent spam.

### Identify Events

The Gateway limits IDENTIFY events to prevent connection spam:

```js
class GatewayManager {
  constructor(client) {
    this.client = client
    this.identifyLimit = 1000  // 1000 identifies per 24 hours
    this.identifyUsed = 0
    this.lastIdentifyReset = Date.now()

    this.setupGateway()
  }

  setupGateway() {
    this.client.on('ready', () => {
      // Reset identify count daily
      setInterval(() => {
        this.identifyUsed = 0
        this.lastIdentifyReset = Date.now()
      }, 24 * 60 * 60 * 1000)
    })

    this.client.on('shardResume', (id) => {
      // Handle shard resumption
      console.log(`Shard ${id} resumed`)
    })
  }

  async identifyShard(shardId) {
    if (this.identifyUsed >= this.identifyLimit) {
      throw new Error('Identify limit exceeded')
    }

    try {
      // Perform identify
      this.identifyUsed++
      return await this.client.shards.get(shardId).identify()
    } catch (error) {
      console.error(`Failed to identify shard ${shardId}:`, error)
      throw error
    }
  }
}
```

### Session Limits

Gateway sessions have additional constraints:

- Maximum 1000 IDENTIFY calls per 24 hours per token
- Invalid IDENTIFY payloads result in session invalidation
- Resume tokens expire after 24 hours

## Backoff Strategies

Implement exponential backoff for handling rate limits gracefully.

### Exponential Backoff

```js
class ExponentialBackoff {
  constructor() {
    this.baseDelay = 1000  // 1 second
    this.maxDelay = 60000  // 1 minute
    this.maxRetries = 5
    this.jitterFactor = 0.1
  }

  async executeWithBackoff(operation, retryCount = 0) {
    try {
      return await operation()
    } catch (error) {
      if (error.message === 'Rate limited' && retryCount < this.maxRetries) {
        const delay = this.calculateDelay(retryCount)
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1})`)

        await new Promise(resolve => setTimeout(resolve, delay))
        return this.executeWithBackoff(operation, retryCount + 1)
      }

      throw error
    }
  }

  calculateDelay(retryCount) {
    const exponentialDelay = this.baseDelay * Math.pow(2, retryCount)
    const jitter = exponentialDelay * this.jitterFactor * (Math.random() - 0.5)
    return Math.min(exponentialDelay + jitter, this.maxDelay)
  }
}
```

### Circuit Breaker Pattern

```js
class CircuitBreaker {
  constructor(failureThreshold = 5, recoveryTime = 60000) {
    this.failureThreshold = failureThreshold
    this.recoveryTime = recoveryTime
    this.failureCount = 0
    this.state = 'CLOSED'  // CLOSED, OPEN, HALF_OPEN
    this.lastFailureTime = 0
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTime) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  onSuccess() {
    this.failureCount = 0
    this.state = 'CLOSED'
  }

  onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }
}
```

## Burst Handling

Handle burst traffic while respecting rate limits.

### Request Queuing

```js
class RequestQueue {
  constructor(rateLimiter) {
    this.rateLimiter = rateLimiter
    this.queue = []
    this.processing = false
    this.requestsPerSecond = 50  // Global limit
    this.lastRequestTime = 0
  }

  async enqueue(endpoint, operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({ endpoint, operation, resolve, reject })
      this.processQueue()
    })
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0) {
      const { endpoint, operation, resolve, reject } = this.queue.shift()

      try {
        await this.rateLimiter.waitForLimit(endpoint)

        // Enforce global rate limit
        const now = Date.now()
        const timeSinceLastRequest = now - this.lastRequestTime
        const minInterval = 1000 / this.requestsPerSecond

        if (timeSinceLastRequest < minInterval) {
          await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest))
        }

        this.lastRequestTime = Date.now()

        const result = await operation()
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }

    this.processing = false
  }
}
```

### Burst Buckets

```js
class BurstBucket {
  constructor(capacity, refillRate, refillInterval) {
    this.capacity = capacity
    this.refillRate = refillRate
    this.refillInterval = refillInterval
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  async consume(tokens = 1) {
    this.refill()

    if (this.tokens < tokens) {
      const waitTime = this.refillInterval * ((tokens - this.tokens) / this.refillRate)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      return this.consume(tokens)
    }

    this.tokens -= tokens
    return true
  }

  refill() {
    const now = Date.now()
    const timePassed = now - this.lastRefill
    const refillAmount = Math.floor(timePassed / this.refillInterval) * this.refillRate

    this.tokens = Math.min(this.capacity, this.tokens + refillAmount)
    this.lastRefill = now
  }
}
```

## Rate Limit Monitoring

Monitor rate limit usage and performance.

### Metrics Collection

```js
class RateLimitMonitor {
  constructor(client) {
    this.client = client
    this.metrics = {
      requestsTotal: 0,
      requestsSuccessful: 0,
      requestsFailed: 0,
      rateLimitsHit: 0,
      averageResponseTime: 0,
      peakRequestsPerSecond: 0
    }

    this.requestTimes = []
    this.setupMonitoring()
  }

  setupMonitoring() {
    // Track API requests
    const originalRequest = this.client.rest.request
    this.client.rest.request = async (...args) => {
      const startTime = Date.now()
      this.metrics.requestsTotal++

      try {
        const result = await originalRequest.apply(this.client.rest, args)
        this.metrics.requestsSuccessful++
        this.recordResponseTime(Date.now() - startTime)
        return result
      } catch (error) {
        this.metrics.requestsFailed++

        if (error.httpStatus === 429) {
          this.metrics.rateLimitsHit++
        }

        throw error
      }
    }
  }

  recordResponseTime(responseTime) {
    this.requestTimes.push(responseTime)

    // Keep only last 1000 requests
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift()
    }

    this.metrics.averageResponseTime = this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.requestsSuccessful / this.metrics.requestsTotal,
      rateLimitRate: this.metrics.rateLimitsHit / this.metrics.requestsTotal
    }
  }
}
```

### Alerting

```js
class RateLimitAlerter {
  constructor(monitor, thresholds) {
    this.monitor = monitor
    this.thresholds = thresholds || {
      rateLimitRate: 0.1,  // 10% of requests hitting rate limits
      averageResponseTime: 2000,  // 2 seconds
      successRate: 0.95  // 95% success rate
    }

    this.alertCooldown = 5 * 60 * 1000  // 5 minutes
    this.lastAlerts = new Map()
  }

  checkAlerts() {
    const metrics = this.monitor.getMetrics()
    const now = Date.now()

    // Check rate limit rate
    if (metrics.rateLimitRate > this.thresholds.rateLimitRate) {
      this.sendAlert('High rate limit hit rate', `Rate limit rate: ${(metrics.rateLimitRate * 100).toFixed(1)}%`)
    }

    // Check response time
    if (metrics.averageResponseTime > this.thresholds.averageResponseTime) {
      this.sendAlert('High average response time', `Average response time: ${metrics.averageResponseTime.toFixed(0)}ms`)
    }

    // Check success rate
    if (metrics.successRate < this.thresholds.successRate) {
      this.sendAlert('Low request success rate', `Success rate: ${(metrics.successRate * 100).toFixed(1)}%`)
    }
  }

  sendAlert(title, message) {
    const alertKey = title
    const lastAlert = this.lastAlerts.get(alertKey)

    if (!lastAlert || (Date.now() - lastAlert) > this.alertCooldown) {
      console.error(`🚨 ALERT: ${title} - ${message}`)
      this.lastAlerts.set(alertKey, Date.now())

      // Here you would integrate with your alerting system
      // e.g., send to Slack, Discord webhook, email, etc.
    }
  }
}
```

## Best Practices

### Implementation Guidelines

1. **Always check rate limit headers** in API responses
2. **Implement exponential backoff** for retries
3. **Use request queuing** for burst traffic
4. **Monitor rate limit usage** continuously
5. **Set up alerting** for rate limit issues
6. **Respect global and per-route limits**
7. **Handle 429 responses** gracefully
8. **Use circuit breakers** for fault tolerance

### Production Considerations

```js
// Complete rate limit management system
class ProductionRateLimiter {
  constructor(client) {
    this.client = client
    this.rateLimiter = new RateLimiter()
    this.backoff = new ExponentialBackoff()
    this.queue = new RequestQueue(this.rateLimiter)
    this.monitor = new RateLimitMonitor(client)
    this.alerter = new RateLimitAlerter(this.monitor)

    // Check alerts every minute
    setInterval(() => {
      this.alerter.checkAlerts()
    }, 60000)
  }

  async makeRequest(endpoint, operation) {
    return this.backoff.executeWithBackoff(async () => {
      return this.queue.enqueue(endpoint, async () => {
        await this.rateLimiter.waitForLimit(endpoint)
        const result = await operation()
        this.rateLimiter.updateLimits(result.response)
        return result
      })
    })
  }
}
```

This comprehensive approach ensures your bot respects Discord's rate limits while maintaining optimal performance and reliability in production environments.