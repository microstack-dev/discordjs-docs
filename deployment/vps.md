# VPS Deployment

Discord.js v14.25.1 VPS deployment guide for production bots. This section covers server setup, security hardening, performance optimization, and operational procedures for VPS hosting.

## Server Provisioning

Setting up a production-ready VPS for Discord bot hosting.

### Initial Server Setup

```bash
#!/bin/bash

# VPS Initial Setup Script
# Run this immediately after provisioning your VPS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP=""
SERVER_USER="discord-bot"
SSH_KEY_PATH="$HOME/.ssh/id_rsa"

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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

# Update system packages
update_system() {
    log_step "Updating system packages..."
    apt update && apt upgrade -y
    apt autoremove -y
    apt autoclean
}

# Create bot user
create_bot_user() {
    log_step "Creating discord-bot user..."

    if id "$SERVER_USER" &>/dev/null; then
        log_warn "User $SERVER_USER already exists"
    else
        useradd -m -s /bin/bash "$SERVER_USER"
        usermod -aG sudo "$SERVER_USER"
        log_info "Created user: $SERVER_USER"
    fi

    # Set password for sudo access
    echo "$SERVER_USER:CHANGE_THIS_PASSWORD_AFTER_FIRST_LOGIN" | chpasswd

    # Create application directory
    mkdir -p /opt/discord-bot
    chown -R "$SERVER_USER:$SERVER_USER" /opt/discord-bot
}

# Configure SSH
configure_ssh() {
    log_step "Configuring SSH security..."

    # Backup original config
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

    # Configure SSH
    cat > /etc/ssh/sshd_config << EOF
# Basic SSH configuration
Port 22
AddressFamily inet
ListenAddress 0.0.0.0

# Authentication
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
PermitEmptyPasswords no

# Security
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no

# Connection settings
ClientAliveInterval 60
ClientAliveCountMax 3
MaxStartups 10:30:60

# Logging
LogLevel VERBOSE

# Allow specific users
AllowUsers $SERVER_USER
EOF

    # Restart SSH
    systemctl restart ssh
    log_info "SSH configured with key-only authentication"
}

# Set up SSH keys
setup_ssh_keys() {
    log_step "Setting up SSH keys..."

    if [[ ! -f "$SSH_KEY_PATH" ]]; then
        log_error "SSH key not found at $SSH_KEY_PATH"
        log_info "Generate SSH key: ssh-keygen -t ed25519 -C 'discord-bot@$SERVER_IP'"
        exit 1
    fi

    # Create .ssh directory for bot user
    sudo -u "$SERVER_USER" mkdir -p "/home/$SERVER_USER/.ssh"
    sudo -u "$SERVER_USER" chmod 700 "/home/$SERVER_USER/.ssh"

    # Copy public key
    sudo -u "$SERVER_USER" cp "$SSH_KEY_PATH.pub" "/home/$SERVER_USER/.ssh/authorized_keys"
    sudo -u "$SERVER_USER" chmod 600 "/home/$SERVER_USER/.ssh/authorized_keys"

    log_info "SSH key authentication configured"
}

# Configure firewall
configure_firewall() {
    log_step "Configuring firewall..."

    # Reset ufw
    ufw --force reset

    # Default policies
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH
    ufw allow ssh

    # Allow HTTP/HTTPS (for health checks, webhooks, etc.)
    ufw allow 80/tcp
    ufw allow 443/tcp

    # Rate limiting for SSH
    ufw limit ssh

    # Enable firewall
    echo "y" | ufw enable

    log_info "Firewall configured"
}

# Install essential packages
install_essentials() {
    log_step "Installing essential packages..."

    apt install -y \\
        curl \\
        wget \\
        git \\
        htop \\
        iotop \\
        sysstat \\
        ncdu \\
        tree \\
        jq \\
        unzip \\
        software-properties-common \\
        apt-transport-https \\
        ca-certificates \\
        gnupg \\
        lsb-release \\
        fail2ban \\
        rkhunter \\
        chkrootkit

    log_info "Essential packages installed"
}

# Install Node.js
install_nodejs() {
    log_step "Installing Node.js..."

    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

    apt install -y nodejs

    # Install build tools
    apt install -y build-essential

    # Verify installation
    node --version
    npm --version

    log_info "Node.js installed"
}

# Install PM2
install_pm2() {
    log_step "Installing PM2..."

    npm install -g pm2

    # Configure PM2 startup
    pm2 startup
    pm2 save

    log_info "PM2 installed and configured"
}

# Configure logrotate
configure_logrotate() {
    log_step "Configuring log rotation..."

    cat > /etc/logrotate.d/discord-bot << EOF
/opt/discord-bot/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $SERVER_USER $SERVER_USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

    log_info "Log rotation configured"
}

# Set up monitoring
setup_monitoring() {
    log_step "Setting up basic monitoring..."

    # Install monitoring tools
    apt install -y monitoring-plugins

    # Create monitoring script
    cat > /opt/discord-bot/monitor.sh << 'EOF'
#!/bin/bash

# Basic monitoring script
echo "=== System Status ==="
echo "Date: $(date)"
echo "Uptime: $(uptime -p)"
echo "Load: $(uptime | awk -F'load average:' '{ print $2 }')"
echo ""

echo "=== Disk Usage ==="
df -h /
echo ""

echo "=== Memory Usage ==="
free -h
echo ""

echo "=== Process Status ==="
if command -v pm2 &> /dev/null; then
    pm2 list
else
    ps aux | head -10
fi
echo ""

echo "=== Network Connections ==="
netstat -tlnp | grep LISTEN | head -10
EOF

    chmod +x /opt/discord-bot/monitor.sh
    chown "$SERVER_USER:$SERVER_USER" /opt/discord-bot/monitor.sh

    # Add to cron for daily reports
    echo "0 9 * * * $SERVER_USER /opt/discord-bot/monitor.sh > /opt/discord-bot/logs/daily_report_\$(date +\%Y\%m\%d).log 2>&1" | crontab -u "$SERVER_USER" -

    log_info "Basic monitoring configured"
}

# Security hardening
security_hardening() {
    log_step "Applying security hardening..."

    # Disable root login
    sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config

    # Configure fail2ban
    cat > /etc/fail2ban/jail.local << EOF
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
EOF

    systemctl enable fail2ban
    systemctl start fail2ban

    # Set up automatic security updates
    apt install -y unattended-upgrades
    dpkg-reconfigure -f noninteractive unattended-upgrades

    # Configure sysctl for security
    cat >> /etc/sysctl.conf << EOF

# Security hardening
net.ipv4.tcp_syncookies = 1
net.ipv4.ip_forward = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
EOF

    sysctl -p

    log_info "Security hardening applied"
}

# Final cleanup
final_cleanup() {
    log_step "Performing final cleanup..."

    # Clean package cache
    apt autoremove -y
    apt autoclean

    # Set proper permissions
    chown -R "$SERVER_USER:$SERVER_USER" /opt/discord-bot

    log_info "Cleanup completed"
}

# Main function
main() {
    log_info "Starting VPS setup for Discord bot..."
    log_warn "Make sure to change the default password after first login!"

    check_root
    update_system
    create_bot_user
    configure_ssh
    setup_ssh_keys
    configure_firewall
    install_essentials
    install_nodejs
    install_pm2
    configure_logrotate
    setup_monitoring
    security_hardening
    final_cleanup

    log_info "VPS setup completed successfully!"
    log_info "Next steps:"
    echo "  1. SSH to server: ssh $SERVER_USER@$SERVER_IP"
    echo "  2. Change password: passwd"
    echo "  3. Deploy your bot code to /opt/discord-bot"
    echo "  4. Configure environment variables"
    echo "  5. Start bot with PM2"
}

# Run main function
main "$@"
```

