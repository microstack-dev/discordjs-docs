# PM2 Deployment

Discord.js v14.25.1 PM2 process management for production bots. This section covers PM2 configuration, clustering, monitoring, deployment strategies, and operational management.

## PM2 Fundamentals

Setting up PM2 for Discord bot process management.

### PM2 Installation and Configuration

```bash
#!/bin/bash

# PM2 Installation and Setup Script

# Install PM2 globally
npm install -g pm2

# Configure PM2 startup (for auto-start on server boot)
pm2 startup

# Create PM2 configuration directory
mkdir -p ~/.pm2

# Create ecosystem configuration
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'discord-bot',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      NODE_OPTIONS: '--max-old-space-size=4096'
    },
    error_log: './logs/app-error.log',
    out_log: './logs/app-out.log',
    log_log: './logs/app-combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 5000,
    autorestart: true,
    min_uptime: '10s',
    max_restarts: 10,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    env_production: {
      NODE_ENV: 'production',
      DISCORD_TOKEN: process.env.DISCORD_TOKEN,
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL
    }
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
EOF

# Save PM2 configuration
pm2 save

# Set up log rotation
cat > /etc/logrotate.d/pm2-discord-bot << EOF
/home/discord-bot/.pm2/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 discord-bot discord-bot
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

echo "PM2 setup completed"
```

### Ecosystem Configuration

```javascript
// ecosystem.config.js - Complete PM2 configuration

const { name, version } = require('./package.json')

module.exports = {
  apps: [
    {
      name: 'discord-bot-main',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        SHARD_COUNT: 1,
        CLUSTER_COUNT: 1
      },
      env_production: {
        NODE_ENV: 'production',
        SHARD_COUNT: 'auto',
        CLUSTER_COUNT: 'max',
        NODE_OPTIONS: '--max-old-space-size=4096 --optimize-for-size'
      },
      error_file: './logs/main-error.log',
      out_file: './logs/main-out.log',
      log_file: './logs/main-combined.log',
      time: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      autorestart: true,
      min_uptime: '10s',
      max_restarts: 5,
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 15000,
      // Health check configuration
      health_check: {
        enabled: true,
        url: 'http://localhost:3000/health',
        interval: 30000,
        timeout: 5000,
        fails: 3
      }
    },
    {
      name: 'discord-bot-worker',
      script: 'dist/worker.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'command_processor'
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'command_processor',
        NODE_OPTIONS: '--max-old-space-size=2048'
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_file: './logs/worker-combined.log',
      time: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 2000,
      autorestart: true,
      min_uptime: '5s',
      max_restarts: 10,
      kill_timeout: 5000
    },
    {
      name: 'discord-bot-scheduler',
      script: 'dist/scheduler.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: './logs/scheduler-error.log',
      out_file: './logs/scheduler-out.log',
      log_file: './logs/scheduler-combined.log',
      time: true,
      watch: false,
      max_memory_restart: '256M',
      restart_delay: 10000,
      autorestart: true,
      min_uptime: '30s',
      max_restarts: 3,
      cron_restart: '0 2 * * *'  // Restart daily at 2 AM
    }
  ],

  deploy: {
    staging: {
      user: 'discord-bot',
      host: 'staging.yourdomain.com',
      ref: 'origin/develop',
      repo: 'git@github.com:yourusername/discord-bot.git',
      path: '/opt/discord-bot-staging',
      'pre-deploy-local': 'echo "Deploying to staging..."',
      'post-deploy': [
        'npm install',
        'npm run build',
        'pm2 reload ecosystem.config.js --env staging',
        'pm2 save'
      ].join(' && '),
      'pre-setup': [
        'sudo apt update',
        'sudo apt install -y nodejs npm'
      ].join(' && ')
    },
    production: {
      user: 'discord-bot',
      host: 'production.yourdomain.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/discord-bot.git',
      path: '/opt/discord-bot-production',
      'pre-deploy-local': 'echo "Deploying to production..."',
      'post-deploy': [
        'npm ci --production=false',
        'npm run build',
        'npm prune --production',
        'pm2 stop all',
        'pm2 start ecosystem.config.js --env production',
        'pm2 save'
      ].join(' && '),
      'pre-setup': [
        'sudo apt update',
        'sudo apt install -y nodejs npm',
        'sudo mkdir -p /opt/discord-bot-production',
        'sudo chown discord-bot:discord-bot /opt/discord-bot-production'
      ].join(' && ')
    }
  }
}
```

