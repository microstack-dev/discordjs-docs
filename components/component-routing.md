# Component Routing

Component routing enables scalable, maintainable interaction handling through structured custom ID patterns. This page covers advanced routing techniques for complex component systems.

## Routing Fundamentals

### Custom ID Structure

Components use `customId` for routing information:

```
prefix:action:target:context:security
```

Example: `menu:select:user_123:poll_456:timestamp_1234567890`

### Route Registration

```js
class ComponentRouter {
  constructor() {
    this.routes = new Map()
    this.middlewares = []
  }

  on(routePattern, handler) {
    this.routes.set(routePattern, handler)
  }

  use(middleware) {
    this.middlewares.push(middleware)
  }

  matchesPattern(customId, pattern) {
    const customParts = customId.split(':')
    const patternParts = pattern.split(':')

    if (customParts.length !== patternParts.length) {
      return false
    }

    return patternParts.every((part, index) =>
      part === '*' || part === customParts[index]
    )
  }

  findRoute(customId) {
    for (const [pattern, handler] of this.routes) {
      if (this.matchesPattern(customId, pattern)) {
        return { handler, pattern }
      }
    }
    return null
  }

  async handle(interaction) {
    for (const middleware of this.middlewares) {
      const result = await middleware(interaction)
      if (result === false) return
    }

    const route = this.findRoute(interaction.customId)
    if (!route) {
      return await interaction.reply({
        content: 'Unknown component action.',
        ephemeral: true
      })
    }

    try {
      await route.handler(interaction)
    } catch (error) {
      console.error(`Route handler error for ${route.pattern}:`, error)
      await safeErrorResponse(interaction)
    }
  }
}

const router = new ComponentRouter()

router.on('menu:*:user_*:poll_*', handleMenuAction)
router.on('form:submit:user_*', handleFormSubmit)
router.on('admin:*:user_*', handleAdminAction)
```

## Advanced Routing Patterns

### Hierarchical Routing

```js
class HierarchicalRouter {
  constructor() {
    this.routes = new Map()
  }

  register(path, handler) {
    const segments = path.split('/').filter(Boolean)
    let current = this.routes

    for (const segment of segments) {
      if (!current.has(segment)) {
        current.set(segment, new Map())
      }
      current = current.get(segment)
    }

    current.set('__handler__', handler)
  }

  async resolve(interaction) {
    const segments = interaction.customId.split(':')
    let current = this.routes
    let handler = null

    for (const segment of segments) {
      if (current.has(segment)) {
        current = current.get(segment)
        if (current.has('__handler__')) {
          handler = current.get('__handler__')
        }
      } else if (current.has('*')) {
        current = current.get('*')
        if (current.has('__handler__')) {
          handler = current.get('__handler__')
        }
      } else {
        break
      }
    }

    if (handler) {
      await handler(interaction)
    } else {
      await interaction.reply({
        content: 'Route not found.',
        ephemeral: true
      })
    }
  }
}

const hierRouter = new HierarchicalRouter()
hierRouter.register('menu/select/poll', handlePollMenu)
hierRouter.register('menu/select/user', handleUserMenu)
hierRouter.register('admin/*/user', handleAdminUser)
```

### Context-Aware Routing

```js
class ContextRouter {
  constructor() {
    this.routes = new Map()
    this.contexts = new Map()
  }

  register(route, handler, requiredContext = []) {
    this.routes.set(route, { handler, requiredContext })
  }

  setContext(interactionId, context) {
    this.contexts.set(interactionId, context)
  }

  async handle(interaction) {
    const route = this.routes.get(interaction.customId)
    if (!route) {
      return await interaction.reply({
        content: 'Unknown route.',
        ephemeral: true
      })
    }

    const context = this.contexts.get(interaction.id) || {}
    const missingContext = route.requiredContext.filter(key => !(key in context))

    if (missingContext.length > 0) {
      return await interaction.reply({
        content: `Missing context: ${missingContext.join(', ')}`,
        ephemeral: true
      })
    }

    try {
      await route.handler(interaction, context)
    } finally {
      this.contexts.delete(interaction.id)
    }
  }
}

const ctxRouter = new ContextRouter()
ctxRouter.register('form:submit', handleFormSubmit, ['userId', 'formType'])
ctxRouter.register('menu:select', handleMenuSelect, ['menuType'])
```