### Server Optimization

```bash
#!/bin/bash

# VPS Optimization Script
# Run this after initial setup

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Memory optimization
optimize_memory() {
    log_info "Optimizing memory settings..."

    # Configure swappiness
    echo "vm.swappiness=10" >> /etc/sysctl.conf

    # Configure cache pressure
    echo "vm.vfs_cache_pressure=50" >> /etc/sysctl.conf

    # Configure dirty ratios
    echo "vm.dirty_ratio=10" >> /etc/sysctl.conf
    echo "vm.dirty_background_ratio=5" >> /etc/sysctl.conf

    sysctl -p
}

# Network optimization
optimize_network() {
    log_info "Optimizing network settings..."

    cat >> /etc/sysctl.conf << EOF

# Network optimization
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.core.netdev_max_backlog = 5000
EOF

    sysctl -p

    # Optimize TCP settings
    cat >> /etc/security/limits.conf << EOF

* soft nofile 65536
* hard nofile 65536
root soft nofile 65536
root hard nofile 65536
EOF
}

# Disk optimization
optimize_disk() {
    log_info "Optimizing disk settings..."

    # Disable access time updates
    sed -i 's/defaults/defaults,noatime/' /etc/fstab

    # Configure I/O scheduler
    echo "deadline" > /sys/block/sda/queue/scheduler

    # Make it persistent
    cat > /etc/udev/rules.d/60-scheduler.rules << EOF
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/scheduler}="deadline"
EOF
}

# Node.js optimization
optimize_nodejs() {
    log_info "Optimizing Node.js settings..."

    # Create environment file
    cat > /etc/environment << EOF
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"
UV_THREADPOOL_SIZE=64
EOF

    # Source environment
    source /etc/environment
}

# Database optimization (if using local PostgreSQL)
optimize_database() {
    if systemctl is-active --quiet postgresql; then
        log_info "Optimizing PostgreSQL..."

        # PostgreSQL configuration
        cat >> /etc/postgresql/14/main/postgresql.conf << EOF

# Performance optimization
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
EOF

        systemctl restart postgresql
    fi
}

# Monitoring setup
setup_advanced_monitoring() {
    log_info "Setting up advanced monitoring..."

    # Install Prometheus Node Exporter
    wget https://github.com/prometheus/node_exporter/releases/download/v1.5.0/node_exporter-1.5.0.linux-amd64.tar.gz
    tar xvf node_exporter-1.5.0.linux-amd64.tar.gz
    mv node_exporter-1.5.0.linux-amd64/node_exporter /usr/local/bin/
    rm -rf node_exporter-1.5.0.linux-amd64*

    # Create systemd service
    cat > /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Prometheus Node Exporter
After=network.target

[Service]
User=node_exporter
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

    useradd -rs /bin/false node_exporter
    systemctl daemon-reload
    systemctl enable node_exporter
    systemctl start node_exporter
}

# Main optimization function
main() {
    log_info "Starting VPS optimization..."

    optimize_memory
    optimize_network
    optimize_disk
    optimize_nodejs
    optimize_database
    setup_advanced_monitoring

    log_info "VPS optimization completed!"
    log_warn "Reboot recommended for some changes to take effect"
}

main "$@"
```

