#! /usr/bin/env bash

# If no input file is provided; GeoJSON must be stdin
input=$1

mkdir -p data/mbtiles/
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
    `# Set maximum zoom to 10` \
    --maximum-zoom=11 \
    `# Set minimum zoom to 0` \
    --minimum-zoom=0 \
    `# Apply feature filter from file` \
    -J code/tippecanoe/routes_filter.json \
    `# Set maximum tile size to 600KB` \
    --maximum-tile-bytes=614400 \
    `# For zoom levels < max_zoom, don't include stops info to save space` \
    -C 'if [[ $1 -lt 11 ]]; then jq -f code/jq/route_filter.jq; else cat; fi' \
    `# overwrite` \
    --force \
    `# Export path` \
    -o data/mbtiles/routes.mbtiles \
    `# Input geojson` \
    $input
