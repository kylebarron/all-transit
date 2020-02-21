#! /usr/bin/env bash

# Arg 1: zoom level
function compress_tiles() {
    zoom=$1

    for file in data/ssp/tiles/${zoom}/**/*.geojson; do
        z="$(echo $file | awk -F'/' '{print $(NF-2)}')"
        x="$(echo $file | awk -F'/' '{print $(NF-1)}')"
        y="$(basename $file .geojson)"
        mkdir -p data/ssp/tiles_comp/$z/$x
        # Take only the coordinates, minified, and gzip them
        cat $file \
        `# Take only the coordinates of each GeoJSON record` \
        | jq -c '.geometry.coordinates' \
        `# Convert JSONlines to JSON` \
        | jq -cs '.' \
        | gzip > data/ssp/tiles_comp/$z/$x/$y.json
    done
}

# Run as main
compress_tiles "$1"
