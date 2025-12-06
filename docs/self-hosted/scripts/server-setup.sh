#!/bin/bash
#===============================================================================
# SouqShamy Server Setup Script
# Ubuntu 24.04 LTS Security Hardening
#
# Run as root on a fresh Ubuntu 24.04 server
# Usage: chmod +x server-setup.sh && ./server-setup.sh
#===============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_USER="deploy"
SSH_PORT="22"
SWAP_SIZE="4G"
TIMEZONE="UTC"

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------

print_header() {
    echo ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

check_ubuntu() {
    if [[ ! -f /etc/os-release ]]; then
        print_error "Cannot detect OS version"
        exit 1
    fi

    source /etc/os-release
    if [[ "$ID" != "ubuntu" ]]; then
        print_warning "This script is designed for Ubuntu, running on: $ID"
    fi

    print_info "Running on: $PRETTY_NAME"
}

#-------------------------------------------------------------------------------
# System Update
#-------------------------------------------------------------------------------

update_system() {
    print_header "Updating System Packages"

    apt update
    DEBIAN_FRONTEND=noninteractive apt upgrade -y

    print_success "System updated"
}

install_essential_packages() {
    print_header "Installing Essential Packages"

    DEBIAN_FRONTEND=noninteractive apt install -y \
        curl \
        wget \
        git \
        vim \
        htop \
        tmux \
        ufw \
        fail2ban \
        unzip \
        jq \
        net-tools \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        rsync \
        ncdu \
        iotop \
        logrotate \
        cron

    print_success "Essential packages installed"
}

#-------------------------------------------------------------------------------
# User Setup
#-------------------------------------------------------------------------------

create_deploy_user() {
    print_header "Creating Deploy User"

    # Check if user exists
    if id "$DEPLOY_USER" &>/dev/null; then
        print_warning "User $DEPLOY_USER already exists, skipping creation"
    else
        # Create user without password
        adduser --disabled-password --gecos "Deploy User" $DEPLOY_USER
        print_success "User $DEPLOY_USER created"
    fi

    # Add to sudo group
    usermod -aG sudo $DEPLOY_USER
    print_success "Added $DEPLOY_USER to sudo group"

    # Allow sudo without password
    echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$DEPLOY_USER
    chmod 440 /etc/sudoers.d/$DEPLOY_USER
    print_success "Configured passwordless sudo"

    # Setup SSH directory
    mkdir -p /home/$DEPLOY_USER/.ssh
    chmod 700 /home/$DEPLOY_USER/.ssh

    # Copy SSH keys from root
    if [[ -f /root/.ssh/authorized_keys ]]; then
        cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/
        chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
        chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
        print_success "Copied SSH keys to $DEPLOY_USER"
    else
        print_warning "No SSH keys found in /root/.ssh/authorized_keys"
        print_warning "You will need to add SSH keys manually to /home/$DEPLOY_USER/.ssh/authorized_keys"
    fi
}

#-------------------------------------------------------------------------------
# SSH Hardening
#-------------------------------------------------------------------------------

configure_ssh() {
    print_header "Configuring SSH Security"

    # Backup original config
    if [[ ! -f /etc/ssh/sshd_config.original ]]; then
        cp /etc/ssh/sshd_config /etc/ssh/sshd_config.original
        print_success "Original SSH config backed up"
    fi

    # Create hardened SSH config
    cat > /etc/ssh/sshd_config.d/99-hardened.conf << EOF
# SouqShamy SSH Hardening Configuration
# Generated: $(date)

# Disable root login
PermitRootLogin no

# Disable password authentication
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM yes

# Only allow deploy user
AllowUsers $DEPLOY_USER

# Strong encryption
Ciphers aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256
KexAlgorithms curve25519-sha256@libssh.org,ecdh-sha2-nistp521,ecdh-sha2-nistp384,ecdh-sha2-nistp256,diffie-hellman-group-exchange-sha256

# Timeouts and limits
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 60
MaxAuthTries 3
MaxSessions 10

# Disable dangerous features
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
PermitTunnel no

# Logging
LogLevel VERBOSE
EOF

    # Validate SSH config
    if sshd -t; then
        print_success "SSH configuration is valid"
        systemctl restart sshd
        print_success "SSH service restarted"
    else
        print_error "SSH configuration is invalid!"
        rm /etc/ssh/sshd_config.d/99-hardened.conf
        print_warning "Reverted SSH configuration"
        return 1
    fi

    print_warning "IMPORTANT: Test SSH login with $DEPLOY_USER before logging out!"
    print_warning "Command: ssh $DEPLOY_USER@$(hostname -I | awk '{print $1}')"
}

#-------------------------------------------------------------------------------
# Firewall Setup
#-------------------------------------------------------------------------------

configure_firewall() {
    print_header "Configuring UFW Firewall"

    # Reset UFW
    ufw --force reset

    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH (CRITICAL - do this first)
    ufw allow $SSH_PORT/tcp comment 'SSH'
    print_success "SSH port $SSH_PORT allowed"

    # Allow HTTP and HTTPS
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    print_success "HTTP/HTTPS allowed"

    # Enable UFW
    ufw --force enable
    print_success "UFW firewall enabled"

    # Show status
    ufw status verbose
}

#-------------------------------------------------------------------------------
# Fail2Ban Setup
#-------------------------------------------------------------------------------

configure_fail2ban() {
    print_header "Configuring Fail2Ban"

    # Create jail configuration
    cat > /etc/fail2ban/jail.local << EOF
# SouqShamy Fail2Ban Configuration
# Generated: $(date)

[DEFAULT]
# Ban for 1 hour
bantime = 3600

# Detection window of 10 minutes
findtime = 600

# Max 5 retries
maxretry = 5

# Ignore localhost
ignoreip = 127.0.0.1/8 ::1

# Action to take
banaction = iptables-multiport
banaction_allports = iptables-allports

# Email notifications (optional - configure if needed)
# destemail = admin@souqshamy.com
# sender = fail2ban@souqshamy.com
# action = %(action_mwl)s

[sshd]
enabled = true
port = $SSH_PORT
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[sshd-ddos]
enabled = true
port = $SSH_PORT
filter = sshd-ddos
logpath = /var/log/auth.log
maxretry = 10
bantime = 48000
EOF

    # Enable and start fail2ban
    systemctl enable fail2ban
    systemctl restart fail2ban

    # Wait for service to start
    sleep 2

    # Show status
    if fail2ban-client status sshd &>/dev/null; then
        print_success "Fail2Ban configured and running"
        fail2ban-client status sshd
    else
        print_warning "Fail2Ban is starting, check status with: fail2ban-client status"
    fi
}

#-------------------------------------------------------------------------------
# System Configuration
#-------------------------------------------------------------------------------

configure_timezone() {
    print_header "Configuring Timezone"

    timedatectl set-timezone $TIMEZONE
    timedatectl set-ntp true

    print_success "Timezone set to $TIMEZONE"
    timedatectl status
}

configure_system_limits() {
    print_header "Configuring System Limits"

    # File descriptor limits
    cat >> /etc/security/limits.conf << EOF

# SouqShamy - Docker/Supabase limits
* soft nofile 65535
* hard nofile 65535
* soft nproc 65535
* hard nproc 65535
root soft nofile 65535
root hard nofile 65535
EOF

    print_success "File limits configured"

    # Sysctl network tuning
    cat > /etc/sysctl.d/99-supabase.conf << EOF
# SouqShamy Network and Performance Tuning
# Generated: $(date)

# Network connection limits
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# Network buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.rmem_default = 1048576
net.core.wmem_default = 1048576
net.ipv4.tcp_rmem = 4096 1048576 16777216
net.ipv4.tcp_wmem = 4096 1048576 16777216

# TCP optimization
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_max_tw_buckets = 2000000
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_slow_start_after_idle = 0

# BBR congestion control (if available)
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# Security settings
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0

# Memory management
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 2
vm.overcommit_memory = 1

# File system
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288
fs.inotify.max_user_instances = 8192
EOF

    # Apply sysctl settings
    sysctl --system > /dev/null 2>&1
    print_success "Sysctl settings applied"
}

create_swap() {
    print_header "Creating Swap Space"

    # Check if swap already exists
    if swapon --show | grep -q "/swapfile"; then
        print_warning "Swap file already exists"
        swapon --show
        return
    fi

    # Create swap file
    fallocate -l $SWAP_SIZE /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile

    # Make permanent
    if ! grep -q "/swapfile" /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi

    print_success "Swap space created: $SWAP_SIZE"
    free -h
}

#-------------------------------------------------------------------------------
# Additional Security
#-------------------------------------------------------------------------------

disable_unnecessary_services() {
    print_header "Disabling Unnecessary Services"

    # List of services to disable if they exist
    SERVICES_TO_DISABLE="cups cups-browsed avahi-daemon bluetooth"

    for service in $SERVICES_TO_DISABLE; do
        if systemctl is-active --quiet $service 2>/dev/null; then
            systemctl stop $service
            systemctl disable $service
            print_success "Disabled: $service"
        fi
    done
}

configure_logrotate() {
    print_header "Configuring Log Rotation"

    cat > /etc/logrotate.d/supabase << EOF
# SouqShamy/Supabase log rotation
/var/log/supabase/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    create 0640 root adm
}
EOF

    print_success "Log rotation configured"
}

