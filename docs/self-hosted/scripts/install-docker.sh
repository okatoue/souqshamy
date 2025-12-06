#!/bin/bash
#===============================================================================
# SouqShamy Docker Installation Script
# For Ubuntu 24.04 LTS
#
# Run as deploy user (with sudo access)
# Usage: chmod +x install-docker.sh && ./install-docker.sh
#===============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_DIR="/opt/supabase"
REGISTRY_DIR="/opt/docker-registry"

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

check_not_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should NOT be run as root"
        print_info "Run as: ./install-docker.sh (as deploy user)"
        exit 1
    fi
}

check_sudo() {
    if ! sudo -v &>/dev/null; then
        print_error "User does not have sudo access"
        exit 1
    fi
}

#-------------------------------------------------------------------------------
# Docker Installation
#-------------------------------------------------------------------------------

remove_old_docker() {
    print_header "Removing Old Docker Versions"

    # Remove old versions if they exist
    sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    sudo apt autoremove -y

    print_success "Old Docker versions removed (if any)"
}

install_docker_prerequisites() {
    print_header "Installing Docker Prerequisites"

    sudo apt update
    sudo apt install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    print_success "Prerequisites installed"
}

add_docker_repository() {
    print_header "Adding Docker Repository"

    # Create keyrings directory
    sudo install -m 0755 -d /etc/apt/keyrings

    # Add Docker's official GPG key
    if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
            sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg
        print_success "Docker GPG key added"
    else
        print_info "Docker GPG key already exists"
    fi

    # Add Docker repository
    if [[ ! -f /etc/apt/sources.list.d/docker.list ]]; then
        echo \
            "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
            $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
            sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        print_success "Docker repository added"
    else
        print_info "Docker repository already exists"
    fi
}

install_docker_engine() {
    print_header "Installing Docker Engine"

    sudo apt update
    sudo apt install -y \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin

    print_success "Docker Engine installed"
}

configure_docker_user() {
    print_header "Configuring Docker User Permissions"

    # Add current user to docker group
    sudo usermod -aG docker $USER
    print_success "User $USER added to docker group"

    print_warning "You need to log out and back in for group changes to take effect"
    print_info "Or run: newgrp docker"
}

configure_docker_daemon() {
    print_header "Configuring Docker Daemon"

    sudo mkdir -p /etc/docker

    # Create optimized daemon configuration
    sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "userland-proxy": false,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65535,
      "Soft": 65535
    }
  },
  "metrics-addr": "127.0.0.1:9323",
  "experimental": false,
  "features": {
    "buildkit": true
  }
}
EOF

    print_success "Docker daemon configured"
}

start_docker_service() {
    print_header "Starting Docker Service"

    sudo systemctl enable docker
    sudo systemctl start docker

    # Wait for Docker to be ready
    sleep 3

    if sudo systemctl is-active --quiet docker; then
        print_success "Docker service is running"
    else
        print_error "Docker service failed to start"
        sudo systemctl status docker
        exit 1
    fi
}

#-------------------------------------------------------------------------------
# Supabase Directory Setup
#-------------------------------------------------------------------------------

create_supabase_directories() {
    print_header "Creating Supabase Directories"

    # Main Supabase directory
    sudo mkdir -p $SUPABASE_DIR
    sudo chown -R $USER:$USER $SUPABASE_DIR

    # Subdirectories
    mkdir -p $SUPABASE_DIR/volumes/db/data
    mkdir -p $SUPABASE_DIR/volumes/storage
    mkdir -p $SUPABASE_DIR/volumes/functions
    mkdir -p $SUPABASE_DIR/volumes/logs
    mkdir -p $SUPABASE_DIR/volumes/kong
    mkdir -p $SUPABASE_DIR/docker-images

    print_success "Supabase directories created at $SUPABASE_DIR"
    ls -la $SUPABASE_DIR
}

#-------------------------------------------------------------------------------
# Docker Registry Setup (for Air-Gapped Updates)
#-------------------------------------------------------------------------------

setup_local_registry() {
    print_header "Setting Up Local Docker Registry"

    # Create registry directory
    sudo mkdir -p $REGISTRY_DIR/data
    sudo chown -R $USER:$USER $REGISTRY_DIR

    # We'll start the registry using newgrp to apply docker group
    print_info "Local registry setup prepared at $REGISTRY_DIR"
    print_info "Registry will be started after group changes are applied"
}

#-------------------------------------------------------------------------------
# Docker Network Setup
#-------------------------------------------------------------------------------

create_docker_networks() {
    print_header "Creating Docker Networks"

    # Apply docker group first
    sg docker -c "docker network create supabase-network 2>/dev/null || true"

    print_success "Docker network 'supabase-network' created"
}

#-------------------------------------------------------------------------------
# Verification
#-------------------------------------------------------------------------------

verify_docker_installation() {
    print_header "Verifying Docker Installation"

    echo "Docker Version:"
    echo "---------------"
    docker --version
    echo ""

    echo "Docker Compose Version:"
    echo "-----------------------"
    docker compose version
    echo ""

    echo "Docker Info:"
    echo "------------"
    sg docker -c "docker info" 2>/dev/null | grep -E "Server Version|Storage Driver|Cgroup|Kernel|Operating System"
    echo ""

    echo "Docker Service Status:"
    echo "----------------------"
    sudo systemctl is-active docker && echo "Docker: Running" || echo "Docker: Not Running"
    echo ""
}

