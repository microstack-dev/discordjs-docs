# Deployment Overview

Discord.js v14.25.1 deployment strategies for production bots. This section covers hosting options, scaling considerations, deployment pipelines, and operational practices for reliable Discord bot deployments.

## Hosting Options

Choosing the right hosting platform for your Discord bot.

### VPS Hosting

```javascript
// Production VPS deployment configuration
const vpsConfig = {
  // Server specifications
  server: {
    provider: 'DigitalOcean', // or AWS, Linode, Vultr, etc.
    region: 'nyc3',
    size: 's-2vcpu-4gb', // 2 CPU, 4GB RAM
    os: 'ubuntu-20-04-x64'
  },

  // Bot configuration
  bot: {
    token: process.env.DISCORD_TOKEN,
    shardCount: 'auto',
    intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_VOICE_STATES'],
    presence: {
      status: 'online',
      activities: [{
        name: 'Serving communities',
        type: 'PLAYING'
      }]
    }
  },

  // System configuration
  system: {
    nodeVersion: '18.17.0',
    timezone: 'America/New_York',
    locale: 'en_US.UTF-8'
  },

  // Monitoring and logging
  monitoring: {
    enableMetrics: true,
    logLevel: 'info',
    logRotation: 'daily',
    alertWebhooks: [
      'https://discord.com/api/webhooks/...', // Admin alerts
      'https://hooks.slack.com/...' // Team notifications
    ]
  }
}

// Environment setup script
const setupScript = `
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Create bot user
sudo useradd -m -s /bin/bash discord-bot
sudo usermod -aG sudo discord-bot

# Set up directories
sudo mkdir -p /opt/discord-bot
sudo chown discord-bot:discord-bot /opt/discord-bot

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Install monitoring tools
sudo apt install -y htop iotop sysstat

# Set up logrotate
sudo tee /etc/logrotate.d/discord-bot << EOF
/opt/discord-bot/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 discord-bot discord-bot
}
EOF
`
```

### Cloud Platform Hosting

```javascript
// AWS EC2 deployment configuration
const awsConfig = {
  // Infrastructure
  ec2: {
    instanceType: 't3.medium', // 2 vCPU, 4GB RAM
    ami: 'ami-0c55b159cbfafe1d0', // Ubuntu 20.04 LTS
    region: 'us-east-1',
    availabilityZone: 'us-east-1a',
    securityGroups: ['discord-bot-sg'],
    keyName: 'discord-bot-key'
  },

  // Auto scaling
  autoScaling: {
    minInstances: 1,
    maxInstances: 3,
    targetCPUUtilization: 70,
    cooldownPeriod: 300
  },

  // Load balancing
  loadBalancer: {
    type: 'application',
    targetGroup: 'discord-bot-tg',
    healthCheck: {
      path: '/health',
      interval: 30,
      timeout: 5,
      healthyThreshold: 2,
      unhealthyThreshold: 2
    }
  },

  // Database
  rds: {
    instanceClass: 'db.t3.micro',
    engine: 'postgres',
    version: '14.6',
    storage: 20, // GB
    multiAZ: false
  },

  // Redis
  elasticache: {
    nodeType: 'cache.t3.micro',
    engine: 'redis',
    version: '6.2',
    numCacheClusters: 1
  },

  // CloudWatch monitoring
  cloudwatch: {
    alarms: [
      {
        name: 'HighCPUUtilization',
        metric: 'CPUUtilization',
        threshold: 80,
        evaluationPeriods: 2
      },
      {
        name: 'HighMemoryUtilization',
        metric: 'MemoryUtilization',
        threshold: 85,
        evaluationPeriods: 2
      }
    ]
  }
}

// CloudFormation template snippet
const cloudFormationTemplate = {
  Resources: {
    DiscordBotInstance: {
      Type: 'AWS::EC2::Instance',
      Properties: {
        InstanceType: awsConfig.ec2.instanceType,
        ImageId: awsConfig.ec2.ami,
        KeyName: awsConfig.ec2.keyName,
        SecurityGroupIds: [
          { Ref: 'DiscordBotSecurityGroup' }
        ],
        UserData: {
          'Fn::Base64': setupScript
        },
        Tags: [
          {
            Key: 'Name',
            Value: 'DiscordBot'
          },
          {
            Key: 'Environment',
            Value: 'production'
          }
        ]
      }
    },

    DiscordBotSecurityGroup: {
      Type: 'AWS::EC2::SecurityGroup',
      Properties: {
        GroupDescription: 'Security group for Discord bot',
        SecurityGroupIngress: [
          {
            IpProtocol: 'tcp',
            FromPort: 22,
            ToPort: 22,
            CidrIp: '0.0.0.0/0' // Restrict to your IP in production
          },
          {
            IpProtocol: 'tcp',
            FromPort: 80,
            ToPort: 80,
            CidrIp: '0.0.0.0/0'
          }
        ]
      }
    }
  }
}
```

