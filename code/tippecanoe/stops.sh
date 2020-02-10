#! /usr/bin/env bash

# If no input file is provided; GeoJSON must be stdin
input=$1

mkdir -p data/
tippecanoe \
    `# tileset name` \
    -n 'Transit stops' \
    `# attribution` \
    --attribution '<a href="https://transit.land/" target="_blank">© Transitland</a>' \
    `# Description` \
    --description 'Transit stops from Transitland API' \
    `# Define layer name: routes` \
    --layer='stops' \
    `# Read input in parallel` \
    -P \
    `# Include only the following attributes:` \
    --include='operators_serving_stop' \
    --include='routes_serving_stop' \
    `# Set maximum zoom to 10` \
    --maximum-zoom=10 \
    `# Set minimum zoom to 0` \
    --minimum-zoom=0 \
    `# overwrite` \
    --force \
    `# Export path` \
    -o data/stops.mbtiles \
    `# Input geojson` \
    $input