## Security Hardening

Implementing comprehensive security measures for production VPS.

### SSH Security

```bash
#!/bin/bash

# Advanced SSH Security Setup

# Disable password authentication completely
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Use stronger ciphers
echo "Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com" >> /etc/ssh/sshd_config
echo "MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com" >> /etc/ssh/sshd_config
echo "KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group-exchange-sha256" >> /etc/ssh/sshd_config

# Rate limiting
echo "MaxStartups 3:30:10" >> /etc/ssh/sshd_config

# Session management
echo "ClientAliveInterval 60" >> /etc/ssh/sshd_config
echo "ClientAliveCountMax 3" >> /etc/ssh/sshd_config

# Disable unused features
echo "X11Forwarding no" >> /etc/ssh/sshd_config
echo "AllowTcpForwarding no" >> /etc/ssh/sshd_config
echo "PermitTunnel no" >> /etc/ssh/sshd_config

systemctl restart ssh
```

### Firewall Configuration

```bash
#!/bin/bash

# Advanced Firewall Configuration

# Install and configure UFW
apt install -y ufw

# Reset to defaults
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow essential services
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Rate limiting
ufw limit ssh/tcp

# Allow Discord bot outbound connections
ufw allow out to 162.159.128.0/24 port 443  # Discord API
ufw allow out to 162.159.129.0/24 port 443
ufw allow out to 162.159.130.0/24 port 443
ufw allow out to 162.159.131.0/24 port 443

# Enable logging
ufw logging on
ufw logging medium

# Enable firewall
echo "y" | ufw enable

# Install fail2ban for brute force protection
apt install -y fail2ban

# Configure fail2ban for SSH
cat > /etc/fail2ban/jail.local << EOF
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600
EOF

systemctl enable fail2ban
systemctl restart fail2ban
```