## Clustering and Load Balancing

Utilizing PM2 clustering for better performance and reliability.

### Cluster Configuration

```javascript
// Advanced PM2 cluster configuration

const os = require('os')
const cluster = require('cluster')

// Calculate optimal cluster settings
const calculateClusterConfig = () => {
  const cpus = os.cpus().length
  const totalMemory = os.totalmem() / 1024 / 1024 / 1024 // GB

  // Reserve 1 CPU for system and 2GB for system
  const availableCpus = Math.max(1, cpus - 1)
  const availableMemory = Math.max(2, totalMemory - 2)

  // Estimate memory per instance (Discord.js + overhead)
  const memoryPerInstance = 512 // MB
  const maxInstancesByMemory = Math.floor((availableMemory * 1024) / memoryPerInstance)

  // Use the minimum of CPU-based and memory-based calculations
  const optimalInstances = Math.min(availableCpus, maxInstancesByMemory)

  return {
    instances: optimalInstances,
    memoryPerInstance,
    totalMemory: availableMemory,
    availableCpus
  }
}

const clusterConfig = calculateClusterConfig()

module.exports = {
  apps: [
    {
      name: 'discord-bot-cluster',
      script: 'dist/index.js',
      instances: clusterConfig.instances,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        CLUSTER_MODE: 'true',
        CLUSTER_ID: 0
      },
      env_production: {
        NODE_ENV: 'production',
        CLUSTER_MODE: 'true',
        NODE_OPTIONS: `--max-old-space-size=${Math.floor(clusterConfig.memoryPerInstance * 0.8)}`
      },

      // Cluster-specific configuration
      instance_var: 'CLUSTER_ID',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Resource limits
      max_memory_restart: `${clusterConfig.memoryPerInstance}M`,
      restart_delay: 1000,

      // Logging
      error_file: './logs/cluster-error.log',
      out_file: './logs/cluster-out.log',
      log_file: './logs/cluster-combined.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Health monitoring
      health_check: {
        enabled: true,
        url: 'http://localhost:$PORT/health',
        interval: 30000,
        timeout: 5000,
        fails: 3
      },

      // Environment variables for clustering
      env_production: {
        ...process.env,
        CLUSTER_COUNT: clusterConfig.instances,
        TOTAL_MEMORY: clusterConfig.totalMemory,
        AVAILABLE_CPUS: clusterConfig.availableCpus
      }
    }
  ]
}

// Cluster communication setup
if (cluster.isMaster) {
  console.log(`Master cluster setting up ${clusterConfig.instances} workers`)

  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.process.pid} is online`)
  })

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`)
    console.log('Starting a new worker')
    cluster.fork()
  })

  // IPC communication between master and workers
  cluster.on('message', (worker, message) => {
    console.log(`Master received message from worker ${worker.id}:`, message)

    // Handle inter-worker communication
    if (message.type === 'cluster_stats') {
      // Aggregate stats from all workers
      // Implementation depends on your monitoring needs
    }
  })

} else {
  console.log(`Worker ${cluster.worker.id} started`)

  // Send periodic stats to master
  setInterval(() => {
    if (process.send) {
      process.send({
        type: 'cluster_stats',
        workerId: cluster.worker.id,
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      })
    }
  }, 60000) // Every minute
}
```

### Load Balancing Strategy

