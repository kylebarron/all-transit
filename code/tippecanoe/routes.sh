#! /usr/bin/env bash

# If no input file is provided; GeoJSON must be stdin
input=$1

mkdir -p data/
tippecanoe \
    `# tileset name` \
    -n 'Transit routes' \
    `# attribution` \
    --attribution '<a href="https://transit.land/" target="_blank">© Transitland</a>' \
    `# Description` \
    --description 'Transit routes from Transitland API' \
    `# Define layer name: routes` \
    --layer='routes' \
    `# Read input in parallel` \
    -P \
    `# Include only the following attributes:` \
    --include='onestop_id' \
    --include='color' \
    --include='vehicle_type' \
    --include='name' \
    `# Apply feature filter from file` \
    -J feature_filter.json \
    `# Set maximum zoom to 10` \
    --maximum-zoom=10 \
    `# Set minimum zoom to 0` \
    --minimum-zoom=0 \
    `# overwrite` \
    --force \
    `# Export path` \
    -o data/routes.mbtiles \
    `# Input geojson` \
    $input
