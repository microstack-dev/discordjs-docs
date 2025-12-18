# Environment Variables

Discord.js v14.25.1 environment variable management for production bots. This section covers secrets handling, configuration patterns, environment-specific settings, and secure credential management.

## Configuration Management

Structuring environment variables for different deployment environments.

### Environment Variable Schema

```javascript
// Configuration schema definition
const configSchema = {
  // Discord API
  discord: {
    token: {
      type: 'string',
      required: true,
      sensitive: true,
      description: 'Discord bot token'
    },
    clientId: {
      type: 'string',
      required: true,
      description: 'Discord application client ID'
    },
    clientSecret: {
      type: 'string',
      required: true,
      sensitive: true,
      description: 'Discord application client secret'
    },
    publicKey: {
      type: 'string',
      required: false,
      description: 'Discord application public key for interactions'
    },
    redirectUri: {
      type: 'string',
      required: false,
      description: 'OAuth2 redirect URI'
    }
  },

  // Database
  database: {
    url: {
      type: 'string',
      required: true,
      sensitive: true,
      description: 'Database connection URL'
    },
    host: {
      type: 'string',
      required: false,
      description: 'Database host (if not using URL)'
    },
    port: {
      type: 'number',
      required: false,
      default: 5432,
      description: 'Database port'
    },
    name: {
      type: 'string',
      required: false,
      description: 'Database name'
    },
    user: {
      type: 'string',
      required: false,
      description: 'Database username'
    },
    password: {
      type: 'string',
      required: false,
      sensitive: true,
      description: 'Database password'
    },
    ssl: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable SSL for database connections'
    }
  },

  // Redis
  redis: {
    url: {
      type: 'string',
      required: false,
      sensitive: true,
      description: 'Redis connection URL'
    },
    host: {
      type: 'string',
      required: false,
      default: 'localhost',
      description: 'Redis host'
    },
    port: {
      type: 'number',
      required: false,
      default: 6379,
      description: 'Redis port'
    },
    password: {
      type: 'string',
      required: false,
      sensitive: true,
      description: 'Redis password'
    },
    db: {
      type: 'number',
      required: false,
      default: 0,
      description: 'Redis database number'
    }
  },

  // Application settings
  app: {
    environment: {
      type: 'string',
      required: false,
      default: 'development',
      enum: ['development', 'staging', 'production'],
      description: 'Application environment'
    },
    port: {
      type: 'number',
      required: false,
      default: 3000,
      description: 'HTTP server port'
    },
    logLevel: {
      type: 'string',
      required: false,
      default: 'info',
      enum: ['error', 'warn', 'info', 'debug'],
      description: 'Logging level'
    },
    debug: {
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable debug mode'
    }
  },

  // External services
  services: {
    sentryDsn: {
      type: 'string',
      required: false,
      sensitive: true,
      description: 'Sentry DSN for error tracking'
    },
    prometheusUrl: {
      type: 'string',
      required: false,
      description: 'Prometheus push gateway URL'
    },
    slackWebhook: {
      type: 'string',
      required: false,
      sensitive: true,
      description: 'Slack webhook URL for notifications'
    }
  },

  // Bot-specific settings
  bot: {
    prefix: {
      type: 'string',
      required: false,
      default: '!',
      description: 'Command prefix'
    },
    shardCount: {
      type: 'string',
      required: false,
      default: 'auto',
      description: 'Number of shards (auto or number)'
    },
    ownerId: {
      type: 'string',
      required: false,
      description: 'Bot owner user ID'
    },
    supportServer: {
      type: 'string',
      required: false,
      description: 'Support server invite code'
    }
  }
}

// Environment variable mapping
const envMapping = {
  // Discord
  DISCORD_TOKEN: 'discord.token',
  DISCORD_CLIENT_ID: 'discord.clientId',
  DISCORD_CLIENT_SECRET: 'discord.clientSecret',
  DISCORD_PUBLIC_KEY: 'discord.publicKey',
  DISCORD_REDIRECT_URI: 'discord.redirectUri',

  // Database
  DATABASE_URL: 'database.url',
  DB_HOST: 'database.host',
  DB_PORT: 'database.port',
  DB_NAME: 'database.name',
  DB_USER: 'database.user',
  DB_PASSWORD: 'database.password',
  DB_SSL: 'database.ssl',

  // Redis
  REDIS_URL: 'redis.url',
  REDIS_HOST: 'redis.host',
  REDIS_PORT: 'redis.port',
  REDIS_PASSWORD: 'redis.password',
  REDIS_DB: 'redis.db',

  // Application
  NODE_ENV: 'app.environment',
  PORT: 'app.port',
  LOG_LEVEL: 'app.logLevel',
  DEBUG: 'app.debug',

  // Services
  SENTRY_DSN: 'services.sentryDsn',
  PROMETHEUS_URL: 'services.prometheusUrl',
  SLACK_WEBHOOK_URL: 'services.slackWebhook',

  // Bot
  BOT_PREFIX: 'bot.prefix',
  BOT_SHARD_COUNT: 'bot.shardCount',
  BOT_OWNER_ID: 'bot.ownerId',
  BOT_SUPPORT_SERVER: 'bot.supportServer'
}
```