### Intrusion Detection

```bash
#!/bin/bash

# Intrusion Detection Setup

# Install and configure AIDE (file integrity checker)
apt install -y aide

# Initialize AIDE database
aideinit
mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Create cron job for daily checks
echo "0 2 * * * /usr/bin/aide.wrapper --check" | crontab -

# Install and configure RKHunter
apt install -y rkhunter

# Configure RKHunter
sed -i 's/UPDATE_MIRRORS=0/UPDATE_MIRRORS=1/' /etc/rkhunter.conf
sed -i 's/MIRRORS_MODE=1/MIRRORS_MODE=0/' /etc/rkhunter.conf

# Update RKHunter databases
rkhunter --update
rkhunter --propupd

# Create weekly scan cron job
echo "0 3 * * 0 /usr/bin/rkhunter --check --cronjob" | crontab -

# Install ClamAV antivirus
apt install -y clamav clamav-daemon

# Update virus definitions
freshclam

# Create daily scan cron job
echo "0 4 * * * /usr/bin/clamscan -r --bell -i /opt/discord-bot" | crontab -
```

### SSL/TLS Configuration

```bash
#!/bin/bash

# SSL/TLS Configuration for Nginx

# Install Certbot for Let's Encrypt
apt install -y certbot python3-certbot-nginx

# Create Nginx configuration
cat > /etc/nginx/sites-available/discord-bot << EOF
server {
    listen 80;
    server_name your-domain.com;

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/discord-bot /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx

# Obtain SSL certificate
certbot --nginx -d your-domain.com

# Configure automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## Performance Monitoring

Setting up comprehensive monitoring for VPS performance.

### System Monitoring

```javascript
const os = require('os')
const { exec } = require('child_process')

class VPSMonitor {
  constructor() {
    this.metrics = {}
    this.alerts = []
    this.thresholds = {
      cpuUsage: 80,
      memoryUsage: 85,
      diskUsage: 90,
      loadAverage: os.cpus().length * 2
    }
  }

  async collectMetrics() {
    const metrics = {
      timestamp: Date.now(),
      system: await this.getSystemMetrics(),
      process: await this.getProcessMetrics(),
      network: await this.getNetworkMetrics(),
      disk: await this.getDiskMetrics()
    }

    this.metrics = metrics
    return metrics
  }

