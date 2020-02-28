"""
Fix bus routes that are missing geometries
"""
import json
import os
import sys

import click
import cligj
import geojson
import requests
from haversine import Unit, haversine
from shapely.geometry import asShape

# path = '/Users/kyle/github/mapping/all-transit/data/routes/o-dr5-nj~transit.geojson'
# with open(path) as f:
#     features = [json.loads(l) for l in f.readlines()]
#
# len(features)


@click.command()
@cligj.features_in_arg
@click.option(
    '-d',
    '--max-dist',
    type=int,
    required=True,
    help='Maximum distance in meters between coordinates')
def main(features, max_dist):
    for feature in features:
        # If not bus, return same feature
        if feature['properties']['vehicle_type'] != 'bus':
            print(json.dumps(feature, separators=(',', ':')))
            continue

        geom = asShape(feature['geometry'])
        if geom.type == 'LineString':
            new_geometry = fix_line_geometry(geom)

        elif geom.type == 'MultiLineString':
            new_lines = []
            for line in geom:
                new_line = fix_line_geometry(line)
                new_lines.append(new_line)

            new_geometry = geojson.MultiLineString(new_lines)
        else:
            print('not LineString or MultiLineString', file=sys.stderr)
            print(json.dumps(feature, separators=(',', ':')))
            continue

        new_id = feature['id']
        new_props = feature['properties']
        new_feature = geojson.Feature(
            id=new_id, geometry=new_geometry, properties=new_props)
        print(json.dumps(new_feature, separators=(',', ':')))


def get_coord_pairs(line):
    for p1, p2 in zip(line.coords, line.coords[1:]):
        yield (p1, p2)


def get_coord_pair_distance(a, b, method='haversine'):
    """
    Args:
        - a: first coord
        - b: second coord
        - method: either 'haversine' to use haversine on lat/lon coords, or 'projected' to assume coordinates are already projected.
    """

    if method == 'haversine':
        return haversine(a[::-1], b[::-1], unit=Unit.METERS)

    raise NotImplementedError()


def fix_line_geometry(line, max_dist=2000):
    """Fix line geometry

    Args:
        - line: shapely line
        - max_dist: maximum distance between coords in meters

    Returns:

    shapely LineString
    """

    new_coord_segments = []

    for a, b in get_coord_pairs(line):
        dist = get_coord_pair_distance(a, b)
        if dist > max_dist:
            new_coords = retrieve_new_geometry(a, b)
            new_coord_segments.append(new_coords)
        else:
            new_coord_segments.append((a, b))

    new_coords = []
    for segment in new_coord_segments:
        new_coords.extend(segment[:-1])

    # Add last coord
    new_coords.append(new_coord_segments[-1][-1])

    return geojson.LineString(new_coords)


def retrieve_new_geometry(a, b):
    api_key = os.getenv('MAPBOX_API_KEY')
    assert api_key is not None, 'Missing API key'

    url = 'https://api.mapbox.com/directions/v5/mapbox/driving/'
    url += f'{a[0]},{a[1]};{b[0]},{b[1]}'
    params = {'access_token': api_key, 'geometries': 'geojson'}

    r = requests.get(url, params=params)
    d = r.json()
    return d['routes'][0]['geometry']['coordinates']


if __name__ == '__main__':
    main()
