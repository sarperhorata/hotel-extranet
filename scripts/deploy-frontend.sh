#!/bin/bash

# Hotel Extranet Frontend Deployment Script
# Supports Netlify, Vercel, and GitHub Pages deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="hotel-extranet"
FRONTEND_DIR="app/frontend"
DEPLOYMENT_PLATFORM=${1:-"netlify"}
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
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Frontend directory not found. Please run from project root."
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
    log_info "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    log_success "Dependencies installed"
    cd - > /dev/null
}

build_frontend() {
    log_info "Building frontend application..."
    cd "$FRONTEND_DIR"
    
    # Set environment variables for build
    export NODE_ENV=production
    export VITE_API_URL=${VITE_API_URL:-"https://your-backend-url.com/api/v1"}
    export VITE_APP_NAME=${VITE_APP_NAME:-"Hotel Extranet"}
    export VITE_APP_VERSION=${VITE_APP_VERSION:-"1.0.0"}
    
    # Run build
    npm run build
    
    # Verify build
    if [ ! -d "dist" ]; then
        log_error "Build failed - dist directory not found"
        exit 1
    fi
    
    log_success "Frontend built successfully"
    cd - > /dev/null
}

deploy_netlify() {
    log_info "Deploying to Netlify..."
    
    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        log_error "Netlify CLI is not installed. Please install it first:"
        log_error "npm install -g netlify-cli"
        exit 1
    fi
    
    # Login to Netlify
    log_info "Logging in to Netlify..."
    netlify login
    
    # Deploy to Netlify
    log_info "Deploying to Netlify..."
    cd "$FRONTEND_DIR"
    
    # Create netlify.toml if it doesn't exist
    if [ ! -f "netlify.toml" ]; then
        cat > netlify.toml << EOF
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
EOF
    fi
    
    # Deploy
    netlify deploy --prod --dir=dist
    
    log_success "Netlify deployment completed"
    cd - > /dev/null
}

deploy_vercel() {
    log_info "Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI is not installed. Please install it first:"
        log_error "npm install -g vercel"
        exit 1
    fi
    
    # Login to Vercel
    log_info "Logging in to Vercel..."
    vercel login
    
    # Deploy to Vercel
    log_info "Deploying to Vercel..."
    cd "$FRONTEND_DIR"
    
    # Create vercel.json if it doesn't exist
    if [ ! -f "vercel.json" ]; then
        cat > vercel.json << EOF
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "env": {
    "NODE_ENV": "production"
  }
}
EOF
    fi
    
    # Deploy
    vercel --prod
    
    log_success "Vercel deployment completed"
    cd - > /dev/null
}

deploy_github_pages() {
    log_info "Deploying to GitHub Pages..."
    
    # Check if git is available
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    # Check if we're in a git repository
    if [ ! -d ".git" ]; then
        log_error "Not in a git repository. Please initialize git first."
        exit 1
    fi
    
    # Build for GitHub Pages
    log_info "Building for GitHub Pages..."
    cd "$FRONTEND_DIR"
    
    # Set base URL for GitHub Pages
    export VITE_BASE_URL="/$PROJECT_NAME/"
    
    # Build
    npm run build
    
    # Create .nojekyll file for GitHub Pages
    touch dist/.nojekyll
    
    # Add CNAME file if custom domain is provided
    if [ ! -z "$CUSTOM_DOMAIN" ]; then
        echo "$CUSTOM_DOMAIN" > dist/CNAME
    fi
    
    # Deploy to GitHub Pages
    log_info "Deploying to GitHub Pages..."
    
    # Add dist directory to git
    git add dist/
    git commit -m "Deploy to GitHub Pages"
    
    # Push to gh-pages branch
    git subtree push --prefix dist origin gh-pages
    
    log_success "GitHub Pages deployment completed"
    cd - > /dev/null
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
    cd "$FRONTEND_DIR"
    
    # Create Dockerfile if it doesn't exist
    if [ ! -f "Dockerfile" ]; then
        cat > Dockerfile << EOF
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
    fi
    
    # Create nginx.conf if it doesn't exist
    if [ ! -f "nginx.conf" ]; then
        cat > nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;
        
        location / {
            try_files \$uri \$uri/ /index.html;
        }
        
        location /api/ {
            proxy_pass http://backend:5000;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
    }
}
EOF
    fi
    
    # Build Docker image
    docker build -t "$PROJECT_NAME-frontend" .
    
    # Run Docker container
    log_info "Running Docker container..."
    docker run -d \
        --name "$PROJECT_NAME-frontend" \
        -p 3000:80 \
        -e NODE_ENV=production \
        "$PROJECT_NAME-frontend"
    
    log_success "Docker deployment completed"
    cd - > /dev/null
}

