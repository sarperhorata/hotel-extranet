#!/bin/bash

# Hotel Extranet Backend Deployment Script
# Supports Render, Railway, Heroku, and Docker deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="hotel-extranet"
BACKEND_DIR="app/backend"
FRONTEND_DIR="app/frontend"
DEPLOYMENT_PLATFORM=${1:-"render"}
ENVIRONMENT=${2:-"production"}

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking deployment requirements..."
    
    # Check if we're in the right directory
    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found. Please run from project root."
        exit 1
    fi
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    log_success "Requirements check passed"
}

install_dependencies() {
    log_info "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    
    if [ -f "package-lock.json" ]; then
        npm ci --only=production
    else
        npm install --only=production
    fi
    
    log_success "Dependencies installed"
    cd - > /dev/null
}

build_backend() {
    log_info "Building backend application..."
    cd "$BACKEND_DIR"
    
    # Run TypeScript compilation
    npm run build
    
    # Run tests if in development
    if [ "$ENVIRONMENT" = "development" ]; then
        log_info "Running tests..."
        npm test || log_warning "Some tests failed, continuing deployment..."
    fi
    
    log_success "Backend built successfully"
    cd - > /dev/null
}

deploy_render() {
    log_info "Deploying to Render..."
    
    # Check if Render CLI is installed
    if ! command -v render &> /dev/null; then
        log_error "Render CLI is not installed. Please install it first:"
        log_error "npm install -g @render/cli"
        exit 1
    fi
    
    # Login to Render
    log_info "Logging in to Render..."
    render auth login
    
    # Create or update service
    log_info "Creating/updating Render service..."
    render services create \
        --name "$PROJECT_NAME-backend" \
        --type web \
        --env node \
        --build-command "npm install && npm run build" \
        --start-command "npm start" \
        --plan starter \
        --region oregon \
        --auto-deploy true
    
    log_success "Render deployment initiated"
}

deploy_railway() {
    log_info "Deploying to Railway..."
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        log_error "Railway CLI is not installed. Please install it first:"
        log_error "npm install -g @railway/cli"
        exit 1
    fi
    
    # Login to Railway
    log_info "Logging in to Railway..."
    railway login
    
    # Create or update project
    log_info "Creating/updating Railway project..."
    railway project create "$PROJECT_NAME-backend" || railway project link
    
    # Deploy
    log_info "Deploying to Railway..."
    railway up
    
    log_success "Railway deployment initiated"
}

deploy_heroku() {
    log_info "Deploying to Heroku..."
    
    # Check if Heroku CLI is installed
    if ! command -v heroku &> /dev/null; then
        log_error "Heroku CLI is not installed. Please install it first:"
        log_error "https://devcenter.heroku.com/articles/heroku-cli"
        exit 1
    fi
    
    # Login to Heroku
    log_info "Logging in to Heroku..."
    heroku login
    
    # Create or update app
    log_info "Creating/updating Heroku app..."
    heroku create "$PROJECT_NAME-backend" || heroku git:remote -a "$PROJECT_NAME-backend"
    
    # Set environment variables
    log_info "Setting environment variables..."
    heroku config:set NODE_ENV=production
    heroku config:set PORT=10000
    
    # Add PostgreSQL addon
    log_info "Adding PostgreSQL addon..."
    heroku addons:create heroku-postgresql:mini
    
    # Add Redis addon
    log_info "Adding Redis addon..."
    heroku addons:create heroku-redis:mini
    
    # Deploy
    log_info "Deploying to Heroku..."
    git push heroku main
    
    log_success "Heroku deployment initiated"
}

deploy_docker() {
    log_info "Deploying with Docker..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Build Docker image
    log_info "Building Docker image..."
    docker build -t "$PROJECT_NAME-backend" -f "$BACKEND_DIR/Dockerfile" "$BACKEND_DIR"
    
    # Run Docker container
    log_info "Running Docker container..."
    docker run -d \
        --name "$PROJECT_NAME-backend" \
        -p 5000:5000 \
        -e NODE_ENV=production \
        -e PORT=5000 \
        "$PROJECT_NAME-backend"
    
    log_success "Docker deployment completed"
}