  async getSystemMetrics() {
    const cpus = os.cpus()
    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()

    // CPU usage calculation
    let totalIdle = 0, totalTick = 0
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type]
      }
      totalIdle += cpu.times.idle
    })

    const idle = totalIdle / cpus.length
    const total = totalTick / cpus.length
    const cpuUsage = 100 - ~~(100 * idle / total)

    return {
      platform: os.platform(),
      arch: os.arch(),
      cpuCount: cpus.length,
      cpuUsage,
      totalMemory,
      freeMemory,
      usedMemory: totalMemory - freeMemory,
      memoryUsage: ((totalMemory - freeMemory) / totalMemory) * 100,
      loadAverage: os.loadavg(),
      uptime: os.uptime()
    }
  }

  async getProcessMetrics() {
    return new Promise((resolve) => {
      exec('ps aux --no-headers | wc -l', (error, stdout) => {
        const processCount = parseInt(stdout.trim())

        exec('pm2 list --json', (error, stdout) => {
          let pm2Processes = []
          try {
            pm2Processes = JSON.parse(stdout)
          } catch (e) {
            // PM2 not running or no processes
          }

          resolve({
            totalProcesses: processCount,
            pm2Processes: pm2Processes.length,
            pm2ProcessList: pm2Processes
          })
        })
      })
    })
  }

  async getNetworkMetrics() {
    return new Promise((resolve) => {
      exec('ss -tuln | wc -l', (error, stdout) => {
        const connectionCount = parseInt(stdout.trim())

        exec('vnstat -i eth0 --json', (error, stdout) => {
          let networkStats = {}
          try {
            networkStats = JSON.parse(stdout)
          } catch (e) {
            // vnstat not available
          }

          resolve({
            activeConnections: connectionCount,
            networkStats
          })
        })
      })
    })
  }

  async getDiskMetrics() {
    return new Promise((resolve) => {
      exec('df -BG / | tail -1', (error, stdout) => {
        const parts = stdout.trim().split(/\s+/)
        const totalGB = parseInt(parts[1].replace('G', ''))
        const usedGB = parseInt(parts[2].replace('G', ''))
        const availableGB = parseInt(parts[3].replace('G', ''))

        resolve({
          totalGB,
          usedGB,
          availableGB,
          usagePercent: (usedGB / totalGB) * 100
        })
      })
    })
  }

  checkThresholds() {
    const alerts = []

    if (this.metrics.system?.cpuUsage > this.thresholds.cpuUsage) {
      alerts.push({
        type: 'cpu',
        message: `High CPU usage: ${this.metrics.system.cpuUsage.toFixed(1)}%`,
        severity: 'warning'
      })
    }

    if (this.metrics.system?.memoryUsage > this.thresholds.memoryUsage) {
      alerts.push({
        type: 'memory',
        message: `High memory usage: ${this.metrics.system.memoryUsage.toFixed(1)}%`,
        severity: 'warning'
      })
    }

    if (this.metrics.disk?.usagePercent > this.thresholds.diskUsage) {
      alerts.push({
        type: 'disk',
        message: `High disk usage: ${this.metrics.disk.usagePercent.toFixed(1)}%`,
        severity: 'error'
      })
    }

    if (this.metrics.system?.loadAverage[0] > this.thresholds.loadAverage) {
      alerts.push({
        type: 'load',
        message: `High load average: ${this.metrics.system.loadAverage[0].toFixed(2)}`,
        severity: 'warning'
      })
    }

    this.alerts = alerts
    return alerts
  }

  async generateReport() {
    await this.collectMetrics()
    const alerts = this.checkThresholds()

    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      alerts,
      health: alerts.length === 0 ? 'healthy' : 'degraded'
    }
  }

  startMonitoring(interval = 30000) {
    setInterval(async () => {
      const report = await this.generateReport()

      if (report.alerts.length > 0) {
        console.warn('VPS Health Alerts:', report.alerts)
        // Send alerts to monitoring system
      }

      // Log metrics
      console.log('VPS Metrics:', {
        cpu: `${report.metrics.system.cpuUsage.toFixed(1)}%`,
        memory: `${report.metrics.system.memoryUsage.toFixed(1)}%`,
        disk: `${report.metrics.disk.usagePercent.toFixed(1)}%`,
        load: report.metrics.system.loadAverage[0].toFixed(2)
      })
    }, interval)
  }
}
```

## Backup Strategy

Implementing automated backups for VPS data.

### Automated Backups

```bash
#!/bin/bash

# VPS Backup Script

BACKUP_DIR="/opt/discord-bot/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup (PostgreSQL)
backup_database() {
    echo "Backing up database..."

    if command -v pg_dump &> /dev/null; then
        pg_dump -U discord_bot -h localhost discord_bot > "$BACKUP_DIR/db_$DATE.sql"

        # Compress database backup
        gzip "$BACKUP_DIR/db_$DATE.sql"
    fi
}

