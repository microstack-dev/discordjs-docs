# Data Consistency

Discord.js v14.25.1 data consistency patterns for production bots. This section covers transaction management, consistency guarantees, conflict resolution, and distributed data patterns for reliable Discord applications.

## Transaction Management

Ensuring atomic operations across multiple data stores.

### Multi-Store Transactions

```javascript
class MultiStoreTransactionManager {
  constructor(stores) {
    this.stores = stores // Array of data store managers
    this.activeTransactions = new Map()
  }

  async beginTransaction(name, options = {}) {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const transaction = {
      id: transactionId,
      name,
      participants: [],
      state: 'active',
      startedAt: Date.now(),
      timeout: options.timeout || 30000, // 30 seconds
      retries: options.retries || 3
    }

    // Start transaction on all stores
    for (const store of this.stores) {
      try {
        const participant = await store.beginTransaction(transactionId)
        transaction.participants.push({
          store,
          participant,
          state: 'active'
        })
      } catch (error) {
        console.error(`Failed to begin transaction on ${store.constructor.name}:`, error)
        await this.rollbackTransaction(transactionId)
        throw error
      }
    }

    this.activeTransactions.set(transactionId, transaction)

    // Set timeout
    setTimeout(() => {
      if (this.activeTransactions.has(transactionId)) {
        console.warn(`Transaction ${transactionId} timed out`)
        this.rollbackTransaction(transactionId)
      }
    }, transaction.timeout)

    return transactionId
  }

  async executeInTransaction(transactionId, operations) {
    const transaction = this.activeTransactions.get(transactionId)

    if (!transaction || transaction.state !== 'active') {
      throw new Error(`Invalid transaction: ${transactionId}`)
    }

    const results = []

    for (const operation of operations) {
      try {
        const result = await operation(transaction.participants)
        results.push(result)
      } catch (error) {
        console.error(`Transaction operation failed:`, error)
        await this.rollbackTransaction(transactionId)
        throw error
      }
    }

    return results
  }

  async commitTransaction(transactionId) {
    const transaction = this.activeTransactions.get(transactionId)

    if (!transaction || transaction.state !== 'active') {
      throw new Error(`Invalid transaction: ${transactionId}`)
    }

    // Two-phase commit
    try {
      // Phase 1: Prepare
      for (const participant of transaction.participants) {
        await participant.store.prepareCommit(participant.participant)
        participant.state = 'prepared'
      }

      // Phase 2: Commit
      for (const participant of transaction.participants) {
        await participant.store.commitTransaction(participant.participant)
        participant.state = 'committed'
      }

      transaction.state = 'committed'
      transaction.completedAt = Date.now()

      console.log(`Transaction ${transactionId} committed successfully`)
      this.activeTransactions.delete(transactionId)

      return transaction
    } catch (error) {
      console.error(`Transaction commit failed:`, error)
      await this.rollbackTransaction(transactionId)
      throw error
    }
  }

  async rollbackTransaction(transactionId) {
    const transaction = this.activeTransactions.get(transactionId)

    if (!transaction) return

    console.log(`Rolling back transaction ${transactionId}`)

    // Rollback all participants
    for (const participant of transaction.participants) {
      try {
        if (participant.state !== 'rolled_back') {
          await participant.store.rollbackTransaction(participant.participant)
          participant.state = 'rolled_back'
        }
      } catch (rollbackError) {
        console.error(`Rollback failed for participant:`, rollbackError)
        // Continue with other rollbacks
      }
    }

    transaction.state = 'rolled_back'
    transaction.completedAt = Date.now()

    this.activeTransactions.delete(transactionId)
  }

  async withTransaction(name, operations, options = {}) {
    const transactionId = await this.beginTransaction(name, options)

    try {
      const results = await this.executeInTransaction(transactionId, operations)
      await this.commitTransaction(transactionId)
      return results
    } catch (error) {
      await this.rollbackTransaction(transactionId)
      throw error
    }
  }

  getActiveTransactions() {
    const transactions = {}

    for (const [id, transaction] of this.activeTransactions) {
      transactions[id] = {
        name: transaction.name,
        state: transaction.state,
        startedAt: transaction.startedAt,
        duration: Date.now() - transaction.startedAt,
        participants: transaction.participants.length
      }
    }

    return transactions
  }

  async forceRollbackAll() {
    const transactionIds = Array.from(this.activeTransactions.keys())

    for (const transactionId of transactionIds) {
      await this.rollbackTransaction(transactionId)
    }
  }
}
```

