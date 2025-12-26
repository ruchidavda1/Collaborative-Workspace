#!/bin/bash

# Backup script for databases

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "[INFO] Starting backup process..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Detect if using Docker or Homebrew
USE_DOCKER=false
if timeout 3 docker info > /dev/null 2>&1; then
    if timeout 3 docker-compose ps 2>/dev/null | grep -q "Up"; then
        USE_DOCKER=true
        echo "[INFO] Using Docker for backups"
    fi
fi

if [ "$USE_DOCKER" = false ]; then
    echo "[INFO] Using Homebrew services for backups"
fi

# PostgreSQL Backup
echo "[INFO] Backing up PostgreSQL..."
if [ "$USE_DOCKER" = true ]; then
    # Docker backup
    docker-compose exec -T postgres pg_dump -U workspace_user collaborative_workspace > "$BACKUP_DIR/postgres_$TIMESTAMP.sql"
else
    # Homebrew backup
    pg_dump -h localhost -U workspace_user collaborative_workspace > "$BACKUP_DIR/postgres_$TIMESTAMP.sql" 2>/dev/null
fi

if [ $? -eq 0 ]; then
    echo "[SUCCESS] PostgreSQL backup completed: postgres_$TIMESTAMP.sql"
else
    echo "[ERROR] PostgreSQL backup failed"
fi

# MongoDB Backup
echo "[INFO] Backing up MongoDB..."
if [ "$USE_DOCKER" = true ]; then
    # Docker backup
    docker-compose exec -T mongodb mongodump --db collaborative_workspace --archive > "$BACKUP_DIR/mongodb_$TIMESTAMP.archive"
else
    # Homebrew backup
    mongodump --db collaborative_workspace --archive="$BACKUP_DIR/mongodb_$TIMESTAMP.archive" --quiet 2>/dev/null
fi

if [ $? -eq 0 ]; then
    echo "[SUCCESS] MongoDB backup completed: mongodb_$TIMESTAMP.archive"
else
    echo "[ERROR] MongoDB backup failed"
fi

# Redis Backup
echo "[INFO] Backing up Redis..."
if [ "$USE_DOCKER" = true ]; then
    # Docker backup
    docker-compose exec -T redis redis-cli SAVE > /dev/null 2>&1
    docker-compose exec -T redis cat /data/dump.rdb > "$BACKUP_DIR/redis_$TIMESTAMP.rdb"
else
    # Homebrew backup
    redis-cli SAVE > /dev/null 2>&1
    # Find Redis dump file location
    REDIS_DUMP=$(redis-cli CONFIG GET dir 2>/dev/null | tail -1)
    if [ -f "$REDIS_DUMP/dump.rdb" ]; then
        cp "$REDIS_DUMP/dump.rdb" "$BACKUP_DIR/redis_$TIMESTAMP.rdb" 2>/dev/null
    else
        # Try common locations
        if [ -f "/usr/local/var/db/redis/dump.rdb" ]; then
            cp "/usr/local/var/db/redis/dump.rdb" "$BACKUP_DIR/redis_$TIMESTAMP.rdb" 2>/dev/null
        elif [ -f "/opt/homebrew/var/db/redis/dump.rdb" ]; then
            cp "/opt/homebrew/var/db/redis/dump.rdb" "$BACKUP_DIR/redis_$TIMESTAMP.rdb" 2>/dev/null
        fi
    fi
fi

if [ -f "$BACKUP_DIR/redis_$TIMESTAMP.rdb" ]; then
    echo "[SUCCESS] Redis backup completed: redis_$TIMESTAMP.rdb"
else
    echo "[WARNING] Redis backup not found (Redis may not have persisted data yet)"
fi

# Compress backups
echo "[INFO] Compressing backups..."
FILES_TO_COMPRESS=""
[ -f "$BACKUP_DIR/postgres_$TIMESTAMP.sql" ] && FILES_TO_COMPRESS="$FILES_TO_COMPRESS postgres_$TIMESTAMP.sql"
[ -f "$BACKUP_DIR/mongodb_$TIMESTAMP.archive" ] && FILES_TO_COMPRESS="$FILES_TO_COMPRESS mongodb_$TIMESTAMP.archive"
[ -f "$BACKUP_DIR/redis_$TIMESTAMP.rdb" ] && FILES_TO_COMPRESS="$FILES_TO_COMPRESS redis_$TIMESTAMP.rdb"

if [ -n "$FILES_TO_COMPRESS" ]; then
    tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C $BACKUP_DIR $FILES_TO_COMPRESS 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "[SUCCESS] Backups compressed: backup_$TIMESTAMP.tar.gz"
        # Remove individual backup files
        for file in $FILES_TO_COMPRESS; do
            rm "$BACKUP_DIR/$file" 2>/dev/null
        done
    fi
else
    echo "[WARNING] No backup files to compress"
fi

# Remove backups older than 7 days
echo "[INFO] Cleaning up old backups..."
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete 2>/dev/null

echo "[SUCCESS] Backup process completed!"
if [ -f "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" ]; then
    echo "[INFO] Backup location: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
    
    # Show backup size
    SIZE=$(du -h "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" | cut -f1)
    echo "[INFO] Backup size: $SIZE"
else
    echo "[WARNING] Backup archive not created. Check individual backup files in $BACKUP_DIR"
fi