### Container Orchestration

```javascript
// Docker Compose configuration for production
const dockerComposeConfig = {
  version: '3.8',
  services: {
    discord_bot: {
      build: {
        context: '.',
        dockerfile: 'Dockerfile'
      },
      container_name: 'discord-bot',
      restart: 'unless-stopped',
      environment: [
        'NODE_ENV=production',
        'DISCORD_TOKEN=${DISCORD_TOKEN}',
        'DATABASE_URL=${DATABASE_URL}',
        'REDIS_URL=${REDIS_URL}'
      ],
      volumes: [
        './logs:/app/logs',
        './data:/app/data'
      ],
      networks: ['discord-network'],
      depends_on: ['postgres', 'redis'],
      healthcheck: {
        test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
        interval: '30s',
        timeout: '10s',
        retries: 3,
        start_period: '40s'
      }
    },

    postgres: {
      image: 'postgres:14-alpine',
      container_name: 'discord-postgres',
      restart: 'unless-stopped',
      environment: [
        'POSTGRES_DB=discord_bot',
        'POSTGRES_USER=discord',
        'POSTGRES_PASSWORD=${POSTGRES_PASSWORD}'
      ],
      volumes: [
        'postgres_data:/var/lib/postgresql/data',
        './init.sql:/docker-entrypoint-initdb.d/init.sql'
      ],
      networks: ['discord-network'],
      ports: ['5432:5432'] // Remove in production
    },

    redis: {
      image: 'redis:7-alpine',
      container_name: 'discord-redis',
      restart: 'unless-stopped',
      command: 'redis-server --appendonly yes',
      volumes: ['redis_data:/data'],
      networks: ['discord-network'],
      ports: ['6379:6379'] // Remove in production
    },

    nginx: {
      image: 'nginx:alpine',
      container_name: 'discord-nginx',
      restart: 'unless-stopped',
      ports: ['80:80', '443:443'],
      volumes: [
        './nginx.conf:/etc/nginx/nginx.conf',
        './ssl:/etc/nginx/ssl'
      ],
      networks: ['discord-network'],
      depends_on: ['discord_bot']
    },

    prometheus: {
      image: 'prom/prometheus',
      container_name: 'discord-prometheus',
      restart: 'unless-stopped',
      volumes: [
        './prometheus.yml:/etc/prometheus/prometheus.yml',
        'prometheus_data:/prometheus'
      ],
      networks: ['discord-network'],
      ports: ['9090:9090']
    },

    grafana: {
      image: 'grafana/grafana',
      container_name: 'discord-grafana',
      restart: 'unless-stopped',
      environment: [
        'GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}'
      ],
      volumes: ['grafana_data:/var/lib/grafana'],
      networks: ['discord-network'],
      ports: ['3000:3000']
    }
  },

  networks: {
    'discord-network': {
      driver: 'bridge'
    }
  },

  volumes: {
    postgres_data: {},
    redis_data: {},
    prometheus_data: {},
    grafana_data: {}
  }
}

// Dockerfile for Discord bot
const dockerfile = `
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \\
    ffmpeg \\
    python3 \\
    make \\
    g++ \\
    curl \\
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S discordbot -u 1001