```javascript
// Load balancing implementation for clustered Discord bots

const cluster = require('cluster')
const http = require('http')

class ClusterLoadBalancer {
  constructor() {
    this.workers = new Map()
    this.ports = new Map()
    this.nextWorkerId = 0

    this.setupMaster()
  }

  setupMaster() {
    if (!cluster.isMaster) return

    // Create HTTP server for health checks and metrics
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        this.handleHealthCheck(req, res)
      } else if (req.url === '/metrics') {
        this.handleMetricsRequest(req, res)
      } else {
        res.writeHead(404)
        res.end('Not found')
      }
    })

    const port = process.env.LB_PORT || 3001
    server.listen(port, () => {
      console.log(`Load balancer listening on port ${port}`)
    })

    // Handle worker events
    cluster.on('online', (worker) => {
      this.addWorker(worker)
    })

    cluster.on('exit', (worker) => {
      this.removeWorker(worker)
    })

    cluster.on('message', (worker, message) => {
      this.handleWorkerMessage(worker, message)
    })
  }

  addWorker(worker) {
    const workerPort = 3002 + this.nextWorkerId // Start from port 3002
    this.workers.set(worker.id, {
      worker,
      port: workerPort,
      healthy: true,
      load: 0,
      guilds: 0,
      uptime: Date.now()
    })
    this.ports.set(workerPort, worker.id)
    this.nextWorkerId++

    console.log(`Added worker ${worker.id} on port ${workerPort}`)

    // Send port assignment to worker
    worker.send({ type: 'port_assignment', port: workerPort })
  }

  removeWorker(worker) {
    const workerData = this.workers.get(worker.id)
    if (workerData) {
      this.ports.delete(workerData.port)
      this.workers.delete(worker.id)
      console.log(`Removed worker ${worker.id}`)
    }
  }

  handleWorkerMessage(worker, message) {
    const workerData = this.workers.get(worker.id)
    if (!workerData) return

    switch (message.type) {
      case 'stats_update':
        workerData.load = message.load || 0
        workerData.guilds = message.guilds || 0
        workerData.healthy = message.healthy !== false
        break

      case 'health_check':
        workerData.healthy = message.healthy
        break
    }
  }

  selectWorker(strategy = 'round_robin') {
    const healthyWorkers = Array.from(this.workers.values())
      .filter(w => w.healthy)

    if (healthyWorkers.length === 0) {
      throw new Error('No healthy workers available')
    }

    switch (strategy) {
      case 'round_robin':
        return this.roundRobinSelect(healthyWorkers)

      case 'least_loaded':
        return this.leastLoadedSelect(healthyWorkers)

      case 'random':
        return healthyWorkers[Math.floor(Math.random() * healthyWorkers.length)]

      default:
        return healthyWorkers[0]
    }
  }

  roundRobinSelect(workers) {
    if (!this.lastSelectedIndex) {
      this.lastSelectedIndex = 0
    }

    const worker = workers[this.lastSelectedIndex % workers.length]
    this.lastSelectedIndex = (this.lastSelectedIndex + 1) % workers.length

    return worker
  }

  leastLoadedSelect(workers) {
    return workers.reduce((min, worker) =>
      worker.load < min.load ? worker : min
    )
  }

  handleHealthCheck(req, res) {
    const health = {
      status: 'healthy',
      workers: Array.from(this.workers.values()).map(w => ({
        id: w.worker.id,
        port: w.port,
        healthy: w.healthy,
        load: w.load,
        guilds: w.guilds,
        uptime: Date.now() - w.uptime
      })),
      totalWorkers: this.workers.size,
      healthyWorkers: Array.from(this.workers.values()).filter(w => w.healthy).length
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(health, null, 2))
  }

  handleMetricsRequest(req, res) {
    const metrics = {
      total_workers: this.workers.size,
      healthy_workers: Array.from(this.workers.values()).filter(w => w.healthy).length,
      total_guilds: Array.from(this.workers.values()).reduce((sum, w) => sum + w.guilds, 0),
      average_load: Array.from(this.workers.values()).reduce((sum, w) => sum + w.load, 0) / this.workers.size,
      uptime: process.uptime()
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(metrics, null, 2))
  }

  getWorkerByPort(port) {
    const workerId = this.ports.get(port)
    return workerId ? this.workers.get(workerId) : null
  }
}

// Worker setup
if (!cluster.isMaster) {
  const loadBalancer = new ClusterLoadBalancer()

  // Listen for port assignment
  process.on('message', (message) => {
    if (message.type === 'port_assignment') {
      console.log(`Worker assigned port ${message.port}`)
      // Set up HTTP server on assigned port
      setupWorkerServer(message.port)
    }
  })

  // Send periodic stats to master
  setInterval(() => {
    if (process.send) {
      process.send({
        type: 'stats_update',
        load: Math.random() * 100, // Replace with actual load calculation
        guilds: Math.floor(Math.random() * 1000), // Replace with actual guild count
        healthy: true
      })
    }
  }, 30000)
}

function setupWorkerServer(port) {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'healthy', worker: cluster.worker.id }))
    } else {
      res.writeHead(404)
      res.end('Not found')
    }
  })

  server.listen(port, () => {
    console.log(`Worker ${cluster.worker.id} listening on port ${port}`)
  })
}
```

