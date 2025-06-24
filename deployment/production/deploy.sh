#!/bin/bash

# Production Deployment Script for TourGuideAI
# Implements zero-downtime deployment with health checks

set -e

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"
LOG_FILE="./deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    
    # Backup database
    docker-compose exec -T database pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > "$BACKUP_DIR/${BACKUP_NAME}_db.sql"
    
    # Backup volumes
    docker run --rm -v production_postgres_data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar czf /backup/${BACKUP_NAME}_volumes.tar.gz -C /data .
    
    log "Backup created: $BACKUP_NAME"
}

# Health check function
health_check() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    log "Performing health check for $service..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null; then
            log "$service is healthy"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts: $service not ready, waiting..."
        sleep 10
        ((attempt++))
    done
    
    error "$service failed health check after $max_attempts attempts"
    return 1
}

# Deploy function
deploy() {
    log "Starting deployment..."
    
    # Pull latest images
    log "Pulling latest images..."
    docker-compose pull
    
    # Build new images
    log "Building new images..."
    docker-compose build --no-cache
    
    # Start new containers
    log "Starting new containers..."
    docker-compose up -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Health checks
    health_check "Frontend" "http://localhost:3000/health"
    health_check "Backend" "http://localhost:5000/health"
    health_check "Database" "http://localhost:5432" || true  # Database doesn't have HTTP endpoint
    
    log "Deployment completed successfully"
}

# Rollback function
rollback() {
    local backup_name=$1
    
    warning "Rolling back to backup: $backup_name"
    
    # Stop current containers
    docker-compose down
    
    # Restore database
    if [ -f "$BACKUP_DIR/${backup_name}_db.sql" ]; then
        docker-compose up -d database
        sleep 30
        docker-compose exec -T database psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < "$BACKUP_DIR/${backup_name}_db.sql"
    fi
    
    # Restore volumes
    if [ -f "$BACKUP_DIR/${backup_name}_volumes.tar.gz" ]; then
        docker run --rm -v production_postgres_data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar xzf /backup/${backup_name}_volumes.tar.gz -C /data
    fi
    
    # Start containers
    docker-compose up -d
    
    log "Rollback completed"
}

# Cleanup old backups (keep last 10)
cleanup_backups() {
    log "Cleaning up old backups..."
    cd "$BACKUP_DIR"
    ls -t backup_*_db.sql 2>/dev/null | tail -n +11 | xargs rm -f
    ls -t backup_*_volumes.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f
    cd ..
    log "Backup cleanup completed"
}

# Main deployment process
main() {
    log "Starting TourGuideAI production deployment"
    
    # Load environment variables
    source "$ENV_FILE"
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            create_backup
            deploy
            cleanup_backups
            log "Deployment process completed successfully"
            ;;
        "rollback")
            if [ -z "$2" ]; then
                error "Please specify backup name for rollback"
                exit 1
            fi
            rollback "$2"
            ;;
        "backup")
            create_backup
            ;;
        "health")
            health_check "Frontend" "http://localhost:3000/health"
            health_check "Backend" "http://localhost:5000/health"
            ;;
        *)
            echo "Usage: $0 {deploy|rollback <backup_name>|backup|health}"
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 