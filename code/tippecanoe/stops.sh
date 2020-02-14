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
    `# Set minimum and maximum zoom` \
    --maximum-zoom=11 \
    --minimum-zoom=11 \
    `# overwrite` \
    --force \
    `# Export path` \
    -o data/stops.mbtiles \
    `# Input geojson` \
    $input
