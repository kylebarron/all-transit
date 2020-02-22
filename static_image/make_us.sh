#! /usr/bin/env bash

# https://github.com/d3/d3-geo/blob/v1.11.9/README.md#geoAlbersUsa
PROJECTION='d3.geoAlbersUsa()'

# The display size.
WIDTH=975
HEIGHT=500

mkdir -p data/

# When you run `npm install`, it will generate binaries at ./node_modules/.bin
export PATH="./node_modules/.bin/:$PATH"

# Convert states shapefile to GeoJSON
shp2json ../data/gis/states/states.shp > data/states.geojson

# Combine US Routes into single file
# Currently operator_onestop_ids.txt is a list of US operators but this file path could change in
# the future
# There are a few Canadian operators in this list, so for this visualization I'll exclude them
rm data/all_routes_us.geojson
cat ../data/operator_onestop_ids.txt | while read operator_id
do
    if [[ "$operator_id" == "o-f-viarail" ]]; then
        continue
    elif [[ "$operator_id" == "o-dpz-gotransit" ]]; then
        continue
    elif [[ "$operator_id" == "o-dpwz-guelphtransit" ]]; then
        continue
    elif [[ "$operator_id" == "o-dpsb-transitwindsor" ]]; then
        continue
    else
        cat ../data/routes/$operator_id.geojson >> data/all_routes_us.geojson
    fi
done

# Create SVG
cat \
    `# Load states data` \
    <(cat data/states.geojson \
        `# Convert to newline-delimited geojson` \
        | jq -c '.features[]' \
        `# Set stroke-width` \
        | jq -c '.properties += {"stroke-width": 0.2}' \
        ) \
    <(cat data/all_routes_us.geojson \
        `# Set "stroke" based on color in route properties` \
        `# Use hsl(229, 50%, 35%) as fallback if route color does not exist` \
        `# Then set stroke-width for all routes` \
        | jq -c 'if (.properties.color == "") or (.properties.color == "000000") or (.properties.color == "ffffff") then .properties.stroke = "hsl(229, 50%, 35%)" else .properties.stroke = ("#" + .properties.color) end | .properties += {"stroke-width": 0.4}' \
        ) \
    `# Reproject all data to given projection; use -n for newline-delimited GeoJSON` \
    | geoproject -n "${PROJECTION}" \
    `# Put all GeoJSON data into svg; use -n for newline-delimited GeoJSON` \
    | geo2svg -n -w ${WIDTH} -h ${HEIGHT} \
    `# Remove last line of svg file so that I can append title svg` \
    | sed '$d' \
    `# Combine the routes svg from stdin with the title` \
    `# Take off the first few lines of the title svg so that it can correctly append` \
    | cat - <(tail -n +4 title.svg ) \
    `# Write to file` \
    > data/us.svg

# Compress output SVG
# I had to manually set Node's max memory
# This used around 6GB of memory at peak
# https://github.com/svg/svgo/issues/954#issuecomment-484395128
NODE_OPTIONS=--max_old_space_size=8192 \
    node \
    ./node_modules/.bin/svgo \
    data/us.svg -o data/us_comp.svg

# Export to png
# 45516E is the same background color as my map style uses
# https://github.com/kylebarron/fiord-color-gl-style/blob/3c19aa5f91a072c356fcda0f0f0866a7fdf9082d/style.json#L33-L37
svgexport data/us_comp.svg us.png 8x "svg{background:#45516E;}"

# Compress png using pngquant
pngquant us.png --quality=80 --ext .png -f
