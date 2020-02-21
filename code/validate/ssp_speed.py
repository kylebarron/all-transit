"""
ssp_speed.py: Script to validate ScheduleStopPair geometries

From visually inspecting the final result, it's clear that some schedule
geometries are incorrect. There's no transit vehicle that can round the loop in
Chicago at >60mph. This script takes GeoJSON features and analyzes speed for
each feature.
"""

import json

import click
import cligj
from haversine import Unit, haversine
from shapely.geometry import asShape


@click.command()
@cligj.features_in_arg
def main(features):
    """Compute speed and distance for ScheduleStopPairs
    """

    for feature in features:
        new_f = validate_feature(feature)
        print(json.dumps(new_f))


def validate_feature(feature):
    line = asShape(feature['geometry'])

    dist = compute_distance(line)
    time = line.coords[-1][2] - line.coords[0][2]
    # Speed in meters / second
    speed = dist / time
    feature['properties']['speed'] = speed
    feature['properties']['dist'] = dist
    return feature


def compute_distance(line):
    dist = 0
    for a, b in zip(line.coords, line.coords[1:]):
        dist += haversine(a[:2], b[:2], unit=Unit.METERS)

    return dist


if __name__ == '__main__':
    main()
