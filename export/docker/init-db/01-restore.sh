#!/bin/bash
DB_NAME="spis_castle"
DATA_DIR="/docker-entrypoint-initdb.d/data"
echo "===== Importing Spis Castle Database ====="
for file in $DATA_DIR/*.json; do
    collection=$(basename "$file" .json)
    echo "Importing: $collection"
    mongoimport --db "$DB_NAME" --collection "$collection" --file "$file" --jsonArray --drop
done
echo "===== Import Complete ====="