### Configuration Loader

```javascript
class ConfigLoader {
  constructor(schema, mapping) {
    this.schema = schema
    this.mapping = mapping
    this.config = {}
    this.errors = []
    this.warnings = []
  }

  load() {
    // Load from environment variables
    this.loadFromEnvironment()

    // Validate configuration
    this.validate()

    // Transform and set defaults
    this.transform()

    return {
      config: this.config,
      errors: this.errors,
      warnings: this.warnings
    }
  }

  loadFromEnvironment() {
    for (const [envVar, configPath] of Object.entries(this.mapping)) {
      const value = process.env[envVar]

      if (value !== undefined) {
        this.setNestedValue(this.config, configPath.split('.'), value)
      }
    }
  }

  setNestedValue(obj, path, value) {
    let current = obj

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]
      if (!current[key]) {
        current[key] = {}
      }
      current = current[key]
    }

    current[path[path.length - 1]] = value
  }

  validate() {
    this.validateSection(this.schema, this.config, '')
  }

  validateSection(schema, config, path) {
    for (const [key, definition] of Object.entries(schema)) {
      const fullPath = path ? `${path}.${key}` : key
      const value = this.getNestedValue(config, key.split('.'))

      // Check required fields
      if (definition.required && (value === undefined || value === '')) {
        this.errors.push(`Required configuration missing: ${fullPath}`)
        continue
      }

      // Skip validation if value is undefined and not required
      if (value === undefined) {
        if (definition.default !== undefined) {
          this.setNestedValue(config, fullPath.split('.'), definition.default)
        }
        continue
      }

      // Type validation
      if (!this.validateType(value, definition.type)) {
        this.errors.push(`Invalid type for ${fullPath}: expected ${definition.type}, got ${typeof value}`)
        continue
      }

      // Enum validation
      if (definition.enum && !definition.enum.includes(value)) {
        this.errors.push(`Invalid value for ${fullPath}: must be one of ${definition.enum.join(', ')}`)
        continue
      }

      // Range validation for numbers
      if (definition.type === 'number') {
        if (definition.min !== undefined && value < definition.min) {
          this.errors.push(`Value for ${fullPath} must be >= ${definition.min}`)
        }
        if (definition.max !== undefined && value > definition.max) {
          this.errors.push(`Value for ${fullPath} must be <= ${definition.max}`)
        }
      }

      // URL validation
      if (definition.type === 'string' && definition.format === 'url') {
        try {
          new URL(value)
        } catch {
          this.errors.push(`Invalid URL format for ${fullPath}`)
        }
      }

      // Recursive validation for nested objects
      if (definition.type === 'object' && definition.properties) {
        this.validateSection(definition.properties, value || {}, fullPath)
      }
    }
  }

  validateType(value, expectedType) {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' || (!isNaN(value) && !isNaN(parseFloat(value)))
      case 'boolean':
        return typeof value === 'boolean' || value === 'true' || value === 'false'
      case 'object':
        return typeof value === 'object' && value !== null
      default:
        return true
    }
  }

  transform() {
    this.transformSection(this.schema, this.config, '')
  }

  transformSection(schema, config, path) {
    for (const [key, definition] of Object.entries(schema)) {
      const fullPath = path ? `${path}.${key}` : key
      const value = this.getNestedValue(config, key.split('.'))

      if (value === undefined) continue

      // Type conversion
      let transformedValue = value

      switch (definition.type) {
        case 'number':
          transformedValue = typeof value === 'string' ? parseFloat(value) : value
          break
        case 'boolean':
          transformedValue = typeof value === 'string' ? value === 'true' : value
          break
      }

      // Set transformed value
      this.setNestedValue(config, fullPath.split('.'), transformedValue)

      // Recursive transformation
      if (definition.type === 'object' && definition.properties) {
        this.transformSection(definition.properties, transformedValue, fullPath)
      }
    }
  }

  getNestedValue(obj, path) {
    let current = obj
    for (const key of path) {
      if (current && typeof current === 'object') {
        current = current[key]
      } else {
        return undefined
      }
    }
    return current
  }

  getValidationSummary() {
    const hasErrors = this.errors.length > 0
    const hasWarnings = this.warnings.length > 0

    return {
      valid: !hasErrors,
      errors: this.errors,
      warnings: this.warnings,
      errorCount: this.errors.length,
      warningCount: this.warnings.length
    }
  }
}
```