# Set permissions
RUN chown -R discordbot:nodejs /app
USER discordbot

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port for health checks
EXPOSE 3000

# Start the bot
CMD ["npm", "start"]
`
```

## Scaling Considerations

Planning for bot growth and performance requirements.

### Horizontal Scaling

```javascript
class BotScaler {
  constructor(client, options = {}) {
    this.client = client
    this.options = {
      minShards: options.minShards || 1,
      maxShards: options.maxShards || 10,
      scaleUpThreshold: options.scaleUpThreshold || 80, // CPU %
      scaleDownThreshold: options.scaleDownThreshold || 30,
      evaluationPeriod: options.evaluationPeriod || 300000, // 5 minutes
      cooldownPeriod: options.cooldownPeriod || 600000, // 10 minutes
      ...options
    }

    this.currentShards = 1
    this.lastScaleTime = 0
    this.metrics = []
    this.scalingInProgress = false

    this.startMonitoring()
  }

  startMonitoring() {
    setInterval(() => {
      this.evaluateScaling()
    }, this.options.evaluationPeriod)
  }

  async evaluateScaling() {
    if (this.scalingInProgress) return

    const now = Date.now()

    // Check cooldown period
    if (now - this.lastScaleTime < this.options.cooldownPeriod) {
      return
    }

    // Collect metrics
    const metrics = await this.collectMetrics()
    this.metrics.push(metrics)

    // Keep only recent metrics
    if (this.metrics.length > 10) {
      this.metrics.shift()
    }

    // Calculate average metrics
    const avgMetrics = this.calculateAverageMetrics()

    // Determine scaling action
    const scalingAction = this.determineScalingAction(avgMetrics)

    if (scalingAction !== 'none') {
      await this.executeScaling(scalingAction, avgMetrics)
    }
  }

  async collectMetrics() {
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    return {
      timestamp: Date.now(),
      memoryUsage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to percentage
      activeGuilds: this.client.guilds.cache.size,
      activeVoiceConnections: this.getActiveVoiceConnections(),
      eventRate: this.getEventRate()
    }
  }

  getActiveVoiceConnections() {
    // Implementation depends on voice manager
    return 0 // Placeholder
  }

  getEventRate() {
    // Track events per second
    // Implementation depends on event monitoring
    return 0 // Placeholder
  }

  calculateAverageMetrics() {
    if (this.metrics.length === 0) return null

    const totals = this.metrics.reduce((acc, metric) => ({
      memoryUsage: acc.memoryUsage + metric.memoryUsage,
      cpuUsage: acc.cpuUsage + metric.cpuUsage,
      activeGuilds: acc.activeGuilds + metric.activeGuilds,
      activeVoiceConnections: acc.activeVoiceConnections + metric.activeVoiceConnections,
      eventRate: acc.eventRate + metric.eventRate
    }), {
      memoryUsage: 0,
      cpuUsage: 0,
      activeGuilds: 0,
      activeVoiceConnections: 0,
      eventRate: 0
    })

    return {
      memoryUsage: totals.memoryUsage / this.metrics.length,
      cpuUsage: totals.cpuUsage / this.metrics.length,
      activeGuilds: totals.activeGuilds / this.metrics.length,
      activeVoiceConnections: totals.activeVoiceConnections / this.metrics.length,
      eventRate: totals.eventRate / this.metrics.length
    }
  }

  determineScalingAction(metrics) {
    const { cpuUsage, memoryUsage } = metrics

    if (cpuUsage > this.options.scaleUpThreshold || memoryUsage > this.options.scaleUpThreshold) {
      if (this.currentShards < this.options.maxShards) {
        return 'scale_up'
      }
    } else if (cpuUsage < this.options.scaleDownThreshold && memoryUsage < this.options.scaleDownThreshold) {
      if (this.currentShards > this.options.minShards) {
        return 'scale_down'
      }
    }

    return 'none'
  }

  async executeScaling(action, metrics) {
    this.scalingInProgress = true

    try {
      if (action === 'scale_up') {
        await this.scaleUp(metrics)
      } else if (action === 'scale_down') {
        await this.scaleDown(metrics)
      }

      this.lastScaleTime = Date.now()
      console.log(`Scaling ${action} completed`)
    } catch (error) {
      console.error(`Scaling ${action} failed:`, error)
    } finally {
      this.scalingInProgress = false
    }
  }

  async scaleUp(metrics) {
    const newShardCount = Math.min(this.currentShards + 1, this.options.maxShards)

    console.log(`Scaling up from ${this.currentShards} to ${newShardCount} shards`)

    // Implementation depends on sharding manager
    // This would typically involve spawning new shards
    this.currentShards = newShardCount
  }

  async scaleDown(metrics) {
    const newShardCount = Math.max(this.currentShards - 1, this.options.minShards)

    console.log(`Scaling down from ${this.currentShards} to ${newShardCount} shards`)

    // Implementation depends on sharding manager
    // This would typically involve destroying shards
    this.currentShards = newShardCount
  }

  getScalingStats() {
    return {
      currentShards: this.currentShards,
      minShards: this.options.minShards,
      maxShards: this.options.maxShards,
      scalingInProgress: this.scalingInProgress,
      lastScaleTime: this.lastScaleTime,
      recentMetrics: this.metrics.slice(-5)
    }
  }
}
```

