# Component Systems Overview

Component systems enable complex, interactive user experiences in Discord.js bots. This section covers scalable patterns for building component-based architectures that handle state, routing, and user interactions safely.

## Core Concepts

### Component Lifecycle

1. **Creation**: Components are defined and sent in messages
2. **Interaction**: Users click buttons or select options
3. **Processing**: Bot receives and processes the interaction
4. **Response**: Bot updates the message or responds
5. **Cleanup**: Components expire or are manually removed

### State Management

Components need to track:
- User session data
- Interaction context
- Temporary state
- Validation status

### Routing System

Components use `customId` fields for routing:
```
prefix:action:target:context:security
```

## Basic Component System

### Simple State Management

```js
class ComponentManager {
  constructor() {
    this.states = new Map()
  }

  createState(userId, componentId, initialData = {}) {
    const stateId = `${userId}:${componentId}:${Date.now()}`
    const state = {
      id: stateId,
      userId,
      data: initialData,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 60 * 1000)
    }

    this.states.set(stateId, state)
    return state
  }

  getState(stateId) {
    const state = this.states.get(stateId)
    if (!state || Date.now() > state.expiresAt) {
      this.states.delete(stateId)
      return null
    }
    return state
  }

  updateState(stateId, updates) {
    const state = this.getState(stateId)
    if (!state) return false

    Object.assign(state.data, updates)
    return true
  }

  cleanup() {
    const now = Date.now()
    for (const [id, state] of this.states) {
      if (now > state.expiresAt) {
        this.states.delete(id)
      }
    }
  }
}
```

### Component Routing

```js
class ComponentRouter {
  constructor() {
    this.routes = new Map()
  }

  register(route, handler) {
    this.routes.set(route, handler)
  }

  async handle(interaction) {
    const [action, userId, ...rest] = interaction.customId.split(':')

    if (userId !== interaction.user.id) {
      return await interaction.reply({
        content: 'This component is not for you.',
        ephemeral: true
      })
    }

    const handler = this.routes.get(action)
    if (!handler) {
      return await interaction.reply({
        content: 'Unknown component action.',
        ephemeral: true
      })
    }

    try {
      await handler(interaction)
    } catch (error) {
      console.error('Component handler error:', error)
      await safeErrorResponse(interaction)
    }
  }
}

const router = new ComponentRouter()
router.register('menu', handleMenuAction)
router.register('form', handleFormSubmit)

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    await router.handle(interaction)
  }
})
```

## Security Considerations

### Custom ID Validation

```js
function validateCustomId(customId, interaction) {
  const parts = customId.split(':')

  if (parts.length < 3) {
    throw new SecurityError('Invalid custom ID format')
  }

  const [action, userId, timestamp] = parts

  if (userId !== interaction.user.id) {
    throw new SecurityError('User mismatch')
  }

  if (timestamp) {
    const age = Date.now() - parseInt(timestamp)
    if (age > 30 * 60 * 1000) {
      throw new SecurityError('Component expired')
    }
  }

  return { action, userId, timestamp }
}
```

## Best Practices

### Consistent Custom ID Format
```js
const customId = `menu:select:${userId}:${timestamp}`
```

### Component State Management
```js
const state = componentManager.createState(interaction.user.id, 'wizard', {
  step: 1,
  data: {}
})
```

### Error Handling
```js
async function safeComponentHandler(interaction, handler) {
  try {
    await handler(interaction)
  } catch (error) {
    await safeErrorResponse(interaction)
  }
}
```

## Next Steps

- [Component Routing](/components/component-routing) - Advanced routing patterns
- [State Management](/components/state-management) - Managing component state
- [Security](/components/security) - Securing component interactions