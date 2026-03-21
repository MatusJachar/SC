#!/bin/bash
# Restore all MongoDB collections from JSON dumps
# Usage: ./restore_db.sh [MONGO_URL] [DB_NAME]
# Example: ./restore_db.sh mongodb://localhost:27017 spis_castle

MONGO_URL="${1:-mongodb://localhost:27017}"
DB_NAME="${2:-spis_castle}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "  Spiš Castle - Database Restore"
echo "========================================"
echo "MongoDB: $MONGO_URL"
echo "Database: $DB_NAME"
echo ""

COLLECTIONS=("tour_stops" "site_settings" "shop_products" "site_info" "shop_settings" "admins" "languages" "videos")

for col in "${COLLECTIONS[@]}"; do
    FILE="$SCRIPT_DIR/$col.json"
    if [ -f "$FILE" ]; then
        echo "📥 Importing $col..."
        mongoimport --uri="$MONGO_URL" --db="$DB_NAME" --collection="$col" --file="$FILE" --jsonArray --drop
    else
        echo "⚠️  Missing: $FILE"
    fi
done

echo ""
echo "✅ Database restore complete!"
echo "Collections imported: ${#COLLECTIONS[@]}"