### Deployment Pipelines

Automating the deployment process.

### CI/CD Pipeline

```javascript
// GitHub Actions workflow configuration
const githubActionsWorkflow = {
  name: 'Discord Bot CI/CD',
  on: {
    push: {
      branches: ['main', 'develop']
    },
    pull_request: {
      branches: ['main']
    }
  },
  jobs: {
    test: {
      runs_on: 'ubuntu-latest',
      steps: [
        {
          name: 'Checkout code',
          uses: 'actions/checkout@v3'
        },
        {
          name: 'Setup Node.js',
          uses: 'actions/setup-node@v3',
          with: {
            'node-version': '18',
            'cache': 'npm'
          }
        },
        {
          name: 'Install dependencies',
          run: 'npm ci'
        },
        {
          name: 'Run linting',
          run: 'npm run lint'
        },
        {
          name: 'Run tests',
          run: 'npm test'
        },
        {
          name: 'Build application',
          run: 'npm run build'
        }
      ]
    },

    deploy_staging: {
      needs: 'test',
      runs_on: 'ubuntu-latest',
      if: 'github.ref == \'refs/heads/develop\'',
      steps: [
        {
          name: 'Deploy to staging',
          run: 'echo "Deploying to staging environment"'
        }
        // Add actual deployment steps
      ]
    },

    deploy_production: {
      needs: 'test',
      runs_on: 'ubuntu-latest',
      if: 'github.ref == \'refs/heads/main\'',
      steps: [
        {
          name: 'Deploy to production',
          run: 'echo "Deploying to production environment"'
        }
        // Add actual deployment steps
      ]
    }
  }
}

// Deployment script
const deploymentScript = `
#!/bin/bash

set -e

echo "Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="discord-bot"
APP_DIR="/opt/$APP_NAME"
BACKUP_DIR="/opt/${APP_NAME}_backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
check_requirements() {
    log_info "Checking deployment requirements..."

    # Check if running as correct user
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root"
        exit 1
    fi

    # Check available disk space
    AVAILABLE_SPACE=$(df /opt | tail -1 | awk '{print $4}')
    if [[ $AVAILABLE_SPACE -lt 1048576 ]]; then # 1GB in KB
        log_error "Insufficient disk space. At least 1GB required."
        exit 1
    fi
}

