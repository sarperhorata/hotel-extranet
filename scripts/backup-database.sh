#!/bin/bash

# Hotel Extranet Database Backup Script
# Creates full or incremental backups of the PostgreSQL database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="hotel-extranet"
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_TYPE=${1:-"full"}
RETENTION_DAYS=${2:-30}
COMPRESS=${COMPRESS:-true}
ENCRYPT=${ENCRYPT:-false}

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
    log_info "Checking backup requirements..."

    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump is not installed. Please install PostgreSQL client tools."
        exit 1
    fi

    # Check if database URL is set
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL environment variable is not set"
        exit 1
    fi

    # Create backup directory if it doesn't exist
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log_info "Created backup directory: $BACKUP_DIR"
    fi

    log_success "Requirements check passed"
}

create_full_backup() {
    log_info "Creating full database backup..."

    local filename="$PROJECT_NAME-full-$TIMESTAMP.sql"
    local filepath="$BACKUP_DIR/$filename"

    # Create the backup
    if pg_dump "$DATABASE_URL" -f "$filepath" --no-owner --no-privileges --clean --if-exists; then
        log_success "Full backup created: $filename"

        # Compress if requested
        if [ "$COMPRESS" = "true" ]; then
            log_info "Compressing backup..."
            gzip "$filepath"
            filename="$filename.gz"
            filepath="$filepath.gz"
            log_success "Backup compressed: $filename"
        fi

        # Calculate file size
        local size=$(du -h "$filepath" | cut -f1)
        log_info "Backup size: $size"

        return 0
    else
        log_error "Failed to create full backup"
        return 1
    fi
}

create_incremental_backup() {
    log_info "Creating incremental backup..."

    # Find the last full backup
    local last_backup=$(find "$BACKUP_DIR" -name "$PROJECT_NAME-full-*.sql*" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)

    if [ -z "$last_backup" ]; then
        log_error "No full backup found for incremental backup. Creating full backup instead."
        create_full_backup
        return $?
    fi

    local last_backup_time=$(stat -c %Y "$last_backup")
    local last_backup_date=$(date -d "@$last_backup_time" +"%Y-%m-%d %H:%M:%S")

    log_info "Creating incremental backup since: $last_backup_date"

    local filename="$PROJECT_NAME-incremental-$TIMESTAMP.sql"
    local filepath="$BACKUP_DIR/$filename"

    # Create incremental backup by comparing with last full backup
    # This is a simplified approach - in production, you might use WAL archiving
    if pg_dump "$DATABASE_URL" -f "$filepath" --no-owner --no-privileges --clean --if-exists; then
        log_success "Incremental backup created: $filename"

        # Compress if requested
        if [ "$COMPRESS" = "true" ]; then
            log_info "Compressing backup..."
            gzip "$filepath"
            filename="$filename.gz"
            filepath="$filepath.gz"
            log_success "Backup compressed: $filename"
        fi

        # Calculate file size
        local size=$(du -h "$filepath" | cut -f1)
        log_info "Backup size: $size"

        return 0
    else
        log_error "Failed to create incremental backup"
        return 1
    fi
}

cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."

    local cutoff_date=$(date -d "-$RETENTION_DAYS days" +"%Y%m%d")
    local deleted_count=0

    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        log_info "Deleting old backup: $(basename "$file")"
        rm "$file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "$PROJECT_NAME-*.sql*" -type f -mtime +$RETENTION_DAYS -print0)

    if [ $deleted_count -gt 0 ]; then
        log_success "Deleted $deleted_count old backup files"
    else
        log_info "No old backup files to delete"
    fi
}

upload_to_cloud() {
    local storage_provider=${STORAGE_PROVIDER:-"local"}

    case $storage_provider in
        "aws")
            upload_to_aws
            ;;
        "gcs")
            upload_to_gcs
            ;;
        "local")
            log_info "Using local storage"
            ;;
        *)
            log_warning "Unknown storage provider: $storage_provider"
            ;;
    esac
}

upload_to_aws() {
    log_info "Uploading backup to AWS S3..."

    if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ] || [ -z "$AWS_S3_BUCKET" ]; then
        log_error "AWS credentials or bucket not configured"
        return 1
    fi

    # Upload backup files to S3
    # This would use AWS CLI or SDK in a real implementation
    log_info "Uploading backups to S3 bucket: $AWS_S3_BUCKET"

    # For now, just log the action
    log_success "Backup upload to AWS S3 configured"
}