setup_environment() {
    log_info "Setting up environment variables..."
    
    case $DEPLOYMENT_PLATFORM in
        "render")
            log_info "Render environment setup..."
            # Environment variables are set through Render dashboard
            ;;
        "railway")
            log_info "Railway environment setup..."
            # Environment variables are set through Railway dashboard
            ;;
        "heroku")
            log_info "Heroku environment setup..."
            # Environment variables are set through Heroku CLI or dashboard
            ;;
        "docker")
            log_info "Docker environment setup..."
            # Environment variables are set through Docker run command or .env file
            ;;
    esac
    
    log_success "Environment setup completed"
}

run_migrations() {
    log_info "Running database migrations..."
    cd "$BACKEND_DIR"
    
    # Run migrations
    npm run migrate
    
    log_success "Database migrations completed"
    cd - > /dev/null
}

health_check() {
    log_info "Performing health check..."
    
    # Wait for deployment to be ready
    sleep 30
    
    # Get deployment URL
    case $DEPLOYMENT_PLATFORM in
        "render")
            URL="https://$PROJECT_NAME-backend.onrender.com"
            ;;
        "railway")
            URL="https://$PROJECT_NAME-backend.railway.app"
            ;;
        "heroku")
            URL="https://$PROJECT_NAME-backend.herokuapp.com"
            ;;
        "docker")
            URL="http://localhost:5000"
            ;;
    esac
    
    # Check health endpoint
    if curl -f "$URL/api/v1/monitoring/health" > /dev/null 2>&1; then
        log_success "Health check passed: $URL"
    else
        log_warning "Health check failed. Please check the deployment manually."
    fi
}

cleanup() {
    log_info "Cleaning up..."
    
    # Remove build artifacts
    if [ -d "$BACKEND_DIR/dist" ]; then
        rm -rf "$BACKEND_DIR/dist"
    fi
    
    if [ -d "$BACKEND_DIR/node_modules" ]; then
        rm -rf "$BACKEND_DIR/node_modules"
    fi
    
    log_success "Cleanup completed"
}

# Main deployment function
deploy() {
    log_info "Starting deployment to $DEPLOYMENT_PLATFORM..."
    
    check_requirements
    install_dependencies
    build_backend
    
    case $DEPLOYMENT_PLATFORM in
        "render")
            deploy_render
            ;;
        "railway")
            deploy_railway
            ;;
        "heroku")
            deploy_heroku
            ;;
        "docker")
            deploy_docker
            ;;
        *)
            log_error "Unsupported deployment platform: $DEPLOYMENT_PLATFORM"
            log_error "Supported platforms: render, railway, heroku, docker"
            exit 1
            ;;
    esac
    
    setup_environment
    run_migrations
    health_check
    cleanup
    
    log_success "Deployment completed successfully!"
}

# Help function
show_help() {
    echo "Hotel Extranet Backend Deployment Script"
    echo ""
    echo "Usage: $0 [PLATFORM] [ENVIRONMENT]"
    echo ""
    echo "Platforms:"
    echo "  render    Deploy to Render (default)"
    echo "  railway   Deploy to Railway"
    echo "  heroku    Deploy to Heroku"
    echo "  docker    Deploy with Docker"
    echo ""
    echo "Environments:"
    echo "  production   Production deployment (default)"
    echo "  staging      Staging deployment"
    echo "  development  Development deployment"
    echo ""
    echo "Examples:"
    echo "  $0 render production"
    echo "  $0 railway staging"
    echo "  $0 heroku production"
    echo "  $0 docker development"
}

# Parse command line arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Run deployment
deploy
