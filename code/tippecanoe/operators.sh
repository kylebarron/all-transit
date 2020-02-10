#! /usr/bin/env bash

# If no input file is provided; GeoJSON must be stdin
input=$1

mkdir -p data/
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
    `# Include only the following attributes:` \
    --include='onestop_id' \
    --include='name' \
    --include='short_name' \
    --include='website' \
    `# Set maximum zoom to 10` \
    --maximum-zoom=11 \
    `# Set minimum zoom to 0` \
    --minimum-zoom=0 \
    `# overwrite` \
    --force \
    `# Export path` \
    -o data/operators.mbtiles \
    `# Input geojson` \
    $input