#-------------------------------------------------------------------------------
# Verification
#-------------------------------------------------------------------------------

verify_setup() {
    print_header "Verification Summary"

    echo ""
    echo "System Information:"
    echo "-------------------"
    hostnamectl | head -5
    echo ""

    echo "Resources:"
    echo "----------"
    echo "CPU: $(nproc) cores"
    echo "RAM: $(free -h | awk '/Mem:/ {print $2}')"
    echo "Swap: $(free -h | awk '/Swap:/ {print $2}')"
    echo "Disk: $(df -h / | awk 'NR==2 {print $4}') available"
    echo ""

    echo "Network:"
    echo "--------"
    echo "IP Address: $(hostname -I | awk '{print $1}')"
    echo ""

    echo "Services Status:"
    echo "----------------"
    systemctl is-active --quiet sshd && echo "[OK] SSH" || echo "[FAILED] SSH"
    systemctl is-active --quiet ufw && echo "[OK] UFW Firewall" || echo "[FAILED] UFW"
    systemctl is-active --quiet fail2ban && echo "[OK] Fail2Ban" || echo "[FAILED] Fail2Ban"
    echo ""

    echo "Firewall Status:"
    echo "----------------"
    ufw status | grep -E "^(Status|22|80|443)"
    echo ""

    echo "User Setup:"
    echo "-----------"
    id $DEPLOY_USER 2>/dev/null && echo "[OK] User $DEPLOY_USER exists" || echo "[FAILED] User $DEPLOY_USER"
    [[ -f /home/$DEPLOY_USER/.ssh/authorized_keys ]] && echo "[OK] SSH keys configured" || echo "[WARNING] No SSH keys"
    echo ""
}