### Saga Pattern for Complex Operations

```javascript
class SagaManager {
  constructor() {
    this.sagas = new Map()
    this.activeSagas = new Map()
  }

  defineSaga(name, steps) {
    this.sagas.set(name, {
      name,
      steps,
      compensations: new Map()
    })
  }

  async executeSaga(name, data = {}) {
    const saga = this.sagas.get(name)

    if (!saga) {
      throw new Error(`Saga ${name} not defined`)
    }

    const sagaInstance = {
      id: `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      state: 'running',
      currentStep: 0,
      completedSteps: [],
      data,
      startedAt: Date.now()
    }

    this.activeSagas.set(sagaInstance.id, sagaInstance)

    try {
      for (let i = 0; i < saga.steps.length; i++) {
        sagaInstance.currentStep = i
        const step = saga.steps[i]

        console.log(`Executing saga step ${i + 1}/${saga.steps.length}: ${step.name}`)

        const result = await step.execute(sagaInstance.data)

        sagaInstance.completedSteps.push({
          step: i,
          name: step.name,
          result,
          executedAt: Date.now()
        })

        // Store compensation function
        if (step.compensate) {
          saga.compensations.set(i, step.compensate)
        }
      }

      sagaInstance.state = 'completed'
      sagaInstance.completedAt = Date.now()

      console.log(`Saga ${name} completed successfully`)
      return sagaInstance

    } catch (error) {
      console.error(`Saga ${name} failed at step ${sagaInstance.currentStep}:`, error)

      // Execute compensations in reverse order
      await this.compensateSaga(sagaInstance, saga)

      sagaInstance.state = 'failed'
      sagaInstance.error = error.message
      sagaInstance.failedAt = Date.now()

      throw error
    } finally {
      this.activeSagas.delete(sagaInstance.id)
    }
  }

  async compensateSaga(sagaInstance, saga) {
    console.log(`Compensating saga ${sagaInstance.name}`)

    // Execute compensations in reverse order
    for (let i = sagaInstance.completedSteps.length - 1; i >= 0; i--) {
      const completedStep = sagaInstance.completedSteps[i]
      const compensation = saga.compensations.get(completedStep.step)

      if (compensation) {
        try {
          console.log(`Executing compensation for step ${completedStep.step}: ${completedStep.name}`)
          await compensation(sagaInstance.data, completedStep.result)
        } catch (compensationError) {
          console.error(`Compensation failed for step ${completedStep.step}:`, compensationError)
          // Continue with other compensations
        }
      }
    }
  }

  getActiveSagas() {
    const sagas = {}

    for (const [id, saga] of this.activeSagas) {
      sagas[id] = {
        name: saga.name,
        state: saga.state,
        currentStep: saga.currentStep,
        startedAt: saga.startedAt,
        duration: Date.now() - saga.startedAt
      }
    }

    return sagas
  }
}

// Example Discord bot saga
const sagaManager = new SagaManager()