setup_environment() {
    log_info "Setting up environment variables..."
    
    case $DEPLOYMENT_PLATFORM in
        "netlify")
            log_info "Netlify environment setup..."
            # Environment variables are set through Netlify dashboard
            ;;
        "vercel")
            log_info "Vercel environment setup..."
            # Environment variables are set through Vercel dashboard
            ;;
        "github-pages")
            log_info "GitHub Pages environment setup..."
            # Environment variables are set through GitHub repository settings
            ;;
        "docker")
            log_info "Docker environment setup..."
            # Environment variables are set through Docker run command or .env file
            ;;
    esac
    
    log_success "Environment setup completed"
}

health_check() {
    log_info "Performing health check..."
    
    # Wait for deployment to be ready
    sleep 30
    
    # Get deployment URL
    case $DEPLOYMENT_PLATFORM in
        "netlify")
            URL="https://$PROJECT_NAME.netlify.app"
            ;;
        "vercel")
            URL="https://$PROJECT_NAME.vercel.app"
            ;;
        "github-pages")
            URL="https://your-username.github.io/$PROJECT_NAME"
            ;;
        "docker")
            URL="http://localhost:3000"
            ;;
    esac
    
    # Check if site is accessible
    if curl -f "$URL" > /dev/null 2>&1; then
        log_success "Health check passed: $URL"
    else
        log_warning "Health check failed. Please check the deployment manually."
    fi
}

cleanup() {
    log_info "Cleaning up..."
    
    # Remove build artifacts
    if [ -d "$FRONTEND_DIR/dist" ]; then
        rm -rf "$FRONTEND_DIR/dist"
    fi
    
    if [ -d "$FRONTEND_DIR/node_modules" ]; then
        rm -rf "$FRONTEND_DIR/node_modules"
    fi
    
    log_success "Cleanup completed"
}

# Main deployment function
deploy() {
    log_info "Starting frontend deployment to $DEPLOYMENT_PLATFORM..."
    
    check_requirements
    install_dependencies
    build_frontend
    
    case $DEPLOYMENT_PLATFORM in
        "netlify")
            deploy_netlify
            ;;
        "vercel")
            deploy_vercel
            ;;
        "github-pages")
            deploy_github_pages
            ;;
        "docker")
            deploy_docker
            ;;
        *)
            log_error "Unsupported deployment platform: $DEPLOYMENT_PLATFORM"
            log_error "Supported platforms: netlify, vercel, github-pages, docker"
            exit 1
            ;;
    esac
    
    setup_environment
    health_check
    cleanup
    
    log_success "Frontend deployment completed successfully!"
}

# Help function
show_help() {
    echo "Hotel Extranet Frontend Deployment Script"
    echo ""
    echo "Usage: $0 [PLATFORM] [ENVIRONMENT]"
    echo ""
    echo "Platforms:"
    echo "  netlify       Deploy to Netlify (default)"
    echo "  vercel        Deploy to Vercel"
    echo "  github-pages  Deploy to GitHub Pages"
    echo "  docker        Deploy with Docker"
    echo ""
    echo "Environments:"
    echo "  production    Production deployment (default)"
    echo "  staging       Staging deployment"
    echo "  development   Development deployment"
    echo ""
    echo "Examples:"
    echo "  $0 netlify production"
    echo "  $0 vercel staging"
    echo "  $0 github-pages production"
    echo "  $0 docker development"
    echo ""
    echo "Environment Variables:"
    echo "  VITE_API_URL      Backend API URL"
    echo "  VITE_APP_NAME     Application name"
    echo "  VITE_APP_VERSION  Application version"
    echo "  CUSTOM_DOMAIN     Custom domain for GitHub Pages"
}

# Parse command line arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Run deployment
deploy