print_next_steps() {
    local SERVER_IP=$(hostname -I | awk '{print $1}')

    print_header "Setup Complete!"

    echo ""
    echo -e "${GREEN}Server setup completed successfully!${NC}"
    echo ""
    echo "IMPORTANT NEXT STEPS:"
    echo "====================="
    echo ""
    echo "1. TEST SSH LOGIN (in a new terminal, before logging out):"
    echo "   ssh $DEPLOY_USER@$SERVER_IP"
    echo ""
    echo "2. If SSH works, you can safely log out of root"
    echo ""
    echo "3. Copy the Docker installation script and run it:"
    echo "   scp install-docker.sh $DEPLOY_USER@$SERVER_IP:/home/$DEPLOY_USER/"
    echo "   ssh $DEPLOY_USER@$SERVER_IP"
    echo "   chmod +x install-docker.sh && ./install-docker.sh"
    echo ""
    echo "4. Configure your domain DNS to point to: $SERVER_IP"
    echo ""
    echo "CONNECTION DETAILS:"
    echo "==================="
    echo "Server IP: $SERVER_IP"
    echo "SSH User:  $DEPLOY_USER"
    echo "SSH Port:  $SSH_PORT"
    echo ""
    echo "Save these details securely!"
    echo ""
}

#-------------------------------------------------------------------------------
# Main Execution
#-------------------------------------------------------------------------------

main() {
    print_header "SouqShamy Server Setup Script"
    echo "This script will configure your Ubuntu 24.04 server for Supabase hosting"
    echo ""

    check_root
    check_ubuntu

    echo ""
    read -p "Continue with setup? (y/n): " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Setup cancelled"
        exit 0
    fi

    # Run setup steps
    update_system
    install_essential_packages
    create_deploy_user
    configure_timezone
    configure_system_limits
    create_swap
    configure_firewall
    configure_fail2ban
    configure_ssh
    disable_unnecessary_services
    configure_logrotate

    # Verification
    verify_setup
    print_next_steps
}

# Run main function
main "$@"
