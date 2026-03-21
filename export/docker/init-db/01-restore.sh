#!/bin/bash
# This script runs on first MongoDB container start to import data
# It imports all collections from the JSON dump files

DB_NAME="spis_castle"
DATA_DIR="/docker-entrypoint-initdb.d/data"

echo "===== Importing Spis Castle Database ====="

for file in $DATA_DIR/*.json; do
    collection=$(basename "$file" .json)
    echo "Importing collection: $collection from $file"
    mongoimport --db "$DB_NAME" --collection "$collection" --file "$file" --jsonArray --drop
done

echo "===== Database Import Complete ====="
