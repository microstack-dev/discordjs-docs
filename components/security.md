# Component Security

Security is paramount for component interactions. This page covers preventing unauthorized access, spoofing attacks, and ensuring safe component usage.

## Security Fundamentals

### Component Threats
- **Spoofed Interactions**: Fake component IDs
- **Unauthorized Access**: Wrong user interacting
- **Expired Components**: Using old component states
- **Injection Attacks**: Malicious custom ID data
- **Rate Limiting Bypass**: Circumventing rate limits

### Security Principles
- **User Verification**: Only allow intended users
- **ID Validation**: Validate custom ID format and content
- **Expiration Checks**: Reject expired components
- **Permission Validation**: Check user permissions
- **Input Sanitization**: Clean all user inputs

## Custom ID Security

### Secure Custom ID Format

```js
class SecureComponentId {
  constructor(secret) {
    this.secret = secret
  }

  generate(action, userId, data = {}) {
    const timestamp = Date.now()
    const payload = `${action}:${userId}:${timestamp}:${JSON.stringify(data)}`
    const signature = crypto.createHmac('sha256', this.secret).update(payload).digest('hex').substring(0, 8)

    return `${action}:${userId}:${timestamp}:${signature}`
  }

  verify(customId) {
    const parts = customId.split(':')
    if (parts.length !== 4) return false

    const [action, userId, timestamp, signature] = parts
    const age = Date.now() - parseInt(timestamp)
    if (age > 30 * 60 * 1000) return false

    const payload = `${action}:${userId}:${timestamp}`
    const expectedSignature = crypto.createHmac('sha256', this.secret).update(payload).digest('hex').substring(0, 8)

    return signature === expectedSignature
  }
}
```

### Component ID Validation

```js
class ComponentValidator {
  constructor() {
    this.validators = new Map()
  }

  registerValidator(componentType, validator) {
    this.validators.set(componentType, validator)
  }

  async validate(interaction) {
    const customId = interaction.customId
    const parts = customId.split(':')

    if (parts.length < 3) {
      throw new SecurityError('Invalid custom ID format')
    }

    const [componentType, userId, ...rest] = parts

    if (userId !== interaction.user.id) {
      throw new SecurityError('Component ownership mismatch')
    }

    await this.checkRateLimit(interaction.user.id, componentType)

    const validator = this.validators.get(componentType)
    if (validator) {
      await validator(interaction, parts)
    }

    return true
  }

  async checkRateLimit(userId, componentType) {
    const key = `${userId}:${componentType}`
    const now = Date.now()
    const window = 60 * 1000
    const maxRequests = 10

    if (!this.rateLimits) this.rateLimits = new Map()

    const userRequests = this.rateLimits.get(key) || []
    const recentRequests = userRequests.filter(time => now - time < window)

    if (recentRequests.length >= maxRequests) {
      throw new SecurityError('Rate limit exceeded')
    }

    recentRequests.push(now)
    this.rateLimits.set(key, recentRequests)
  }
}
```

## Permission Validation

### Component-Level Permissions

```js
class ComponentPermissions {
  constructor() {
    this.permissions = new Map()
  }

  setPermission(componentType, requiredPermission) {
    this.permissions.set(componentType, requiredPermission)
  }

  async checkPermission(interaction, componentType) {
    const required = this.permissions.get(componentType)
    if (!required) return true

    const member = interaction.member
    if (!member) return false

    if (typeof required === 'string') {
      return member.permissions.has(required)
    }

    if (typeof required === 'function') {
      return await required(interaction)
    }

    return false
  }
}

const componentPerms = new ComponentPermissions()
componentPerms.setPermission('admin', 'ADMINISTRATOR')
componentPerms.setPermission('moderator', 'MANAGE_MESSAGES')
```

### Context-Aware Permissions

```js
async function validateComponentContext(interaction) {
  const customId = interaction.customId
  const parts = customId.split(':')

  const contextRules = {
    channel: async (channelId) => {
      const channel = interaction.guild.channels.cache.get(channelId)
      return channel && channel.permissionsFor(interaction.member).has('VIEW_CHANNEL')
    },
    role: async (roleId) => {
      const role = interaction.guild.roles.cache.get(roleId)
      if (!role) return false

      const userRoles = interaction.member.roles.cache
      const highestUserRole = userRoles.reduce((highest, role) =>
        role.position > highest.position ? role : highest
      )

      return highestUserRole.position > role.position
    },
    user: async (targetUserId) => {
      return targetUserId === interaction.user.id
    }
  }

  for (const [contextType, validator] of Object.entries(contextRules)) {
    const contextId = parts.find(part => part.startsWith(`${contextType}_`))
    if (contextId) {
      const id = contextId.split('_')[1]
      if (!(await validator(id))) {
        throw new SecurityError(`Invalid ${contextType} context`)
      }
    }
  }
}
```

