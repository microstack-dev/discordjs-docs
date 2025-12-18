# Filters

Advanced filtering patterns for collectors enable precise control over what interactions are collected. This page covers filter design, composition, and performance optimization.

## Filter Fundamentals

### Basic Filter Structure

```js
const filter = (collectedItem) => {
  // Return true to collect, false to ignore
  return booleanCondition
}
```

### Filter Types

- **Message Filters**: For `createMessageCollector`
- **Component Filters**: For `createMessageComponentCollector`
- **Reaction Filters**: For `createReactionCollector`

## Advanced Filter Patterns

### User and Permission Filters

```js
// User-specific filter
const userFilter = (interaction) =>
  interaction.user.id === targetUserId

// Permission-based filter
const permissionFilter = (interaction) =>
  interaction.member.permissions.has('MANAGE_MESSAGES')

// Role-based filter
const roleFilter = (interaction) =>
  interaction.member.roles.cache.some(role =>
    allowedRoleIds.includes(role.id)
  )

// Combined user and permission filter
const strictFilter = (interaction) =>
  userFilter(interaction) && permissionFilter(interaction)
```

### Content-Based Filters

```js
// Message content filters
const contentFilters = {
  // Exact match
  exactMatch: (message) =>
    message.content.toLowerCase() === 'confirm',

  // Contains word
  containsWord: (word) => (message) =>
    message.content.toLowerCase().includes(word.toLowerCase()),

  // Starts with prefix
  startsWith: (prefix) => (message) =>
    message.content.startsWith(prefix),

  // Regex pattern
  matchesPattern: (pattern) => (message) =>
    pattern.test(message.content),

  // Length constraints
  lengthBetween: (min, max) => (message) =>
    message.content.length >= min && message.content.length <= max
}

// Usage
const confirmFilter = contentFilters.exactMatch
const commandFilter = contentFilters.startsWith('!')
const urlFilter = contentFilters.matchesPattern(/https?:\/\/[^\s]+/)
```

### Time-Based Filters

```js
// Time window filter
const timeWindowFilter = (startTime, endTime) => (item) =>
  item.createdTimestamp >= startTime && item.createdTimestamp <= endTime

// Rate limiting filter
class RateLimitFilter {
  constructor(maxPerMinute = 10) {
    this.maxPerMinute = maxPerMinute
    this.userActions = new Map()
  }

  filter(userId) {
    return (item) => {
      const now = Date.now()
      const userActions = this.userActions.get(userId) || []

      // Clean old actions (older than 1 minute)
      const recentActions = userActions.filter(time =>
        now - time < 60000
      )

      if (recentActions.length >= this.maxPerMinute) {
        return false // Rate limited
      }

      recentActions.push(now)
      this.userActions.set(userId, recentActions)

      return true
    }
  }
}

const rateLimiter = new RateLimitFilter(5) // 5 actions per minute
const userRateLimitFilter = rateLimiter.filter(targetUserId)
```

### Component-Specific Filters

```js
// Button filters
const buttonFilters = {
  // Specific button ID
  buttonId: (buttonId) => (interaction) =>
    interaction.isButton() && interaction.customId === buttonId,

  // Button ID pattern
  buttonPattern: (pattern) => (interaction) =>
    interaction.isButton() && pattern.test(interaction.customId),

  // Button style
  buttonStyle: (style) => (interaction) =>
    interaction.isButton() && interaction.component.style === style
}

// Select menu filters
const selectFilters = {
  // Select menu ID
  selectId: (selectId) => (interaction) =>
    interaction.isStringSelectMenu() && interaction.customId === selectId,

  // Selected values filter
  hasValues: (interaction) =>
    interaction.isStringSelectMenu() && interaction.values.length > 0,

  // Specific value selected
  hasValue: (targetValue) => (interaction) =>
    interaction.isStringSelectMenu() &&
    interaction.values.includes(targetValue)
}

// Modal filters
const modalFilters = {
  // Modal ID
  modalId: (modalId) => (interaction) =>
    interaction.isModalSubmit() && interaction.customId === modalId,

  // Has required fields
  hasRequiredFields: (requiredFields) => (interaction) => {
    if (!interaction.isModalSubmit()) return false

    return requiredFields.every(fieldId => {
      const value = interaction.fields.getTextInputValue(fieldId)
      return value && value.trim().length > 0
    })
  }
}
```

## Filter Composition

### Filter Combinators

```js
// Logical AND
const and = (...filters) => (item) =>
  filters.every(filter => filter(item))

// Logical OR
const or = (...filters) => (item) =>
  filters.some(filter => filter(item))

// Logical NOT
const not = (filter) => (item) =>
  !filter(item)

// Conditional filter
const when = (condition, filter) => (item) =>
  condition(item) ? filter(item) : true

// Usage
const complexFilter = and(
  userFilter,
  or(
    buttonFilters.buttonId('accept'),
    buttonFilters.buttonId('decline')
  ),
  not(buttonFilters.buttonStyle(ButtonStyle.Danger))
)
```

### Filter Chains