## Security Routing

### Authentication Middleware

```js
class SecureRouter {
  constructor() {
    this.routes = new Map()
    this.authMiddleware = []
  }

  useAuth(middleware) {
    this.authMiddleware.push(middleware)
  }

  register(route, handler, options = {}) {
    this.routes.set(route, { handler, options })
  }

  async authenticate(interaction) {
    for (const middleware of this.authMiddleware) {
      const result = await middleware(interaction)
      if (!result.allowed) {
        await interaction.reply({
          content: result.message || 'Access denied.',
          ephemeral: true
        })
        return false
      }
    }
    return true
  }

  parseCustomId(customId) {
    const parts = customId.split(':')
    return {
      action: parts[0],
      target: parts[1],
      userId: parts[2],
      timestamp: parts[3] ? parseInt(parts[3]) : null,
      signature: parts[4]
    }
  }

  async handle(interaction) {
    if (!(await this.authenticate(interaction))) {
      return
    }

    const parsed = this.parseCustomId(interaction.customId)
    if (!parsed) {
      throw new SecurityError('Invalid custom ID')
    }

    if (parsed.userId && parsed.userId !== interaction.user.id) {
      throw new SecurityError('Ownership violation')
    }

    if (parsed.timestamp) {
      const age = Date.now() - parsed.timestamp
      if (age > 30 * 60 * 1000) {
        throw new SecurityError('Component expired')
      }
    }

    const route = this.routes.get(`${parsed.action}:${parsed.target}`)
    if (!route) {
      throw new SecurityError('Unknown action')
    }

    if (route.options.permission) {
      const hasPermission = await checkPermission(interaction, route.options.permission)
      if (!hasPermission) {
        throw new SecurityError('Insufficient permissions')
      }
    }

    try {
      await route.handler(interaction, parsed)
    } catch (error) {
      await handleSecurityError(interaction, error)
    }
  }
}
```

## Performance Optimization

### Route Caching

```js
class CachedRouter {
  constructor() {
    this.routes = new Map()
    this.routeCache = new Map()
    this.cacheSize = 1000
  }

  register(pattern, handler) {
    this.routes.set(pattern, handler)
  }

  getCachedRoute(customId) {
    return this.routeCache.get(customId)
  }

  cacheRoute(customId, route) {
    if (this.routeCache.size >= this.cacheSize) {
      const firstKey = this.routeCache.keys().next().value
      this.routeCache.delete(firstKey)
    }

    this.routeCache.set(customId, route)
  }

  findRoute(customId) {
    let route = this.getCachedRoute(customId)
    if (route) return route

    for (const [pattern, handler] of this.routes) {
      if (matchesPattern(customId, pattern)) {
        route = { pattern, handler }
        this.cacheRoute(customId, route)
        return route
      }
    }

    return null
  }

  async handle(interaction) {
    const route = this.findRoute(interaction.customId)

    if (!route) {
      return await interaction.reply({
        content: 'Route not found.',
        ephemeral: true
      })
    }

    try {
      await route.handler(interaction)
    } catch (error) {
      console.error(`Route error for ${route.pattern}:`, error)
      await safeErrorResponse(interaction)
    }
  }
}
```

## Best Practices

### Consistent Custom ID Format
```js
const customId = `menu:select:${userId}:${timestamp}:${signature}`
```

### Route Organization
```js
const routes = {
  menu: { select: handleMenuSelect, close: handleMenuClose },
  form: { submit: handleFormSubmit, cancel: handleFormCancel }
}
```

### Error Handling
```js
async function safeRouteHandler(interaction, handler) {
  try {
    await handler(interaction)
  } catch (error) {
    console.error('Route handler error:', error)
    await safeErrorResponse(interaction)
  }
}
```

## Next Steps

- [State Management](/components/state-management) - Managing component state
- [Security](/components/security) - Securing component interactions