## Input Sanitization

### Safe Data Handling

```js
class ComponentSanitizer {
  sanitizeString(input, maxLength = 100) {
    if (typeof input !== 'string') return ''
    return input.substring(0, maxLength).replace(/[<>'"&]/g, '').trim()
  }

  sanitizeNumber(input, min = 0, max = 1000000) {
    const num = parseInt(input)
    if (isNaN(num)) return min
    return Math.max(min, Math.min(max, num))
  }

  sanitizeArray(input, maxItems = 10) {
    if (!Array.isArray(input)) return []
    return input.slice(0, maxItems).filter(item => item !== null && item !== undefined)
  }

  sanitizeObject(input, allowedKeys = []) {
    if (typeof input !== 'object' || input === null) return {}

    const sanitized = {}
    for (const key of allowedKeys) {
      if (key in input) {
        sanitized[key] = typeof input[key] === 'string'
          ? this.sanitizeString(input[key])
          : input[key]
      }
    }

    return sanitized
  }
}

const sanitizer = new ComponentSanitizer()
```

## Secure Component Router

### Comprehensive Security Router

```js
class SecureComponentRouter {
  constructor() {
    this.routes = new Map()
    this.validators = []
    this.rateLimiter = new Map()
  }

  addRoute(pattern, handler, options = {}) {
    this.routes.set(pattern, { handler, options })
  }

  addValidator(validator) {
    this.validators.push(validator)
  }

  async handle(interaction) {
    try {
      for (const validator of this.validators) {
        await validator(interaction)
      }

      const parsed = this.parseCustomId(interaction.customId)
      if (!parsed) {
        throw new SecurityError('Invalid custom ID')
      }

      if (parsed.userId && parsed.userId !== interaction.user.id) {
        throw new SecurityError('Component ownership violation')
      }

      if (parsed.timestamp) {
        const age = Date.now() - parsed.timestamp
        if (age > 30 * 60 * 1000) {
          throw new SecurityError('Component expired')
        }
      }

      await this.checkRateLimit(interaction.user.id)
      const route = this.findRoute(parsed.action)

      if (!route) {
        throw new SecurityError('Unknown component action')
      }

      if (route.options.permission) {
        const hasPermission = await this.checkPermission(interaction, route.options.permission)
        if (!hasPermission) {
          throw new SecurityError('Insufficient permissions')
        }
      }

      const sanitizedData = this.sanitizeInputs(parsed.data)
      await route.handler(interaction, sanitizedData)

    } catch (error) {
      await this.handleSecurityError(interaction, error)
    }
  }

  parseCustomId(customId) {
    const parts = customId.split(':')
    if (parts.length < 3) return null

    return {
      action: parts[0],
      userId: parts[1],
      timestamp: parts[2] ? parseInt(parts[2]) : null,
      data: parts.slice(3).join(':')
    }
  }

  findRoute(action) {
    return this.routes.get(action)
  }

  async checkRateLimit(userId) {
    const now = Date.now()
    const window = 60 * 1000
    const maxRequests = 20

    const userRequests = this.rateLimiter.get(userId) || []
    const recentRequests = userRequests.filter(time => now - time < window)

    if (recentRequests.length >= maxRequests) {
      throw new SecurityError('Rate limit exceeded')
    }

    recentRequests.push(now)
    this.rateLimiter.set(userId, recentRequests)
  }

  async checkPermission(interaction, permission) {
    if (typeof permission === 'string') {
      return interaction.member.permissions.has(permission)
    }
    if (typeof permission === 'function') {
      return await permission(interaction)
    }
    return false
  }

  sanitizeInputs(data) {
    return sanitizer.sanitizeObject(data, ['value', 'option', 'text'])
  }

  async handleSecurityError(interaction, error) {
    console.error('Component security error:', error)

    const message = error instanceof SecurityError
      ? 'Security violation detected.'
      : 'An error occurred while processing your request.'

    const response = { content: message, ephemeral: true }

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply(response)
    } else if (interaction.deferred) {
      await interaction.editReply(response)
    }
  }
}

class SecurityError extends Error {
  constructor(message) {
    super(message)
    this.name = 'SecurityError'
  }
}
```

## Best Practices

### Defense in Depth
- Multiple validation layers
- Ownership verification
- Permission checking
- Input sanitization

### Secure Defaults
- Ephemeral responses by default
- Ownership verification required
- 30-minute expiration
- Rate limiting enabled
- Input sanitization active

## Next Steps

- [Cleanup and Timeouts](/components/cleanup-and-timeouts) - Managing component lifecycles