## Secrets Management

Secure handling of sensitive configuration data.

### Secrets Provider Interface

```javascript
class SecretsProvider {
  async getSecret(key) {
    throw new Error('getSecret must be implemented by subclass')
  }

  async getSecrets(keys) {
    const results = {}
    for (const key of keys) {
      results[key] = await this.getSecret(key)
    }
    return results
  }

  async setSecret(key, value) {
    throw new Error('setSecret must be implemented by subclass')
  }

  async deleteSecret(key) {
    throw new Error('deleteSecret must be implemented by subclass')
  }
}

// Environment variables provider
class EnvironmentSecretsProvider extends SecretsProvider {
  async getSecret(key) {
    const envKey = key.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    return process.env[envKey]
  }
}

// AWS Secrets Manager provider
class AWSSecretsProvider extends SecretsProvider {
  constructor() {
    super()
    this.secretsManager = new AWS.SecretsManager({
      region: process.env.AWS_REGION || 'us-east-1'
    })
  }

  async getSecret(key) {
    try {
      const response = await this.secretsManager.getSecretValue({
        SecretId: key
      }).promise()

      if (response.SecretString) {
        return JSON.parse(response.SecretString)
      } else {
        return response.SecretBinary.toString()
      }
    } catch (error) {
      console.error('Failed to retrieve secret from AWS:', error)
      throw error
    }
  }

  async setSecret(key, value) {
    try {
      await this.secretsManager.createSecret({
        Name: key,
        SecretString: JSON.stringify(value)
      }).promise()
    } catch (error) {
      console.error('Failed to store secret in AWS:', error)
      throw error
    }
  }
}

// HashiCorp Vault provider
class VaultSecretsProvider extends SecretsProvider {
  constructor(options = {}) {
    super()
    this.vaultUrl = options.url || process.env.VAULT_URL
    this.token = options.token || process.env.VAULT_TOKEN
    this.mountPath = options.mountPath || 'secret'
  }

  async getSecret(key) {
    try {
      const response = await fetch(`${this.vaultUrl}/v1/${this.mountPath}/data/${key}`, {
        headers: {
          'X-Vault-Token': this.token
        }
      })

      if (!response.ok) {
        throw new Error(`Vault request failed: ${response.status}`)
      }

      const data = await response.json()
      return data.data.data
    } catch (error) {
      console.error('Failed to retrieve secret from Vault:', error)
      throw error
    }
  }

  async setSecret(key, value) {
    try {
      const response = await fetch(`${this.vaultUrl}/v1/${this.mountPath}/data/${key}`, {
        method: 'POST',
        headers: {
          'X-Vault-Token': this.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: value
        })
      })

      if (!response.ok) {
        throw new Error(`Vault request failed: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to store secret in Vault:', error)
      throw error
    }
  }
}

// Docker secrets provider
class DockerSecretsProvider extends SecretsProvider {
  constructor(secretsPath = '/run/secrets') {
    super()
    this.secretsPath = secretsPath
  }