sagaManager.defineSaga('create_guild_backup', [
  {
    name: 'validate_permissions',
    execute: async (data) => {
      // Check if bot has permissions to create backup
      return true
    }
  },
  {
    name: 'create_backup_record',
    execute: async (data) => {
      // Create backup record in database
      return { backupId: 'backup_123' }
    },
    compensate: async (data, result) => {
      // Delete backup record
      console.log('Deleting backup record:', result.backupId)
    }
  },
  {
    name: 'export_guild_data',
    execute: async (data) => {
      // Export all guild data
      return { exportedData: 'large_data_blob' }
    },
    compensate: async (data, result) => {
      // Clean up exported data
      console.log('Cleaning up exported data')
    }
  },
  {
    name: 'upload_to_storage',
    execute: async (data) => {
      // Upload backup to cloud storage
      return { storageUrl: 'https://storage.example.com/backup_123' }
    },
    compensate: async (data, result) => {
      // Delete from cloud storage
      console.log('Deleting from storage:', result.storageUrl)
    }
  }
])
```

## Consistency Guarantees

Implementing different consistency levels for various operations.

### Eventual Consistency Manager

```javascript
class EventualConsistencyManager {
  constructor(redis, database) {
    this.redis = redis
    this.database = database
    this.pendingUpdates = new Map()
    this.consistencyQueues = new Map()

    this.startConsistencyWorker()
  }

  async writeWithEventualConsistency(key, data, options = {}) {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Write to fast store (Redis) immediately
    await this.redis.set(key, data, options.ttl)

    // Queue for eventual write to primary store
    const pendingOperation = {
      id: operationId,
      key,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: options.maxRetries || 3
    }

    this.pendingUpdates.set(operationId, pendingOperation)

    // Add to consistency queue
    const queueKey = options.queue || 'default'
    if (!this.consistencyQueues.has(queueKey)) {
      this.consistencyQueues.set(queueKey, [])
    }
    this.consistencyQueues.get(queueKey).push(operationId)

    return operationId
  }

  async readWithConsistencyCheck(key, options = {}) {
    const redisData = await this.redis.get(key)

    if (!redisData) {
      // Data not in cache, read from primary store
      return await this.database.get(key)
    }

    // Check if data is consistent
    if (options.checkConsistency) {
      const dbData = await this.database.get(key)

      if (this.compareData(redisData, dbData)) {
        return redisData
      } else {
        // Data inconsistent, return database version and fix cache
        await this.redis.set(key, dbData)
        return dbData
      }
    }

    return redisData
  }

  compareData(data1, data2) {
    // Simple comparison - in practice you'd want more sophisticated comparison
    return JSON.stringify(data1) === JSON.stringify(data2)
  }

  startConsistencyWorker() {
    setInterval(async () => {
      await this.processConsistencyQueues()
    }, 5000) // Process every 5 seconds
  }

  async processConsistencyQueues() {
    for (const [queueName, operationIds] of this.consistencyQueues) {
      if (operationIds.length === 0) continue

      const batchSize = 10 // Process 10 operations at a time
      const batch = operationIds.splice(0, batchSize)

      await this.processBatch(batch)
    }
  }

  async processBatch(operationIds) {
    const operations = operationIds
      .map(id => this.pendingUpdates.get(id))
      .filter(op => op !== undefined)

    if (operations.length === 0) return

    try {
      // Batch write to database
      await this.database.bulkWrite(operations.map(op => ({
        key: op.key,
        data: op.data
      })))

      // Remove completed operations
      operations.forEach(op => {
        this.pendingUpdates.delete(op.id)
      })

      console.log(`Processed ${operations.length} eventual consistency operations`)
    } catch (error) {
      console.error('Batch consistency operation failed:', error)

      // Handle retries
      for (const operation of operations) {
        operation.retries++

        if (operation.retries >= operation.maxRetries) {
          console.error(`Operation ${operation.id} failed permanently`)
          this.pendingUpdates.delete(operation.id)
        } else {
          // Re-queue for retry
          const queueKey = 'default' // Would need to track original queue
          this.consistencyQueues.get(queueKey).push(operation.id)
        }
      }
    }
  }