## Monitoring and Management

PM2 monitoring and management tools for production Discord bots.

### PM2 Monitoring Setup

```javascript
// PM2 monitoring and alerting system

const pm2 = require('pm2')
const nodemailer = require('nodemailer')

class PM2Monitor {
  constructor(options = {}) {
    this.options = {
      smtp: options.smtp || {},
      alerts: options.alerts || [],
      checkInterval: options.checkInterval || 30000,
      ...options
    }

    this.transporter = nodemailer.createTransporter(this.options.smtp)
    this.alertHistory = new Map()
    this.monitoring = false
  }

  async startMonitoring() {
    if (this.monitoring) return

    this.monitoring = true

    // Connect to PM2
    await this.connectToPM2()

    // Start monitoring loop
    this.monitoringInterval = setInterval(() => {
      this.checkProcesses()
    }, this.options.checkInterval)

    console.log('PM2 monitoring started')
  }

  async connectToPM2() {
    return new Promise((resolve, reject) => {
      pm2.connect((err) => {
        if (err) {
          console.error('Failed to connect to PM2:', err)
          reject(err)
        } else {
          console.log('Connected to PM2')
          resolve()
        }
      })
    })
  }

  async checkProcesses() {
    return new Promise((resolve, reject) => {
      pm2.list((err, processes) => {
        if (err) {
          console.error('Failed to list PM2 processes:', err)
          reject(err)
          return
        }

        this.analyzeProcesses(processes)
        resolve(processes)
      })
    })
  }

  analyzeProcesses(processes) {
    const alerts = []

    for (const process of processes) {
      const processAlerts = this.checkProcessHealth(process)
      alerts.push(...processAlerts)
    }

    // Check for missing expected processes
    const expectedProcesses = ['discord-bot-main', 'discord-bot-worker']
    const runningProcesses = processes.map(p => p.name)

    for (const expected of expectedProcesses) {
      if (!runningProcesses.includes(expected)) {
        alerts.push({
          type: 'missing_process',
          severity: 'critical',
          message: `Expected process ${expected} is not running`,
          process: expected
        })
      }
    }

    // Send alerts
    for (const alert of alerts) {
      this.sendAlert(alert)
    }
  }

  checkProcessHealth(process) {
    const alerts = []

    // Check if process is running
    if (process.pm2_env.status !== 'online') {
      alerts.push({
        type: 'process_down',
        severity: 'critical',
        message: `Process ${process.name} is ${process.pm2_env.status}`,
        process: process.name,
        status: process.pm2_env.status
      })
    }

    // Check memory usage
    const memoryMB = process.monit.memory / 1024 / 1024
    const maxMemory = process.pm2_env.max_memory_restart

    if (maxMemory && memoryMB > parseMemoryLimit(maxMemory) * 0.8) {
      alerts.push({
        type: 'high_memory',
        severity: 'warning',
        message: `Process ${process.name} memory usage: ${memoryMB.toFixed(1)}MB`,
        process: process.name,
        memory: memoryMB,
        limit: parseMemoryLimit(maxMemory)
      })
    }

    // Check CPU usage
    if (process.monit.cpu > 80) {
      alerts.push({
        type: 'high_cpu',
        severity: 'warning',
        message: `Process ${process.name} CPU usage: ${process.monit.cpu.toFixed(1)}%`,
        process: process.name,
        cpu: process.monit.cpu
      })
    }

    // Check restart count
    if (process.pm2_env.restart_time > 10) {
      alerts.push({
        type: 'frequent_restarts',
        severity: 'error',
        message: `Process ${process.name} has restarted ${process.pm2_env.restart_time} times`,
        process: process.name,
        restarts: process.pm2_env.restart_time
      })
    }

    // Check uptime
    const uptime = Date.now() - process.pm2_env.pm_uptime
    if (uptime < 60000) { // Less than 1 minute
      alerts.push({
        type: 'recent_restart',
        severity: 'info',
        message: `Process ${process.name} recently restarted (${Math.floor(uptime / 1000)}s ago)`,
        process: process.name,
        uptime
      })
    }

    return alerts
  }

  sendAlert(alert) {
    const alertKey = `${alert.type}_${alert.process || 'system'}`
    const now = Date.now()

    // Check cooldown (don't send duplicate alerts too frequently)
    const lastAlert = this.alertHistory.get(alertKey)
    if (lastAlert && now - lastAlert < 300000) { // 5 minutes
      return
    }

    this.alertHistory.set(alertKey, now)

    // Send email alert
    this.sendEmailAlert(alert)

    // Log alert
    console.error(`PM2 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`)
  }

  async sendEmailAlert(alert) {
    if (!this.transporter) return

    const mailOptions = {
      from: this.options.smtp.from || 'pm2-monitor@yourdomain.com',
      to: this.options.alerts.join(', '),
      subject: `PM2 Alert: ${alert.type} - ${alert.severity}`,
      html: `
        <h2>PM2 Process Alert</h2>
        <p><strong>Type:</strong> ${alert.type}</p>
        <p><strong>Severity:</strong> ${alert.severity}</p>
        <p><strong>Message:</strong> ${alert.message}</p>
        <p><strong>Process:</strong> ${alert.process || 'N/A'}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        ${alert.memory ? `<p><strong>Memory:</strong> ${alert.memory.toFixed(1)}MB</p>` : ''}
        ${alert.cpu ? `<p><strong>CPU:</strong> ${alert.cpu.toFixed(1)}%</p>` : ''}
        ${alert.restarts ? `<p><strong>Restarts:</strong> ${alert.restarts}</p>` : ''}
      `
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log('Alert email sent successfully')
    } catch (error) {
      console.error('Failed to send alert email:', error)
    }
  }

  parseMemoryLimit(limitString) {
    const match = limitString.match(/^(\d+)([KMGT]?)$/)
    if (!match) return 0

    const [, size, unit] = match
    const multipliers = { K: 1024, M: 1024 * 1024, G: 1024 * 1024 * 1024, T: 1024 * 1024 * 1024 * 1024 }

    return parseInt(size) * (multipliers[unit] || 1)
  }

  async stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    await new Promise((resolve) => {
      pm2.disconnect(resolve)
    })

    this.monitoring = false
    console.log('PM2 monitoring stopped')
  }

  getStats() {
    return {
      monitoring: this.monitoring,
      alertHistorySize: this.alertHistory.size,
      checkInterval: this.options.checkInterval
    }
  }
}

// Usage
const monitor = new PM2Monitor({
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-app-password'
    },
    from: 'pm2-monitor@yourdomain.com'
  },
  alerts: ['admin@yourdomain.com', 'dev@yourdomain.com']
})

monitor.startMonitoring()
```

