#!/bin/bash
MONGO_URL="${1:-mongodb://localhost:27017}"
DB_NAME="${2:-spis_castle}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Spis Castle — Database Restore"
echo "MongoDB: $MONGO_URL | DB: $DB_NAME"
for col in tour_stops site_settings shop_products site_info shop_settings admins languages videos vr_content premium_settings purchase_codes device_unlocks partners tips; do
    FILE="$SCRIPT_DIR/$col.json"
    [ -f "$FILE" ] && mongoimport --uri="$MONGO_URL" --db="$DB_NAME" --collection="$col" --file="$FILE" --jsonArray --drop
done
echo "Done!"
