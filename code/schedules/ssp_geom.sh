#! /usr/bin/env bash

# Arg 1: operator_id
function ssp_geom() {
    route_id=$1

    # Find this route's operator id
    operator_id=$(cat data/route_operator_xw.json | jq "if .route_id == \"$route_id\"then .operator_id else empty end" | tr -d \")
    echo "Found operator: $operator_id"
    echo "Running ssp_geom.sh for operator: $operator_id and route: $route_id"

    # If the "finished" file exists, then skip this operator id
    if [ -f data/ssp/geom/$route_id.finished ]; then
        echo "Already finished"
        exit 0
    fi

    if [ ! -f data/stops/$operator_id.geojson ]; then
        echo "stops file does not exist for operator: $operator_id. Skipping."
        exit 0
    fi

    if [ ! -f data/routes/$operator_id.geojson ]; then
        echo "routes file does not exist for operator: $operator_id. Skipping."
        exit 0
    fi
    echo "Matching ScheduleStopPairs to geometries for route: $route_id"

    # Make sure output directory exists
    mkdir -p data/ssp/geom

    python code/schedules/select_ssp.py \
        -f data/ssp/sqlite/ssp.db \
        --route-id "$route_id" \
        --service-date '2020-02-07' \
        --service-days-of-week 4 \
        --origin-departure-hour 16 \
        --origin-departure-hour 20 \
        `# extra columns to extract from sqlite` \
        -c destination_timepoint_source \
        -c operator_onestop_id \
        -c origin_timepoint_source \
        -c trip \
        `# Run python script to attach geometries to ScheduleStopPairs` \
        `# - signifies that the ScheduleStopPair data is coming from stdin` \
        | python code/schedules/ssp_geom.py \
            --stops-path data/stops/$operator_id.geojson \
            --routes-path data/routes/$operator_id.geojson \
            --rsp-path data/rsp/route_stop_patterns.geojson \
            `# property names to include in geojson output` \
            `# I include extra properties for debugging; they'll be removed on final minification` \
            -p destination_arrival_time \
            -p destination_dist_traveled \
            -p destination_onestop_id \
            -p destination_timepoint_source \
            -p operator_onestop_id \
            -p origin_departure_time \
            -p origin_dist_traveled \
            -p origin_onestop_id \
            -p origin_timepoint_source \
            -p route_onestop_id \
            -p route_stop_pattern_onestop_id \
            -p trip \
            - \
            > data/ssp/geom/$route_id.geojson

    # Declare that this operator id finished running
    echo "Finished running for route: ${route_id}"
    touch data/ssp/geom/${route_id}.finished
}

# Run as main
ssp_geom "$1"
