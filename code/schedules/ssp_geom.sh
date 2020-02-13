#! /usr/bin/env bash

# Arg 1: operator_id
function ssp_geom() {
    operator_id=$1
    jq_str=$2

    # If the "finished" file exists, then skip this operator id
    if [ -f data/ssp_geom/$operator_id.finished ]; then
        echo "Already finished"
        exit 0
    fi

    if [ ! -f data/stops/$operator_id.geojson ]; then
        echo "stops file does not exist for operator: $operator_id. Skipping."
        # Declare that this operator id finished running
        touch data/ssp_geom/$operator_id.finished
        exit 0
    fi

    if [ ! -f data/routes/$operator_id.geojson ]; then
        echo "routes file does not exist for operator: $operator_id. Skipping."
        # Declare that this operator id finished running
        touch data/ssp_geom/$operator_id.finished
        exit 0
    fi
    echo "Matching ScheduleStopPairs to geometries for operator: $operator_id"
    # Make sure output directory exists
    mkdir -p data/ssp_geom

    # Unzip json.gz file with ScheduleStopPairs and write to stdout
    gunzip -c data/ssp/$operator_id.json.gz \
    `# Use jq to quickly filter above constraints for day and time` \
    `# Write filtered json lines back to stdout` \
    | jq -c "$jq_str" \
    `# Run python script to attach geometries to ScheduleStopPairs` \
    `# - signifies that the ScheduleStopPair json file is coming from stdin` \
    | python code/schedules/ssp_geom.py \
        --stops-path data/stops/$operator_id.geojson \
        --routes-path data/routes/$operator_id.geojson \
        - \
        > data/ssp_geom/$operator_id.geojson

    # Declare that this operator id finished running
    echo "Finished running for operator: $operator_id"
    touch data/ssp_geom/$operator_id.finished
}

# Run as main
ssp_geom "$1" "$2"