```js
class FilterChain {
  constructor() {
    this.filters = []
  }

  add(filter) {
    this.filters.push(filter)
    return this
  }

  and(filter) {
    return this.add(filter)
  }

  or(otherChain) {
    const combinedFilter = or(
      (item) => this.filters.every(f => f(item)),
      (item) => otherChain.filters.every(f => f(item))
    )
    return new FilterChain().add(combinedFilter)
  }

  not() {
    const notFilter = not((item) => this.filters.every(f => f(item)))
    return new FilterChain().add(notFilter)
  }

  build() {
    return (item) => this.filters.every(filter => filter(item))
  }
}

// Usage
const buttonChain = new FilterChain()
  .add(userFilter)
  .add(buttonFilters.buttonPattern(/^menu_/))
  .add(permissionFilter)

const finalFilter = buttonChain.build()
```

## Dynamic Filters

### Context-Aware Filters

```js
class ContextAwareFilter {
  constructor(contextProvider) {
    this.contextProvider = contextProvider
  }

  createFilter(contextKey) {
    return async (item) => {
      const context = await this.contextProvider.getContext(item)
      const allowedValues = context[contextKey]

      if (!allowedValues) return true

      if (Array.isArray(allowedValues)) {
        return allowedValues.includes(item.user.id)
      }

      return allowedValues === item.user.id
    }
  }
}

// Usage
const contextFilter = new ContextAwareFilter(databaseContextProvider)
const teamFilter = await contextFilter.createFilter('allowedUsers')
```

### Stateful Filters

```js
class StatefulFilter {
  constructor() {
    this.state = new Map()
  }

  // Filter that tracks state
  oncePerUser(userId) {
    return (item) => {
      if (this.state.has(`${userId}_processed`)) {
        return false
      }

      this.state.set(`${userId}_processed`, true)
      return true
    }
  }

  // Filter with cooldown
  cooldown(userId, cooldownMs) {
    return (item) => {
      const key = `${userId}_lastAction`
      const lastAction = this.state.get(key)

      if (lastAction && Date.now() - lastAction < cooldownMs) {
        return false
      }

      this.state.set(key, Date.now())
      return true
    }
  }

  // Reset state
  reset(userId) {
    const keys = Array.from(this.state.keys()).filter(key =>
      key.startsWith(`${userId}_`)
    )

    keys.forEach(key => this.state.delete(key))
  }
}

const statefulFilter = new StatefulFilter()

// Usage
const collector = channel.createMessageCollector({
  filter: and(
    userFilter,
    statefulFilter.oncePerUser(targetUserId),
    statefulFilter.cooldown(targetUserId, 5000) // 5 second cooldown
  ),
  max: 1
})
```

## Performance Optimization

### Filter Caching

```js
class FilterCache {
  constructor() {
    this.cache = new Map()
    this.ttl = 300000 // 5 minutes
  }

  get(filterKey, filterFn) {
    const cached = this.cache.get(filterKey)

    if (cached && Date.now() - cached.created < this.ttl) {
      return cached.filter
    }

    // Create new filter
    const filter = filterFn()
    this.cache.set(filterKey, {
      filter,
      created: Date.now()
    })

    return filter
  }

  invalidate(pattern) {
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

const filterCache = new FilterCache()

// Usage
const userButtonFilter = filterCache.get(
  `user_${userId}_buttons`,
  () => and(userFilter, buttonFilters.buttonPattern(/^user_/))
)
```

### Filter Profiling

```js
class FilterProfiler {
  constructor() {
    this.metrics = new Map()
  }

  profile(filterName, filterFn) {
    return (item) => {
      const start = process.hrtime.bigint()

      const result = filterFn(item)

      const end = process.hrtime.bigint()
      const duration = Number(end - start) / 1000000 // Convert to milliseconds

      const metric = this.metrics.get(filterName) || {
        calls: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0
      }

      metric.calls++
      metric.totalTime += duration
      metric.avgTime = metric.totalTime / metric.calls
      metric.maxTime = Math.max(metric.maxTime, duration)

      this.metrics.set(filterName, metric)

      return result
    }
  }

  getMetrics() {
    return Object.fromEntries(this.metrics)
  }

  reset() {
    this.metrics.clear()
  }
}

const profiler = new FilterProfiler()

// Usage
const profiledFilter = profiler.profile('user_button_filter', complexFilter)
```

## Best Practices

### Filter Efficiency

```js
// Good: Fast checks first
const efficientFilter = (interaction) =>
  interaction.user.id === userId && // Fast string comparison
  interaction.isButton() &&         // Fast type check
  interaction.customId.startsWith('allowed_') // Fast string operation

// Avoid: Expensive operations in filters
const inefficientFilter = (interaction) => {
  // Database calls in filter - BAD!
  return interaction.user.id === userId &&
         checkDatabasePermission(interaction.user.id) // Slow!
}
```

### Filter Reusability

```js
// Good: Reusable filter factory
const createUserInteractionFilter = (userId, componentType) => (interaction) =>
  interaction.user.id === userId &&
  interaction.componentType === componentType

// Usage
const aliceButtonFilter = createUserInteractionFilter('alice_id', 'BUTTON')
const bobSelectFilter = createUserInteractionFilter('bob_id', 'SELECT_MENU')
```

### Error Handling in Filters

```js
// Good: Safe filters with error handling
const safeFilter = (interaction) => {
  try {
    return interaction.user &&
           interaction.user.id === targetUserId &&
           interaction.isButton()
  } catch (error) {
    console.error('Filter error:', error)
    return false // Reject on error
  }
}
```

## Next Steps

- [Performance](/collectors/performance) - Scaling and optimization strategies