  async getSecret(key) {
    try {
      const fs = require('fs').promises
      const secretPath = `${this.secretsPath}/${key}`
      const value = await fs.readFile(secretPath, 'utf8')
      return value.trim()
    } catch (error) {
      console.error('Failed to read Docker secret:', error)
      throw error
    }
  }
}
```

### Secrets Manager

```javascript
class SecretsManager {
  constructor() {
    this.providers = new Map()
    this.defaultProvider = null
    this.secretCache = new Map()
    this.cacheTtl = 5 * 60 * 1000 // 5 minutes
  }

  registerProvider(name, provider, isDefault = false) {
    this.providers.set(name, provider)
    if (isDefault || this.defaultProvider === null) {
      this.defaultProvider = provider
    }
  }

  async getSecret(key, providerName = null) {
    // Check cache first
    const cached = this.secretCache.get(key)
    if (cached && (Date.now() - cached.timestamp) < this.cacheTtl) {
      return cached.value
    }

    const provider = providerName ? this.providers.get(providerName) : this.defaultProvider

    if (!provider) {
      throw new Error(`No secrets provider available${providerName ? ` for ${providerName}` : ''}`)
    }

    try {
      const value = await provider.getSecret(key)

      // Cache the result
      this.secretCache.set(key, {
        value,
        timestamp: Date.now()
      })

      return value
    } catch (error) {
      console.error(`Failed to retrieve secret ${key}:`, error)
      throw error
    }
  }

  async getSecrets(keys, providerName = null) {
    const provider = providerName ? this.providers.get(providerName) : this.defaultProvider

    if (!provider) {
      throw new Error(`No secrets provider available${providerName ? ` for ${providerName}` : ''}`)
    }

    try {
      return await provider.getSecrets(keys)
    } catch (error) {
      console.error('Failed to retrieve secrets:', error)
      throw error
    }
  }

  async setSecret(key, value, providerName = null) {
    const provider = providerName ? this.providers.get(providerName) : this.defaultProvider

    if (!provider) {
      throw new Error(`No secrets provider available${providerName ? ` for ${providerName}` : ''}`)
    }

    try {
      await provider.setSecret(key, value)

      // Invalidate cache
      this.secretCache.delete(key)
    } catch (error) {
      console.error(`Failed to store secret ${key}:`, error)
      throw error
    }
  }

  invalidateCache(key = null) {
    if (key) {
      this.secretCache.delete(key)
    } else {
      this.secretCache.clear()
    }
  }

  getCacheStats() {
    return {
      cachedSecrets: this.secretCache.size,
      cacheTtl: this.cacheTtl
    }
  }
}
```

## Environment-Specific Configuration

Managing different configurations for various deployment environments.

### Environment Configurator

```javascript
class EnvironmentConfigurator {
  constructor() {
    this.environments = new Map()
    this.currentEnvironment = process.env.NODE_ENV || 'development'
  }

  defineEnvironment(name, config) {
    this.environments.set(name, config)
  }

  getEnvironmentConfig() {
    const baseConfig = this.environments.get('base') || {}
    const envConfig = this.environments.get(this.currentEnvironment) || {}

    // Deep merge configurations
    return this.deepMerge(baseConfig, envConfig)
  }

  deepMerge(target, source) {
    const result = { ...target }

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }

    return result
  }

  setEnvironment(env) {
    this.currentEnvironment = env
  }

  getCurrentEnvironment() {
    return this.currentEnvironment
  }

  validateEnvironmentConfig() {
    const config = this.getEnvironmentConfig()
    const errors = []

    // Validate required fields based on environment
    if (this.currentEnvironment === 'production') {
      if (!config.database?.ssl) {
        errors.push('SSL must be enabled for database in production')
      }

      if (!config.redis?.password) {
        errors.push('Redis password is required in production')
      }

      if (config.app?.debug) {
        errors.push('Debug mode should be disabled in production')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Predefined environment configurations
const environmentConfigurator = new EnvironmentConfigurator()

// Base configuration
environmentConfigurator.defineEnvironment('base', {
  app: {
    environment: 'development',
    port: 3000,
    logLevel: 'info',
    debug: false
  },
  database: {
    ssl: false
  },
  redis: {
    host: 'localhost',
    port: 6379
  },
  bot: {
    prefix: '!'
  }
})

// Development configuration
environmentConfigurator.defineEnvironment('development', {
  app: {
    debug: true,
    logLevel: 'debug'
  },
  database: {
    host: 'localhost',
    name: 'discord_bot_dev'
  },
  redis: {
    db: 1
  }
})

// Staging configuration
environmentConfigurator.defineEnvironment('staging', {
  app: {
    environment: 'staging',
    logLevel: 'warn'
  },
  database: {
    ssl: true
  },
  redis: {
    db: 2
  }
})

// Production configuration
environmentConfigurator.defineEnvironment('production', {
  app: {
    environment: 'production',
    logLevel: 'error',
    debug: false
  },
  database: {
    ssl: true,
    maxConnections: 20
  },
  redis: {
    db: 0,
    maxRetriesPerRequest: 3
  },
  monitoring: {
    enabled: true,
    metrics: true,
    alerting: true
  }
})
```

### Configuration Validator

```javascript
class ConfigurationValidator {
  constructor(schema) {
    this.schema = schema
  }

  validate(config) {
    const errors = []
    const warnings = []

    this.validateSection(this.schema, config, '', errors, warnings)

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  validateSection(schema, config, path, errors, warnings) {
    for (const [key, definition] of Object.entries(schema)) {
      const fullPath = path ? `${path}.${key}` : key
      const value = config?.[key]

      // Check required fields
      if (definition.required && (value === undefined || value === null || value === '')) {
        errors.push(`Missing required configuration: ${fullPath}`)
        continue
      }

      // Skip if value is undefined and not required
      if (value === undefined || value === null) {
        continue
      }

      // Type validation
      if (!this.validateType(value, definition.type)) {
        errors.push(`Invalid type for ${fullPath}: expected ${definition.type}, got ${typeof value}`)
        continue
      }

      // Sensitive data warnings
      if (definition.sensitive && process.env.NODE_ENV !== 'production') {
        warnings.push(`Sensitive configuration exposed in non-production environment: ${fullPath}`)
      }

      // Value validation
      if (definition.enum && !definition.enum.includes(value)) {
        errors.push(`Invalid value for ${fullPath}: must be one of ${definition.enum.join(', ')}`)
      }

      // Custom validation
      if (definition.validate && typeof definition.validate === 'function') {
        try {
          const result = definition.validate(value)
          if (result !== true) {
            errors.push(`${fullPath}: ${result}`)
          }
        } catch (error) {
          errors.push(`${fullPath}: validation error - ${error.message}`)
        }
      }

      // Recursive validation for nested objects
      if (definition.type === 'object' && definition.properties) {
        this.validateSection(definition.properties, value, fullPath, errors, warnings)
      }

      // Array validation
      if (definition.type === 'array' && definition.items) {
        if (!Array.isArray(value)) {
          errors.push(`Invalid type for ${fullPath}: expected array, got ${typeof value}`)
        } else {
          value.forEach((item, index) => {
            this.validateSection({ item: definition.items }, { item }, `${fullPath}[${index}]`, errors, warnings)
          })
        }
      }
    }
  }

  validateType(value, expectedType) {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' && !isNaN(value)
      case 'boolean':
        return typeof value === 'boolean'
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value)
      case 'array':
        return Array.isArray(value)
      default:
        return true
    }
  }
}
```

## Best Practices

### Implementation Guidelines

1. **Never commit secrets** to version control or logs
2. **Use different secrets** for each environment
3. **Validate configuration** at startup and fail fast
4. **Use environment-specific settings** for different deployment stages
5. **Implement proper secrets management** with rotation capabilities
6. **Document all environment variables** and their purposes
7. **Use configuration schemas** to ensure type safety
8. **Implement graceful degradation** when optional services are unavailable
9. **Monitor configuration changes** and alert on anomalies
10. **Test configuration loading** in all environments

### Production Considerations

```javascript
// Complete configuration management system
class ProductionConfigManager {
  constructor() {
    this.schema = configSchema
    this.mapping = envMapping
    this.loader = new ConfigLoader(this.schema, this.mapping)
    this.validator = new ConfigurationValidator(this.schema)
    this.secretsManager = new SecretsManager()
    this.environmentConfigurator = environmentConfigurator

    this.config = null
    this.isLoaded = false
  }

  async initialize() {
    try {
      console.log('Initializing configuration management...')

      // Set up secrets providers
      this.setupSecretsProviders()

      // Load configuration
      const { config, errors, warnings } = this.loader.load()

      if (errors.length > 0) {
        console.error('Configuration errors:', errors)
        throw new Error('Configuration validation failed')
      }

      if (warnings.length > 0) {
        console.warn('Configuration warnings:', warnings)
      }

      // Merge with environment-specific config
      this.config = this.environmentConfigurator.getEnvironmentConfig()
      this.config = this.environmentConfigurator.deepMerge(this.config, config)

      // Validate final configuration
      const validation = this.validator.validate(this.config)
      if (!validation.valid) {
        console.error('Final configuration validation failed:', validation.errors)
        throw new Error('Configuration validation failed')
      }

      // Load sensitive data from secrets manager
      await this.loadSecrets()

      this.isLoaded = true
      console.log('Configuration management initialized successfully')
    } catch (error) {
      console.error('Configuration initialization failed:', error)
      throw error
    }
  }

  setupSecretsProviders() {
    // Environment variables (default)
    this.secretsManager.registerProvider('env', new EnvironmentSecretsProvider(), true)

    // AWS Secrets Manager (if available)
    if (process.env.AWS_REGION) {
      this.secretsManager.registerProvider('aws', new AWSSecretsProvider())
    }

    // HashiCorp Vault (if configured)
    if (process.env.VAULT_URL) {
      this.secretsManager.registerProvider('vault', new VaultSecretsProvider())
    }
  }

  async loadSecrets() {
    const sensitiveFields = this.getSensitiveFields()

    for (const field of sensitiveFields) {
      const value = this.getNestedValue(this.config, field.split('.'))
      if (!value) {
        // Try to load from secrets manager
        try {
          const secretValue = await this.secretsManager.getSecret(field.replace(/\./g, '_'))
          if (secretValue) {
            this.setNestedValue(this.config, field.split('.'), secretValue)
          }
        } catch (error) {
          console.warn(`Failed to load secret for ${field}:`, error.message)
        }
      }
    }
  }

  getSensitiveFields() {
    const sensitive = []

    const findSensitive = (schema, path = '') => {
      for (const [key, definition] of Object.entries(schema)) {
        const fullPath = path ? `${path}.${key}` : key

        if (definition.sensitive) {
          sensitive.push(fullPath)
        }

        if (definition.type === 'object' && definition.properties) {
          findSensitive(definition.properties, fullPath)
        }
      }
    }

    findSensitive(this.schema)
    return sensitive
  }

  getNestedValue(obj, path) {
    let current = obj
    for (const key of path) {
      if (current && typeof current === 'object') {
        current = current[key]
      } else {
        return undefined
      }
    }
    return current
  }

  setNestedValue(obj, path, value) {
    let current = obj
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }
    current[path[path.length - 1]] = value
  }

  get(key) {
    if (!this.isLoaded) {
      throw new Error('Configuration not loaded')
    }

    return this.getNestedValue(this.config, key.split('.'))
  }

  getAll() {
    if (!this.isLoaded) {
      throw new Error('Configuration not loaded')
    }

    return { ...this.config }
  }

  async reload() {
    this.isLoaded = false
    await this.initialize()
  }

  getValidationSummary() {
    if (!this.isLoaded) return null

    return this.validator.validate(this.config)
  }

  async gracefulShutdown() {
    console.log('Configuration manager shutting down...')

    // Clear sensitive data from memory
    const sensitiveFields = this.getSensitiveFields()
    for (const field of sensitiveFields) {
      this.setNestedValue(this.config, field.split('.'), undefined)
    }

    console.log('Configuration manager shutdown complete')
  }
}
```

This comprehensive environment variable management system provides secure, type-safe configuration handling with support for multiple secrets providers and environment-specific settings.