test_docker() {
    print_header "Testing Docker"

    # Test with hello-world
    print_info "Running hello-world container..."

    if sg docker -c "docker run --rm hello-world" &>/dev/null; then
        print_success "Docker is working correctly!"
    else
        print_warning "Docker test failed. Trying with newgrp..."
        print_info "Please run: newgrp docker && docker run --rm hello-world"
    fi
}

#-------------------------------------------------------------------------------
# Firewall Configuration for Docker
#-------------------------------------------------------------------------------

configure_firewall_for_docker() {
    print_header "Configuring Firewall for Docker"

    # Allow Docker registry port (internal use)
    # sudo ufw allow from 127.0.0.1 to any port 5000 comment 'Docker Registry (local)'

    # Note: Docker manages its own iptables rules
    print_info "Docker manages its own iptables rules for container networking"
    print_info "UFW rules for 80/443 already allow Supabase traffic"
}

#-------------------------------------------------------------------------------
# Print Summary
#-------------------------------------------------------------------------------

print_summary() {
    print_header "Docker Installation Complete!"

    local SERVER_IP=$(hostname -I | awk '{print $1}')

    echo ""
    echo "INSTALLATION SUMMARY"
    echo "===================="
    echo ""
    echo "Docker Version: $(docker --version | awk '{print $3}' | tr -d ',')"
    echo "Compose Version: $(docker compose version | awk '{print $4}')"
    echo ""
    echo "Directories Created:"
    echo "  - $SUPABASE_DIR (Supabase installation)"
    echo "  - $REGISTRY_DIR (Local Docker registry)"
    echo ""
    echo "Docker Networks:"
    echo "  - supabase-network"
    echo ""

    echo -e "${YELLOW}IMPORTANT: Apply Docker Group Changes${NC}"
    echo "======================================="
    echo ""
    echo "To use Docker without sudo, run ONE of these:"
    echo ""
    echo "  Option 1: Log out and log back in"
    echo ""
    echo "  Option 2: Run this command:"
    echo "    newgrp docker"
    echo ""
    echo "Then verify with:"
    echo "    docker run --rm hello-world"
    echo ""

    echo "NEXT STEPS"
    echo "=========="
    echo ""
    echo "1. Apply Docker group changes (see above)"
    echo ""
    echo "2. Configure your domain DNS to point to: $SERVER_IP"
    echo "   - api.yourdomain.com -> $SERVER_IP"
    echo "   - studio.yourdomain.com -> $SERVER_IP"
    echo "   - storage.yourdomain.com -> $SERVER_IP"
    echo ""
    echo "3. Proceed to Phase 2: Supabase Deployment"
    echo "   - Pull Docker images on an unrestricted machine"
    echo "   - Transfer images to this server"
    echo "   - Deploy Supabase with docker-compose"
    echo ""
}

#-------------------------------------------------------------------------------
# Create Helper Scripts
#-------------------------------------------------------------------------------

create_helper_scripts() {
    print_header "Creating Helper Scripts"

    # Docker cleanup script
    cat > $SUPABASE_DIR/cleanup-docker.sh << 'EOF'
#!/bin/bash
# Docker cleanup script - removes unused resources

echo "Cleaning up Docker resources..."

# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -f

# Remove unused volumes (careful - don't run on production without checking)
# docker volume prune -f

# Remove unused networks
docker network prune -f

# Show disk usage
docker system df

echo "Cleanup complete!"
EOF
    chmod +x $SUPABASE_DIR/cleanup-docker.sh
    print_success "Created cleanup-docker.sh"

    # Docker status script
    cat > $SUPABASE_DIR/docker-status.sh << 'EOF'
#!/bin/bash
# Docker status script

echo "========================================"
echo "Docker System Status"
echo "========================================"
echo ""

echo "Running Containers:"
echo "-------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "Docker Disk Usage:"
echo "------------------"
docker system df
echo ""

echo "Network Status:"
echo "---------------"
docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}"
echo ""
EOF
    chmod +x $SUPABASE_DIR/docker-status.sh
    print_success "Created docker-status.sh"

    print_info "Helper scripts created in $SUPABASE_DIR"
}

#-------------------------------------------------------------------------------
# Main Execution
#-------------------------------------------------------------------------------

main() {
    print_header "SouqShamy Docker Installation Script"
    echo "This script will install Docker and prepare for Supabase deployment"
    echo ""

    check_not_root
    check_sudo

    echo ""
    read -p "Continue with Docker installation? (y/n): " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Installation cancelled"
        exit 0
    fi

    # Run installation steps
    remove_old_docker
    install_docker_prerequisites
    add_docker_repository
    install_docker_engine
    configure_docker_daemon
    start_docker_service
    configure_docker_user
    create_supabase_directories
    setup_local_registry
    create_docker_networks
    configure_firewall_for_docker
    create_helper_scripts

    # Verification
    verify_docker_installation
    test_docker
    print_summary
}

# Run main function
main "$@"