  getConsistencyStats() {
    return {
      pendingUpdates: this.pendingUpdates.size,
      queues: Object.fromEntries(
        Array.from(this.consistencyQueues.entries()).map(([name, queue]) => [name, queue.length])
      )
    }
  }
}
```

### Strong Consistency Operations

```javascript
class StrongConsistencyManager {
  constructor(database, options = {}) {
    this.database = database
    this.lockTimeout = options.lockTimeout || 30000
    this.maxRetries = options.maxRetries || 3
    this.activeLocks = new Map()
  }

  async executeWithLock(key, operation, options = {}) {
    const lockId = `lock_${key}_${Date.now()}`
    const timeout = options.timeout || this.lockTimeout

    // Acquire lock
    const lockAcquired = await this.acquireLock(key, lockId, timeout)

    if (!lockAcquired) {
      throw new Error(`Failed to acquire lock for key: ${key}`)
    }

    try {
      // Execute operation
      const result = await operation()

      return result
    } finally {
      // Release lock
      await this.releaseLock(key, lockId)
    }
  }

  async acquireLock(key, lockId, timeout) {
    const lockKey = `lock:${key}`

    // Try to acquire lock using Redis SET NX
    const acquired = await this.database.redis.set(
      lockKey,
      lockId,
      'PX', // Expire
      timeout,
      'NX'  // Only if not exists
    )

    if (acquired) {
      this.activeLocks.set(lockId, {
        key,
        acquiredAt: Date.now(),
        timeout
      })

      return true
    }

    return false
  }

