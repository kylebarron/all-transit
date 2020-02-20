#! /usr/bin/env bash

# Arg 1: operator_id
function ssp_geom() {
    route_id=$1

    # Find this route's operator id
    operator_id=$(cat data/route_operator_xw.json | jq "if .route_id == \"$route_id\"then .operator_id else empty end" | tr -d \")
    echo "Found operator: $operator_id"
    echo "Running ssp_geom.sh for operator: $operator_id and route: $route_id"

    # If the "finished" file exists, then skip this operator id
    if [ -f data/ssp_geom/$route_id.finished ]; then
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
    echo "Matching ScheduleStopPairs to geometries for route: $route_id"
    # Make sure output directory exists
    mkdir -p data/ssp_geom

    python code/schedules/select_ssp.py \
        -f data/ssp_sqlite/ssp.db \
        --route-id "$route_id" \
        --service-date '2020-02-07' \
        --service-days-of-week 4 \
        --origin-departure-hour 16 \
        --origin-departure-hour 20 \
        `# Run python script to attach geometries to ScheduleStopPairs` \
        `# - signifies that the ScheduleStopPair data is coming from stdin` \
        | python code/schedules/ssp_geom.py \
            --stops-path data/stops/$operator_id.geojson \
            --routes-path data/routes/$operator_id.geojson \
            --route-stop-patterns-path data/route_stop_patterns/$operator_id.json \
            - \
            > data/ssp_geom/$route_id.geojson

    # Declare that this operator id finished running
    echo "Finished running for route: ${route_id}"
    touch data/ssp_geom/${route_id}.finished
}

# Run as main
ssp_geom "$1"