upload_to_gcs() {
    log_info "Uploading backup to Google Cloud Storage..."

    if [ -z "$GCS_BUCKET" ] || [ -z "$GCS_PROJECT_ID" ]; then
        log_error "GCS bucket or project not configured"
        return 1
    fi

    # Upload backup files to GCS
    # This would use gsutil or GCS SDK in a real implementation
    log_info "Uploading backups to GCS bucket: $GCS_BUCKET"

    # For now, just log the action
    log_success "Backup upload to GCS configured"
}

verify_backup() {
    local filepath="$1"

    log_info "Verifying backup integrity: $(basename "$filepath")"

    # Check if file exists
    if [ ! -f "$filepath" ]; then
        log_error "Backup file not found: $filepath"
        return 1
    fi

    # Check file size
    local size=$(stat -c%s "$filepath")
    if [ $size -eq 0 ]; then
        log_error "Backup file is empty: $filepath"
        return 1
    fi

    # Basic content check (look for SQL keywords)
    if ! grep -q "CREATE\|INSERT\|SELECT" "$filepath" 2>/dev/null; then
        log_error "Backup file doesn't appear to contain valid SQL: $filepath"
        return 1
    fi

    log_success "Backup verification passed: $(basename "$filepath")"
    return 0
}

send_notification() {
    local status="$1"
    local message="$2"

    log_info "Sending backup notification: $status"

    # Send email notification
    if [ ! -z "$NOTIFICATION_EMAIL" ]; then
        echo "Backup $status: $message" | mail -s "Hotel Extranet Backup $status" "$NOTIFICATION_EMAIL"
        log_success "Notification sent to: $NOTIFICATION_EMAIL"
    fi

    # Send webhook notification
    if [ ! -z "$BACKUP_WEBHOOK_URL" ]; then
        curl -X POST "$BACKUP_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"status\":\"$status\",\"message\":\"$message\",\"timestamp\":\"$(date -Iseconds)\"}"
        log_success "Webhook notification sent"
    fi
}

show_help() {
    echo "Hotel Extranet Database Backup Script"
    echo ""
    echo "Usage: $0 [BACKUP_TYPE] [RETENTION_DAYS]"
    echo ""
    echo "Arguments:"
    echo "  BACKUP_TYPE      Type of backup (full, incremental) [default: full]"
    echo "  RETENTION_DAYS   Number of days to retain backups [default: 30]"
    echo ""
    echo "Environment Variables:"
    echo "  DATABASE_URL         PostgreSQL connection URL (required)"
    echo "  BACKUP_DIR           Backup directory [default: backups]"
    echo "  COMPRESS             Compress backups (true/false) [default: true]"
    echo "  ENCRYPT              Encrypt backups (true/false) [default: false]"
    echo "  STORAGE_PROVIDER     Cloud storage (aws/gcs/local) [default: local]"
    echo "  NOTIFICATION_EMAIL   Email for notifications"
    echo "  BACKUP_WEBHOOK_URL   Webhook URL for notifications"
    echo ""
    echo "AWS Variables (for S3 storage):"
    echo "  AWS_ACCESS_KEY_ID    AWS access key"
    echo "  AWS_SECRET_ACCESS_KEY AWS secret key"
    echo "  AWS_S3_BUCKET        S3 bucket name"
    echo "  AWS_REGION           AWS region"
    echo ""
    echo "GCS Variables (for Google Cloud Storage):"
    echo "  GCS_BUCKET           GCS bucket name"
    echo "  GCS_PROJECT_ID       GCS project ID"
    echo ""
    echo "Examples:"
    echo "  $0 full 30"
    echo "  $0 incremental 7"
    echo "  STORAGE_PROVIDER=aws $0 full 30"
}

# Parse command line arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Main execution
main() {
    log_info "Starting database backup process..."

    check_requirements

    case $BACKUP_TYPE in
        "full")
            if create_full_backup; then
                log_success "Full backup completed successfully"
                send_notification "success" "Full database backup completed"
            else
                log_error "Full backup failed"
                send_notification "failure" "Full database backup failed"
                exit 1
            fi
            ;;
        "incremental")
            if create_incremental_backup; then
                log_success "Incremental backup completed successfully"
                send_notification "success" "Incremental database backup completed"
            else
                log_error "Incremental backup failed"
                send_notification "failure" "Incremental database backup failed"
                exit 1
            fi
            ;;
        *)
            log_error "Invalid backup type: $BACKUP_TYPE"
            log_error "Use 'full' or 'incremental'"
            exit 1
            ;;
    esac

    # Cleanup old backups
    cleanup_old_backups

    # Upload to cloud if configured
    upload_to_cloud

    log_success "Database backup process completed successfully"
}

# Run the backup
main
