#! /usr/bin/env bash

# Arg 1: operator_id
function ssp_geom() {
    operator_id=$1

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

    # Create jq filter string that keeps ScheduleStopPairs that are on Friday,
    # whose between origin_departure_time is >=4:00pm and <8:00pm, and that ran on
    # Feb 7, 2020
    jq_str="$(python code/schedules/construct_jq.py --day-of-week 4 --start-hour 16 --end-hour 20 --service-date '2020-02-07')"

    echo "Matching ScheduleStopPairs to geometries for operator: $operator_id"
    # Unzip json.gz file with ScheduleStopPairs and write to stdout
    gunzip -c data/ssp/$operator_id.json.gz \
    `# Use jq to quickly filter above constraints for day and time` \
    `# Write filtered json lines back to stdout` \
    | jq -c $jq_str \
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
ssp_geom $1
