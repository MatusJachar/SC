#!/bin/bash
# ============================================
#  Backup Script — Run daily via cron
#  crontab: 0 3 * * * /path/to/backup.sh
# ============================================

BACKUP_DIR="/root/spis-backups"
DATE=$(date +%Y%m%d_%H%M)
mkdir -p $BACKUP_DIR

echo "Starting backup: $DATE"

# Dump MongoDB
docker exec spis-mongo mongodump --db spis_castle --out /tmp/mongodump_$DATE
docker cp spis-mongo:/tmp/mongodump_$DATE $BACKUP_DIR/db_$DATE
docker exec spis-mongo rm -rf /tmp/mongodump_$DATE

# Compress
tar -czf $BACKUP_DIR/spis_backup_$DATE.tar.gz \
    -C $BACKUP_DIR db_$DATE

# Cleanup dump folder
rm -rf $BACKUP_DIR/db_$DATE

# Keep only last 7 backups
ls -t $BACKUP_DIR/spis_backup_*.tar.gz | tail -n +8 | xargs -r rm

echo "Backup complete: $BACKUP_DIR/spis_backup_$DATE.tar.gz"