# Backup current deployment
create_backup() {
    log_info "Creating backup..."

    if [[ -d "$APP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        tar -czf "${BACKUP_DIR}/${APP_NAME}_${TIMESTAMP}.tar.gz" -C /opt "$APP_NAME"
        log_info "Backup created: ${BACKUP_DIR}/${APP_NAME}_${TIMESTAMP}.tar.gz"
    fi
}

# Stop application
stop_application() {
    log_info "Stopping application..."

    if command -v pm2 &> /dev/null; then
        pm2 stop "$APP_NAME" || true
        pm2 delete "$APP_NAME" || true
    else
        # Fallback to direct process killing
        pkill -f "node.*$APP_NAME" || true
    fi
}

# Update application code
update_code() {
    log_info "Updating application code..."

    if [[ -d "$APP_DIR" ]]; then
        cd "$APP_DIR"

        # Pull latest changes
        git fetch origin
        git reset --hard origin/main
        git clean -fd

        # Install dependencies
        npm ci --production

        # Run database migrations if any
        npm run migrate || true
    else
        log_error "Application directory not found: $APP_DIR"
        exit 1
    fi
}

# Start application
start_application() {
    log_info "Starting application..."

    cd "$APP_DIR"

    if command -v pm2 &> /dev/null; then
        pm2 start ecosystem.config.js --env production
        pm2 save
    else
        # Fallback to direct start
        npm start &
        echo $! > "${APP_DIR}/app.pid"
    fi
}

# Health check
health_check() {
    log_info "Performing health check..."

    local max_attempts=10
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:3000/health > /dev/null; then
            log_info "Health check passed"
            return 0
        fi

        log_warn "Health check failed (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done

    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Rollback on failure
rollback() {
    log_error "Deployment failed, rolling back..."

    stop_application

    if [[ -f "${BACKUP_DIR}/${APP_NAME}_${TIMESTAMP}.tar.gz" ]]; then
        cd /opt
        rm -rf "$APP_DIR"
        tar -xzf "${BACKUP_DIR}/${APP_NAME}_${TIMESTAMP}.tar.gz"
        log_info "Rolled back to previous version"
    fi

    start_application
}

# Main deployment process
main() {
    log_info "Starting deployment of $APP_NAME..."

    check_requirements
    create_backup

    # Trap errors for rollback
    trap rollback ERR

    stop_application
    update_code
    start_application

    if health_check; then
        log_info "Deployment completed successfully!"

        # Clean up old backups (keep last 5)
        cd "$BACKUP_DIR"
        ls -t *.tar.gz | tail -n +6 | xargs rm -f || true

        # Send success notification
        curl -X POST -H 'Content-type: application/json' \\
             --data '{"text":"✅ Discord bot deployment successful"}' \\
             "$SLACK_WEBHOOK_URL" || true
    else
        log_error "Deployment failed - health check unsuccessful"
        exit 1
    fi
}

# Run main function
main "$@"
`

// PM2 ecosystem configuration
const pm2EcosystemConfig = {
  apps: [{
    name: 'discord-bot',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_log: './logs/app-error.log',
    out_log: './logs/app-out.log',
    log_log: './logs/app-combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 5000,
    autorestart: true,
    min_uptime: '10s'
  }],

  deploy: {
    production: {
      user: 'discord-bot',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/discord-bot.git',
      path: '/opt/discord-bot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}
```

## Best Practices

### Implementation Guidelines

1. **Choose hosting platform** based on your scale and operational requirements
2. **Implement automated deployments** with proper rollback capabilities
3. **Set up monitoring and alerting** for production deployments
4. **Use environment-specific configurations** for different deployment stages
5. **Implement health checks** and graceful shutdown procedures
6. **Plan for scaling** from the beginning of your deployment strategy
7. **Secure your deployments** with proper access controls and secrets management
8. **Test deployments** in staging environments before production
9. **Monitor resource usage** and implement auto-scaling where appropriate
10. **Document deployment procedures** and maintain runbooks

### Production Considerations

This deployment overview provides a comprehensive foundation for deploying Discord bots to production with proper scaling, monitoring, and operational practices.