  async releaseLock(key, lockId) {
    const lockKey = `lock:${key}`

    // Use Lua script to ensure we only release our own lock
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `

    await this.database.redis.eval(script, 1, lockKey, lockId)
    this.activeLocks.delete(lockId)
  }

  async executeWithOptimisticLock(key, currentVersion, operation) {
    let retries = 0

    while (retries < this.maxRetries) {
      try {
        // Read current data
        const currentData = await this.database.get(key)

        if (currentData.version !== currentVersion) {
          throw new Error('Data version mismatch - concurrent modification detected')
        }

        // Execute operation
        const result = await operation(currentData)

        // Write with version check
        const newVersion = currentVersion + 1
        result.version = newVersion

        await this.database.update(key, result, {
          where: { version: currentVersion }
        })

        return result
      } catch (error) {
        if (error.message.includes('version mismatch') && retries < this.maxRetries - 1) {
          retries++
          // Exponential backoff
          await this.delay(Math.pow(2, retries) * 100)
          continue
        }

        throw error
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getLockStats() {
    return {
      activeLocks: this.activeLocks.size,
      locks: Array.from(this.activeLocks.values()).map(lock => ({
        key: lock.key,
        acquiredAt: lock.acquiredAt,
        timeout: lock.timeout
      }))
    }
  }
}
```

## Conflict Resolution

Handling concurrent data modifications and conflicts.

### Conflict Detection and Resolution

```javascript
class ConflictResolutionManager {
  constructor(database) {
    this.database = database
    this.conflictStrategies = new Map()
    this.conflictHistory = []

    this.setupDefaultStrategies()
  }

  setupDefaultStrategies() {
    this.registerStrategy('last_write_wins', this.lastWriteWinsStrategy.bind(this))
    this.registerStrategy('merge_fields', this.mergeFieldsStrategy.bind(this))
    this.registerStrategy('manual_resolution', this.manualResolutionStrategy.bind(this))
    this.registerStrategy('version_based', this.versionBasedStrategy.bind(this))
  }

  registerStrategy(name, strategy) {
    this.conflictStrategies.set(name, strategy)
  }

  async resolveConflict(conflict, strategy = 'last_write_wins') {
    const resolutionStrategy = this.conflictStrategies.get(strategy)

    if (!resolutionStrategy) {
      throw new Error(`Unknown conflict resolution strategy: ${strategy}`)
    }

    try {
      const resolved = await resolutionStrategy(conflict)

      // Log resolution
      this.conflictHistory.push({
        conflict,
        strategy,
        resolved,
        timestamp: Date.now()
      })

      // Keep only last 1000 conflicts
      if (this.conflictHistory.length > 1000) {
        this.conflictHistory.shift()
      }

      return resolved
    } catch (error) {
      console.error('Conflict resolution failed:', error)
      throw error
    }
  }

  async lastWriteWinsStrategy(conflict) {
    // Choose the most recent write
    const { local, remote } = conflict

    if (local.updatedAt > remote.updatedAt) {
      return { resolved: local, winner: 'local' }
    } else {
      return { resolved: remote, winner: 'remote' }
    }
  }

  async mergeFieldsStrategy(conflict) {
    // Merge non-conflicting fields, prefer local for conflicts
    const { local, remote } = conflict
    const merged = { ...remote } // Start with remote

    // Merge local fields that don't conflict
    for (const [key, value] of Object.entries(local)) {
      if (!(key in merged) || merged[key] === remote[key]) {
        merged[key] = value
      }
      // For conflicting fields, keep remote (could be configurable)
    }

    merged.updatedAt = Math.max(local.updatedAt, remote.updatedAt)
    merged.conflictResolved = true

    return { resolved: merged, winner: 'merged' }
  }

  async manualResolutionStrategy(conflict) {
    // Store conflict for manual resolution
    const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await this.database.create('conflicts', {
      id: conflictId,
      conflict,
      status: 'pending',
      createdAt: new Date()
    })

    // In a real system, this would notify administrators
    console.log(`Conflict ${conflictId} requires manual resolution`)

    return { resolved: null, winner: 'manual', conflictId }
  }

  async versionBasedStrategy(conflict) {
    // Use version numbers to resolve conflicts
    const { local, remote } = conflict

    if (local.version > remote.version) {
      return { resolved: local, winner: 'local' }
    } else if (remote.version > local.version) {
      return { resolved: remote, winner: 'remote' }
    } else {
      // Same version - fall back to timestamp
      return await this.lastWriteWinsStrategy(conflict)
    }
  }

  async detectAndResolveConflicts(key, localData, remoteData, strategy = 'last_write_wins') {
    // Simple conflict detection - check if data differs
    if (JSON.stringify(localData) === JSON.stringify(remoteData)) {
      return { resolved: localData, hadConflict: false }
    }

    const conflict = {
      key,
      local: localData,
      remote: remoteData,
      detectedAt: Date.now()
    }

    const resolution = await this.resolveConflict(conflict, strategy)

    return {
      resolved: resolution.resolved,
      hadConflict: true,
      winner: resolution.winner,
      conflictId: resolution.conflictId
    }
  }

  getConflictStats() {
    const strategyStats = {}

    for (const conflict of this.conflictHistory) {
      const strategy = conflict.strategy
      if (!strategyStats[strategy]) {
        strategyStats[strategy] = 0
      }
      strategyStats[strategy]++
    }

    return {
      totalConflicts: this.conflictHistory.length,
      strategiesUsed: strategyStats,
      recentConflicts: this.conflictHistory.slice(-10)
    }
  }
}
```

### Distributed Consistency Patterns

```javascript
class DistributedConsistencyManager {
  constructor(nodes) {
    this.nodes = nodes // Array of database nodes
    this.consistencyLevel = 'quorum' // one, quorum, all
    this.nodeStates = new Map()
    this.heartbeatInterval = 5000

    this.startHeartbeat()
  }

  startHeartbeat() {
    setInterval(async () => {
      await this.checkNodeHealth()
    }, this.heartbeatInterval)
  }

  async checkNodeHealth() {
    const healthChecks = await Promise.allSettled(
      this.nodes.map(node => this.pingNode(node))
    )

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i]
      const health = healthChecks[i]

      this.nodeStates.set(node.id, {
        healthy: health.status === 'fulfilled',
        lastChecked: Date.now(),
        responseTime: health.status === 'fulfilled' ? health.value : Infinity
      })
    }
  }

  async pingNode(node) {
    const startTime = Date.now()
    // Implement actual health check
    await new Promise(resolve => setTimeout(resolve, 100)) // Simulated
    return Date.now() - startTime
  }

  getHealthyNodes() {
    return this.nodes.filter(node => {
      const state = this.nodeStates.get(node.id)
      return state && state.healthy
    })
  }

  async writeWithConsistency(key, data, options = {}) {
    const consistency = options.consistency || this.consistencyLevel
    const healthyNodes = this.getHealthyNodes()

    if (healthyNodes.length === 0) {
      throw new Error('No healthy nodes available')
    }

    const requiredWrites = this.calculateRequiredWrites(consistency, healthyNodes.length)

    // Write to required number of nodes
    const writePromises = healthyNodes
      .slice(0, requiredWrites)
      .map(node => this.writeToNode(node, key, data))

    const results = await Promise.allSettled(writePromises)
    const successfulWrites = results.filter(r => r.status === 'fulfilled').length

    if (successfulWrites < requiredWrites) {
      throw new Error(`Failed to achieve consistency level ${consistency}: ${successfulWrites}/${requiredWrites} writes succeeded`)
    }

    return { successfulWrites, totalNodes: healthyNodes.length }
  }

  async readWithConsistency(key, options = {}) {
    const consistency = options.consistency || this.consistencyLevel
    const healthyNodes = this.getHealthyNodes()

    const requiredReads = this.calculateRequiredReads(consistency, healthyNodes.length)

    // Read from required number of nodes
    const readPromises = healthyNodes
      .slice(0, requiredReads)
      .map(node => this.readFromNode(node, key))

    const results = await Promise.allSettled(readPromises)
    const successfulReads = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)

    if (successfulReads.length < requiredReads) {
      throw new Error(`Failed to achieve consistency level ${consistency}: ${successfulReads.length}/${requiredReads} reads succeeded`)
    }

    // Resolve any conflicts between read results
    const resolvedData = await this.resolveReadConflicts(successfulReads)

    return resolvedData
  }

  calculateRequiredWrites(consistency, totalNodes) {
    switch (consistency) {
      case 'one': return 1
      case 'quorum': return Math.floor(totalNodes / 2) + 1
      case 'all': return totalNodes
      default: return 1
    }
  }

  calculateRequiredReads(consistency, totalNodes) {
    return this.calculateRequiredWrites(consistency, totalNodes)
  }

  async writeToNode(node, key, data) {
    // Implement actual write to node
    console.log(`Writing to node ${node.id}: ${key}`)
    // Simulated async operation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
    return true
  }

  async readFromNode(node, key) {
    // Implement actual read from node
    console.log(`Reading from node ${node.id}: ${key}`)
    // Simulated async operation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
    return { data: `data_from_${node.id}`, timestamp: Date.now() }
  }

  async resolveReadConflicts(readResults) {
    if (readResults.length === 1) {
      return readResults[0]
    }

    // Simple conflict resolution - pick most recent
    return readResults.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    )
  }

  getClusterStats() {
    const healthyNodes = this.getHealthyNodes()

    return {
      totalNodes: this.nodes.length,
      healthyNodes: healthyNodes.length,
      consistencyLevel: this.consistencyLevel,
      nodeStates: Object.fromEntries(this.nodeStates)
    }
  }
}
```

## Best Practices

### Implementation Guidelines

1. **Choose appropriate consistency levels** based on operation requirements
2. **Implement transaction boundaries** carefully to avoid deadlocks
3. **Use sagas for complex operations** spanning multiple services
4. **Implement conflict resolution strategies** for concurrent modifications
5. **Monitor data consistency** with regular health checks
6. **Use eventual consistency** for performance-critical operations
7. **Implement proper locking mechanisms** to prevent race conditions
8. **Handle distributed transactions** with two-phase commit when necessary
9. **Log consistency violations** for debugging and monitoring
10. **Test consistency scenarios** under various failure conditions

### Production Considerations

```javascript
// Complete data consistency management system
class ProductionConsistencyManager {
  constructor(options = {}) {
    this.options = options

    // Core components
    this.transactionManager = new MultiStoreTransactionManager(options.stores || [])
    this.sagaManager = new SagaManager()
    this.eventualConsistency = new EventualConsistencyManager(options.redis, options.database)
    this.strongConsistency = new StrongConsistencyManager(options.database)
    this.conflictManager = new ConflictResolutionManager(options.database)
    this.distributedConsistency = new DistributedConsistencyManager(options.nodes || [])

    // Stats
    this.stats = {
      transactionsStarted: 0,
      transactionsCommitted: 0,
      transactionsRolledBack: 0,
      sagasExecuted: 0,
      conflictsResolved: 0
    }
  }

  async executeConsistentOperation(operationType, data, options = {}) {
    switch (operationType) {
      case 'transaction':
        return await this.executeInTransaction(data.operations, options)

      case 'saga':
        return await this.executeSaga(data.sagaName, data.sagaData, options)

      case 'eventual':
        return await this.writeEventually(data.key, data.value, options)

      case 'strong':
        return await this.executeWithStrongConsistency(data.key, data.operation, options)

      default:
        throw new Error(`Unknown operation type: ${operationType}`)
    }
  }

  async executeInTransaction(operations, options = {}) {
    this.stats.transactionsStarted++

    try {
      const result = await this.transactionManager.withTransaction(
        options.name || 'default',
        operations,
        options
      )

      this.stats.transactionsCommitted++
      return result
    } catch (error) {
      this.stats.transactionsRolledBack++
      throw error
    }
  }

  async executeSaga(sagaName, sagaData, options = {}) {
    this.stats.sagasExecuted++

    return await this.sagaManager.executeSaga(sagaName, sagaData)
  }

  async writeEventually(key, value, options = {}) {
    return await this.eventualConsistency.writeWithEventualConsistency(key, value, options)
  }

  async executeWithStrongConsistency(key, operation, options = {}) {
    return await this.strongConsistency.executeWithLock(key, operation, options)
  }

  async resolveDataConflict(conflict, strategy = 'last_write_wins') {
    this.stats.conflictsResolved++

    return await this.conflictManager.resolveConflict(conflict, strategy)
  }

  async readWithConsistency(key, options = {}) {
    return await this.distributedConsistency.readWithConsistency(key, options)
  }

  async writeWithConsistency(key, data, options = {}) {
    return await this.distributedConsistency.writeWithConsistency(key, data, options)
  }

  defineSaga(name, steps) {
    this.sagaManager.defineSaga(name, steps)
  }

  getSystemStats() {
    return {
      ...this.stats,
      transactions: this.transactionManager.getActiveTransactions(),
      sagas: this.sagaManager.getActiveSagas(),
      eventualConsistency: this.eventualConsistency.getConsistencyStats(),
      strongConsistency: this.strongConsistency.getLockStats(),
      conflicts: this.conflictManager.getConflictStats(),
      distributed: this.distributedConsistency.getClusterStats()
    }
  }

  async gracefulShutdown() {
    console.log('Starting consistency manager shutdown...')

    // Rollback active transactions
    await this.transactionManager.forceRollbackAll()

    // Clean up other resources
    // Implementation depends on specific cleanup needs

    console.log('Consistency manager shutdown complete')
  }
}
```

This comprehensive data consistency management system provides multiple consistency levels, conflict resolution, and distributed transaction support for production Discord bots with robust error handling and monitoring capabilities.