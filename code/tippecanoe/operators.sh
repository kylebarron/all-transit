#! /usr/bin/env bash

# If no input file is provided; GeoJSON must be stdin
input=$1

mkdir -p data/mbtiles/
tippecanoe \
    `# tileset name` \
    -n 'Transit operators' \
    `# attribution` \
    --attribution '<a href="https://transit.land/" target="_blank">© Transitland</a>' \
    `# Description` \
    --description 'Transit operator regions from Transitland API' \
    `# Define layer name: routes` \
    --layer='operators' \
    `# Read input in parallel` \
    -P \
    `# Apply feature filter from file` \
    -J code/tippecanoe/operators_filter.json \
    `# Include only the following attributes:` \
    --include='onestop_id' \
    --include='name' \
    --include='short_name' \
    --include='website' \
    `# Set minimum and maximum zoom` \
    --maximum-zoom=11 \
    --minimum-zoom=9 \
    `# overwrite` \
    --force \
    `# Set polygon simplification level` \
    `# Since I'm only not actually displaying the polygons, this can go pretty high` \
    --simplification=50 \
    `# Set maximum tile size to 100KB` \
    --maximum-tile-bytes=102400 \
    `# Export path` \
    -o data/mbtiles/operators.mbtiles \
    `# Input geojson` \
    $input
