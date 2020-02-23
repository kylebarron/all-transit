#! /usr/bin/env bash

function compress_tile() {
    file=$1

    z="$(echo $file | awk -F'/' '{print $(NF-2)}')"
    x="$(echo $file | awk -F'/' '{print $(NF-1)}')"
    y="$(basename $file .geojson)"
    mkdir -p data/ssp/pbf/$z/$x

    # Pass GeoJSON to pbf writer
    cat $file \
    | python code/pbf/geojson_to_pbf.py \
    `# Gzip the tile` \
    | gzip -c > data/ssp/pbf/$z/$x/$y.pbf
}

# Run as main
compress_tile "$1"