### PM2 Plus Integration

```javascript
// PM2 Plus advanced monitoring setup

const pm2 = require('pm2')

class PM2PlusIntegration {
  constructor(options = {}) {
    this.options = {
      publicKey: options.publicKey,
      secretKey: options.secretKey,
      appName: options.appName || 'discord-bot',
      ...options
    }

    this.connected = false
  }

  async connect() {
    try {
      // Link to PM2 Plus
      await this.linkToPM2Plus()

      // Configure advanced monitoring
      await this.configureMonitoring()

      this.connected = true
      console.log('Connected to PM2 Plus')
    } catch (error) {
      console.error('Failed to connect to PM2 Plus:', error)
      throw error
    }
  }

  async linkToPM2Plus() {
    return new Promise((resolve, reject) => {
      pm2.link({
        public_key: this.options.publicKey,
        secret_key: this.options.secretKey,
        name: this.options.appName
      }, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async configureMonitoring() {
    // Configure custom metrics
    await this.setupCustomMetrics()

    // Configure alerts
    await this.setupAlerts()

    // Configure log shipping
    await this.setupLogShipping()
  }

  async setupCustomMetrics() {
    // Add custom metrics for Discord bot
    const metrics = [
      {
        name: 'guilds_connected',
        type: 'counter',
        description: 'Number of guilds the bot is connected to'
      },
      {
        name: 'commands_processed',
        type: 'counter',
        description: 'Number of commands processed'
      },
      {
        name: 'api_latency',
        type: 'histogram',
        description: 'Discord API response latency'
      },
      {
        name: 'memory_heap_used',
        type: 'gauge',
        description: 'V8 heap memory used'
      }
    ]

    for (const metric of metrics) {
      await this.registerMetric(metric)
    }
  }

  async registerMetric(metric) {
    // PM2 Plus metric registration
    // This is a simplified example
    console.log(`Registered metric: ${metric.name}`)
  }

  async setupAlerts() {
    const alerts = [
      {
        name: 'High Memory Usage',
        condition: 'memory > 80%',
        severity: 'warning',
        channels: ['email', 'slack']
      },
      {
        name: 'Process Down',
        condition: 'status != online',
        severity: 'critical',
        channels: ['email', 'sms', 'slack']
      },
      {
        name: 'High Error Rate',
        condition: 'error_rate > 5%',
        severity: 'error',
        channels: ['email']
      }
    ]

    for (const alert of alerts) {
      await this.createAlert(alert)
    }
  }

  async createAlert(alertConfig) {
    // PM2 Plus alert creation
    console.log(`Created alert: ${alertConfig.name}`)
  }

  async setupLogShipping() {
    // Configure log shipping to external services
    const logConfig = {
      elasticsearch: {
        enabled: true,
        host: 'your-elasticsearch-host',
        index: 'discord-bot-logs'
      },
      datadog: {
        enabled: true,
        apiKey: this.options.datadogApiKey
      }
    }

    await this.configureLogShipping(logConfig)
  }

  async configureLogShipping(config) {
    // PM2 Plus log shipping configuration
    console.log('Configured log shipping')
  }

  async recordMetric(name, value, labels = {}) {
    if (!this.connected) return

    // Record custom metric
    pm2.emit('pm2:custom_metric', {
      name,
      value,
      labels
    })
  }

  async disconnect() {
    if (this.connected) {
      await new Promise((resolve) => {
        pm2.unlink((err) => {
          if (err) console.error('Error unlinking from PM2 Plus:', err)
          resolve()
        })
      })

      this.connected = false
      console.log('Disconnected from PM2 Plus')
    }
  }
}

// Usage in Discord bot
class DiscordBotWithPM2Plus {
  constructor(client) {
    this.client = client
    this.pm2Plus = new PM2PlusIntegration({
      publicKey: process.env.PM2_PLUS_PUBLIC_KEY,
      secretKey: process.env.PM2_PLUS_SECRET_KEY,
      appName: 'discord-bot-production'
    })

    this.metrics = {
      guilds: 0,
      commands: 0,
      apiCalls: []
    }

    this.setupMetricsCollection()
  }

  async initialize() {
    await this.pm2Plus.connect()
  }

  setupMetricsCollection() {
    // Update guild count
    this.client.on('guildCreate', () => {
      this.metrics.guilds++
      this.pm2Plus.recordMetric('guilds_connected', this.metrics.guilds)
    })

    this.client.on('guildDelete', () => {
      this.metrics.guilds--
      this.pm2Plus.recordMetric('guilds_connected', this.metrics.guilds)
    })

    // Track commands
    // Assuming you have a command handler
    this.client.on('commandExecuted', (command) => {
      this.metrics.commands++
      this.pm2Plus.recordMetric('commands_processed', this.metrics.commands, {
        command: command.name
      })
    })

    // Track memory usage
    setInterval(() => {
      const memUsage = process.memoryUsage()
      this.pm2Plus.recordMetric('memory_heap_used', memUsage.heapUsed)
    }, 30000)

    // Track API latency (simplified)
    const originalRequest = this.client.rest.request
    this.client.rest.request = async (...args) => {
      const start = Date.now()
      const result = await originalRequest.apply(this.client.rest, args)
      const latency = Date.now() - start

      this.metrics.apiCalls.push(latency)
      if (this.metrics.apiCalls.length > 100) {
        this.metrics.apiCalls.shift()
      }

      const avgLatency = this.metrics.apiCalls.reduce((a, b) => a + b, 0) / this.metrics.apiCalls.length
      this.pm2Plus.recordMetric('api_latency', avgLatency)

      return result
    }
  }

  async shutdown() {
    await this.pm2Plus.disconnect()
  }
}
```