# Application data backup
backup_application() {
    echo "Backing up application data..."

    # Create tar archive of application directory
    tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" \
        --exclude='node_modules' \
        --exclude='logs' \
        --exclude='backups' \
        /opt/discord-bot/
}

# Redis backup (if using Redis persistence)
backup_redis() {
    echo "Backing up Redis data..."

    if command -v redis-cli &> /dev/null; then
        redis-cli save
        cp /var/lib/redis/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb"
    fi
}

# Configuration backup
backup_config() {
    echo "Backing up configuration..."

    # Backup environment variables (excluding sensitive data)
    env | grep -v -E "(TOKEN|SECRET|PASSWORD|KEY)" > "$BACKUP_DIR/env_$DATE.txt"

    # Backup PM2 configuration
    pm2 list --json > "$BACKUP_DIR/pm2_$DATE.json"
}

# Upload to remote storage (optional)
upload_backup() {
    local backup_file="$1"

    # Example: Upload to AWS S3
    if command -v aws &> /dev/null; then
        aws s3 cp "$backup_file" "s3://discord-bot-backups/$backup_file"
    fi

    # Example: Upload to Google Cloud Storage
    # gsutil cp "$backup_file" "gs://discord-bot-backups/$backup_file"
}

# Cleanup old backups
cleanup_old_backups() {
    echo "Cleaning up old backups..."

    # Remove local backups older than retention period
    find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.sql" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.rdb" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.txt" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.json" -mtime +$RETENTION_DAYS -delete
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"

    if [[ $backup_file == *.gz ]]; then
        if ! gzip -t "$backup_file"; then
            echo "ERROR: Backup integrity check failed for $backup_file"
            return 1
        fi
    elif [[ $backup_file == *.sql ]]; then
        # Basic SQL syntax check
        if ! head -5 "$backup_file" | grep -q "PostgreSQL database dump"; then
            echo "ERROR: Invalid SQL backup format for $backup_file"
            return 1
        fi
    fi

    echo "Backup integrity verified: $backup_file"
    return 0
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"

    # Send email notification
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "Discord Bot Backup $status" admin@example.com
    fi

    # Send Slack notification
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -X POST -H 'Content-type: application/json' \
             --data "{\"text\":\"Discord Bot Backup $status: $message\"}" \
             "$SLACK_WEBHOOK"
    fi
}

# Main backup function
main() {
    echo "Starting backup process..."

    local backup_files=()

    # Perform backups
    backup_database
    backup_application
    backup_redis
    backup_config

    # Collect backup files
    while IFS= read -r -d '' file; do
        backup_files+=("$file")
    done < <(find "$BACKUP_DIR" -name "*_$DATE.*" -print0)

    # Verify backups
    local verification_failed=false
    for file in "${backup_files[@]}"; do
        if ! verify_backup "$file"; then
            verification_failed=true
        fi
    done

    if [[ "$verification_failed" == true ]]; then
        send_notification "FAILED" "Backup verification failed"
        exit 1
    fi

    # Upload backups
    for file in "${backup_files[@]}"; do
        upload_backup "$file"
    done

    # Cleanup old backups
    cleanup_old_backups

    # Calculate backup size
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)

    send_notification "SUCCESS" "Backup completed. Total size: $total_size"

    echo "Backup process completed successfully"
}

# Run main function
main "$@"
```

## Best Practices

### Implementation Guidelines

1. **Use reputable VPS providers** with good uptime SLAs
2. **Implement comprehensive security hardening** from day one
3. **Set up automated monitoring and alerting** for system health
4. **Configure regular automated backups** with integrity verification
5. **Use SSL/TLS for all external communications**
6. **Implement proper firewall rules** and network security
7. **Monitor resource usage** and scale as needed
8. **Keep systems updated** with security patches
9. **Implement proper logging** and log rotation
10. **Plan for disaster recovery** with backup restoration testing

### Production Considerations

This comprehensive VPS deployment guide provides production-ready server setup, security hardening, performance optimization, and operational procedures for hosting Discord bots at scale.