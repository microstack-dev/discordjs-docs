# State Management

Effective state management is crucial for complex component interactions. This page covers patterns for tracking, updating, and cleaning up component state across multi-step interactions.

## State Fundamentals

### State Types
- **Ephemeral State**: Short-lived, user-specific data
- **Persistent State**: Long-term data stored in database
- **Shared State**: Data accessible across multiple users
- **Component State**: UI-specific state for components

### State Lifecycle
1. **Creation**: State initialized when component is created
2. **Updates**: State modified through user interactions
3. **Expiration**: State automatically cleaned up
4. **Cleanup**: Manual removal when no longer needed

## Ephemeral State Management

### In-Memory State Store

```js
class EphemeralStateManager {
  constructor() {
    this.states = new Map()
    this.maxStates = 10000
    this.defaultTtl = 30 * 60 * 1000
  }

  createState(userId, componentId, initialData = {}, ttl = null) {
    const stateId = `${userId}:${componentId}:${Date.now()}`
    const state = {
      id: stateId,
      userId,
      componentId,
      data: initialData,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + (ttl || this.defaultTtl)
    }

    if (this.states.size >= this.maxStates) {
      this.evictOldest()
    }

    this.states.set(stateId, state)
    return state
  }

  getState(stateId) {
    const state = this.states.get(stateId)
    if (!state) return null

    if (Date.now() > state.expiresAt) {
      this.states.delete(stateId)
      return null
    }

    state.lastActivity = Date.now()
    return state
  }

  updateState(stateId, updates) {
    const state = this.getState(stateId)
    if (!state) return false

    Object.assign(state.data, updates)
    state.lastActivity = Date.now()
    return true
  }

  deleteState(stateId) {
    return this.states.delete(stateId)
  }

  evictOldest() {
    let oldest = null
    let oldestTime = Date.now()

    for (const [id, state] of this.states) {
      if (state.lastActivity < oldestTime) {
        oldest = id
        oldestTime = state.lastActivity
      }
    }

    if (oldest) {
      this.states.delete(oldest)
    }
  }

  cleanup() {
    const now = Date.now()
    const toRemove = []

    for (const [id, state] of this.states) {
      if (now > state.expiresAt) {
        toRemove.push(id)
      }
    }

    toRemove.forEach(id => this.states.delete(id))
    return toRemove.length
  }

  getStats() {
    return {
      totalStates: this.states.size,
      maxStates: this.maxStates,
      defaultTtl: this.defaultTtl
    }
  }
}

const stateManager = new EphemeralStateManager()
setInterval(() => stateManager.cleanup(), 5 * 60 * 1000)
```

## Component State Patterns

### Wizard State Management

```js
class WizardManager {
  constructor(stateManager) {
    this.stateManager = stateManager
  }

  startWizard(userId, wizardType, initialData = {}) {
    const state = this.stateManager.createState(userId, `wizard_${wizardType}`, {
      step: 1,
      wizardType,
      ...initialData
    })

    this.stateManager.updateState(state.id, state.data)
    return state
  }

  async nextStep(interaction, stateId) {
    const state = this.stateManager.getState(stateId)
    if (!state) {
      return await interaction.reply({
        content: 'Wizard session expired.',
        ephemeral: true
      })
    }

    state.data.step++
    this.stateManager.updateState(stateId, state.data)
    return state
  }

  async completeWizard(stateId) {
    const state = this.stateManager.getState(stateId)
    if (!state) return null

    const result = { ...state.data }
    this.stateManager.deleteState(stateId)
    return result
  }
}
```

### Form State Management

```js
class FormManager {
  constructor(stateManager) {
    this.stateManager = stateManager
  }

  createForm(userId, formType, fields) {
    const state = this.stateManager.createState(userId, `form_${formType}`, {
      formType,
      fields: {},
      completedFields: []
    })

    fields.forEach(field => {
      state.data.fields[field.id] = {
        id: field.id,
        value: null,
        required: field.required,
        valid: !field.required
      }
    })

    this.stateManager.updateState(state.id, state.data)
    return state
  }

  updateField(stateId, fieldId, value) {
    const state = this.stateManager.getState(stateId)
    if (!state) return false

    const field = state.data.fields[fieldId]
    if (!field) return false

    field.value = value
    field.valid = this.validateField(field, value)

    if (field.valid && !state.data.completedFields.includes(fieldId)) {
      state.data.completedFields.push(fieldId)
    }

    this.stateManager.updateState(stateId, state.data)
    return true
  }

  isFormComplete(stateId) {
    const state = this.stateManager.getState(stateId)
    if (!state) return false

    return Object.values(state.data.fields).every(field =>
      field.valid && (!field.required || field.value !== null)
    )
  }

  validateField(field, value) {
    if (field.required && (value === null || value === '')) {
      return false
    }

    if (field.minLength && value && value.length < field.minLength) {
      return false
    }

    if (field.maxLength && value && value.length > field.maxLength) {
      return false
    }

    return true
  }
}
```

## Persistent State Management

### Database-Backed State

```js
class PersistentStateManager {
  constructor(database) {
    this.db = database
    this.cache = new Map()
    this.cacheTtl = 5 * 60 * 1000
  }

  async createPersistentState(userId, type, data = {}) {
    const state = {
      id: `${userId}:${type}:${Date.now()}`,
      userId,
      type,
      data,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await this.db.collection('component_states').insertOne(state)
    this.cache.set(state.id, { ...state, cachedAt: Date.now() })

    return state
  }

  async getPersistentState(stateId) {
    const cached = this.cache.get(stateId)
    if (cached && (Date.now() - cached.cachedAt) < this.cacheTtl) {
      return cached
    }

    const state = await this.db.collection('component_states').findOne({ id: stateId })
    if (state) {
      this.cache.set(stateId, { ...state, cachedAt: Date.now() })
    }

    return state
  }

  async updatePersistentState(stateId, updates) {
    const result = await this.db.collection('component_states').updateOne(
      { id: stateId },
      { $set: { ...updates, updatedAt: new Date() } }
    )

    if (result.modifiedCount > 0) {
      const cached = this.cache.get(stateId)
      if (cached) {
        Object.assign(cached, updates, { updatedAt: new Date() })
      }
    }

    return result.modifiedCount > 0
  }
}
```

## Best Practices

### State Size Management
```js
const minimalState = {
  step: 1,
  selectedOptions: ['option1'],
  userId: '123456789'
}
```

### State Expiration
```js
const expirationTimes = {
  form: 30 * 60 * 1000,
  wizard: 60 * 60 * 1000,
  poll: 24 * 60 * 60 * 1000,
  game: 6 * 60 * 60 * 1000
}
```

### State Validation
```js
function validateState(state) {
  return state.id && state.userId && typeof state.data === 'object' && Date.now() < state.expiresAt
}
```

## Next Steps

- [Security](/components/security) - Securing component interactions
- [Cleanup and Timeouts](/components/cleanup-and-timeouts) - Managing component lifecycles