## Best Practices

### Implementation Guidelines

1. **Use cluster mode** for better performance and reliability
2. **Configure proper resource limits** to prevent memory issues
3. **Set up comprehensive monitoring** with PM2 Plus or custom solutions
4. **Implement graceful shutdown** handling for zero-downtime deployments
5. **Use PM2 deployment** features for streamlined releases
6. **Configure log rotation** to manage disk space usage
7. **Set up automated restarts** for crashed processes
8. **Monitor process metrics** and set up alerting
9. **Use environment-specific configurations** for different deployments
10. **Implement health checks** for process monitoring

### Production Considerations

```javascript
// Complete PM2 production setup

const pm2 = require('pm2')
const { Client, GatewayIntentBits } = require('discord.js')

class ProductionPM2Manager {
  constructor(config) {
    this.config = config
    this.client = null
    this.pm2Plus = null
    this.monitoring = null

    this.setupProcessManagement()
  }

  setupProcessManagement() {
    // Handle PM2 process messages
    process.on('message', (message) => {
      this.handlePM2Message(message)
    })

    // Graceful shutdown handling
    process.on('SIGINT', () => this.gracefulShutdown())
    process.on('SIGTERM', () => this.gracefulShutdown())

    // Send ready signal to PM2
    if (process.send) {
      process.send('ready')
    }
  }

  handlePM2Message(message) {
    switch (message.type) {
      case 'port_assignment':
        console.log(`PM2 assigned port: ${message.port}`)
        // Set up HTTP server on assigned port if needed
        break

      case 'shutdown':
        console.log('PM2 requested shutdown')
        this.gracefulShutdown()
        break

      default:
        console.log('Received PM2 message:', message)
    }
  }

  async initializeBot() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    })

    // Set up PM2 Plus integration
    if (this.config.pm2Plus) {
      const DiscordBotWithPM2Plus = require('./discord-bot-pm2-plus')
      this.pm2Plus = new DiscordBotWithPM2Plus(this.client)
      await this.pm2Plus.initialize()
    }

    // Set up monitoring
    if (this.config.monitoring) {
      const PM2Monitor = require('./pm2-monitor')
      this.monitoring = new PM2Monitor(this.config.monitoring)
      await this.monitoring.startMonitoring()
    }

    // Bot event handlers
    this.client.on('ready', () => {
      console.log(`Bot ready as ${this.client.user.tag}`)

      // Send online status to PM2
      if (process.send) {
        process.send({
          type: 'process:msg',
          data: {
            status: 'online',
            guilds: this.client.guilds.cache.size,
            users: this.client.users.cache.size
          }
        })
      }
    })

    this.client.on('error', (error) => {
      console.error('Discord client error:', error)

      // Send error status to PM2
      if (process.send) {
        process.send({
          type: 'process:msg',
          data: {
            status: 'error',
            error: error.message
          }
        })
      }
    })

    // Login
    await this.client.login(this.config.discord.token)
  }

  async gracefulShutdown() {
    console.log('Starting graceful shutdown...')

    try {
      // Disconnect from Discord
      if (this.client) {
        await this.client.destroy()
      }

      // Stop monitoring
      if (this.monitoring) {
        await this.monitoring.stopMonitoring()
      }

      // Disconnect from PM2 Plus
      if (this.pm2Plus) {
        await this.pm2Plus.shutdown()
      }

      console.log('Graceful shutdown completed')

      // Exit with success
      process.exit(0)
    } catch (error) {
      console.error('Error during graceful shutdown:', error)
      process.exit(1)
    }
  }

  getStats() {
    return {
      guilds: this.client?.guilds.cache.size || 0,
      users: this.client?.users.cache.size || 0,
      uptime: this.client?.uptime || 0,
      pm2PlusConnected: this.pm2Plus?.connected || false,
      monitoringActive: this.monitoring?.monitoring || false
    }
  }
}

// PM2 ecosystem configuration for production
module.exports = {
  apps: [
    {
      name: 'discord-bot-production',
      script: 'dist/production-pm2-manager.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PM2_CLUSTER_MODE: 'true',
        DISCORD_TOKEN: process.env.DISCORD_TOKEN,
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
        PM2_PLUS_PUBLIC_KEY: process.env.PM2_PLUS_PUBLIC_KEY,
        PM2_PLUS_SECRET_KEY: process.env.PM2_PLUS_SECRET_KEY
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      autorestart: true,
      min_uptime: '10s',
      max_restarts: 5,
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 15000,
      // PM2 Plus configuration
      pm2_plus: {
        enabled: true,
        public_key: process.env.PM2_PLUS_PUBLIC_KEY,
        secret_key: process.env.PM2_PLUS_SECRET_KEY
      }
    }
  ]
}
```

This comprehensive PM2 deployment guide provides production-ready process management with clustering, monitoring, and operational excellence for Discord bots.