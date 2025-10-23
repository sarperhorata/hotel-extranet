#!/bin/bash

# Hotel Extranet System Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/app/backend"
FRONTEND_DIR="$PROJECT_ROOT/app/frontend"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi

    # Check Git
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed"
        exit 1
    fi

    log_success "Prerequisites check completed"
}

# Backend deployment
deploy_backend() {
    log_info "Deploying backend..."

    cd "$BACKEND_DIR"

    # Install dependencies
    log_info "Installing backend dependencies..."
    npm ci

    # Run tests
    if [ "$ENVIRONMENT" = "production" ]; then
        log_info "Running tests..."
        npm run test
    fi

    # Build application
    log_info "Building backend..."
    npm run build

    # Run database migrations
    log_info "Running database migrations..."
    npm run migrate

    # Seed database (only in development)
    if [ "$ENVIRONMENT" != "production" ]; then
        log_info "Seeding database..."
        npm run seed
    fi

    log_success "Backend deployment completed"
}

# Frontend deployment
deploy_frontend() {
    log_info "Deploying frontend..."

    cd "$FRONTEND_DIR"

    # Install dependencies
    log_info "Installing frontend dependencies..."
    npm ci

    # Build application
    log_info "Building frontend..."
    npm run build

    log_success "Frontend deployment completed"
}

# Generate documentation
generate_docs() {
    log_info "Generating documentation..."

    cd "$BACKEND_DIR"

    # Generate Swagger documentation
    npm run docs

    log_success "Documentation generated"
}

# Environment-specific tasks
setup_environment() {
    log_info "Setting up $ENVIRONMENT environment..."

    case $ENVIRONMENT in
        "development")
            log_info "Development environment setup..."
            # Copy environment files
            if [ ! -f "$BACKEND_DIR/.env" ]; then
                cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
                log_warning "Please update $BACKEND_DIR/.env with your development settings"
            fi
            if [ ! -f "$FRONTEND_DIR/.env" ]; then
                cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
                log_warning "Please update $FRONTEND_DIR/.env with your development settings"
            fi
            ;;
        "production")
            log_info "Production environment setup..."
            # Ensure production environment variables are set
            if [ -z "$DATABASE_URL" ]; then
                log_error "DATABASE_URL environment variable is required for production"
                exit 1
            fi
            if [ -z "$JWT_SECRET" ]; then
                log_error "JWT_SECRET environment variable is required for production"
                exit 1
            fi
            ;;
    esac

    log_success "Environment setup completed"
}

# Health check
health_check() {
    log_info "Performing health check..."

    # Wait for backend to be ready
    max_attempts=30
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f "http://localhost:5000/health" &>/dev/null; then
            log_success "Backend health check passed"
            break
        fi

        log_info "Waiting for backend to be ready... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    if [ $attempt -gt $max_attempts ]; then
        log_error "Backend health check failed after $max_attempts attempts"
        exit 1
    fi

    # Test API endpoints
    if curl -f "http://localhost:5000/api/v1/health" &>/dev/null; then
        log_success "API health check passed"
    else
        log_warning "API health check failed"
    fi
}

# Docker deployment
deploy_docker() {
    log_info "Deploying with Docker..."

    # Build and start containers
    docker-compose up --build -d

    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 10

    # Health check
    health_check

    log_success "Docker deployment completed"
}

# Render deployment
deploy_render() {
    log_info "Deploying to Render..."

    # Check if we're in a git repository
    if ! git rev-parse --is-inside-work 2>/dev/null; then
        log_error "Not in a git repository. Please initialize git first."
        exit 1
    fi

    # Check if repository is clean
    if ! git diff --quiet; then
        log_warning "Repository has uncommitted changes"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    # Commit and push changes
    git add .
    git commit -m "Deploy: $ENVIRONMENT environment"
    git push origin main

    log_info "Pushed changes to repository"
    log_info "Render will automatically deploy the latest commit"
    log_info "Monitor deployment at: https://dashboard.render.com"

    log_success "Render deployment initiated"
}

# Main deployment flow
main() {
    log_info "Starting Hotel Extranet System deployment for $ENVIRONMENT environment"

    # Check prerequisites
    check_prerequisites

    # Setup environment
    setup_environment

    # Generate documentation
    generate_docs

    case $ENVIRONMENT in
        "development")
            # Local deployment
            deploy_backend
            deploy_frontend
            health_check
            log_success "Development deployment completed successfully!"
            log_info "Backend: http://localhost:5000"
            log_info "Frontend: http://localhost:5173"
            log_info "API Docs: http://localhost:5000/api-docs"
            ;;
        "docker")
            # Docker deployment
            deploy_docker
            log_success "Docker deployment completed successfully!"
            log_info "Application available at: http://localhost"
            ;;
        "production")
            # Production deployment
            deploy_backend
            deploy_frontend
            deploy_render
            log_success "Production deployment completed successfully!"
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            log_info "Usage: $0 [development|docker|production]"
            exit 1
            ;;
    esac

    log_info "Deployment completed successfully! 🎉"
}

# Run main function
main "$@"
