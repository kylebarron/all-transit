"""
ssp_geom.py: Find geometries for `ScheduleStopPair`s

So I think the process to get geometric ScheduleStopPairs is:

1. Get `ScheduleStopPair`. Call that `ssp`.
2. For that ssp, find the `RouteStopPattern` it's associated with.
3. For that ssp, find the `Point` locations of the origin and destination stops
4. For the origin and destination stops, find the closest point on the `RouteStopPattern`
5. Keep the `LineString` of the `RouteStopPattern` between the `origin` and `destination` coordinate
6. For each coordinate of the `LineString` between `origin` and `destination`, linearly interpolate the timestamp between the origin timestamp and destination timestamp. Shouldn't have to simplify more because the geometry should already be simplified from transitland.
"""
import json
import re
import sys

import click
import geojson
from shapely.geometry import LineString, Point, asShape
from shapely.ops import nearest_points, substring


@click.command()
@click.option(
    '--stops-path',
    type=click.Path(exists=True, dir_okay=False, file_okay=True, readable=True),
    required=True,
    help='Path to stops.geojson, with Transit.land stops')
@click.option(
    '--routes-path',
    type=click.Path(exists=True, dir_okay=False, file_okay=True, readable=True),
    required=True,
    help='Path to routes.geojson, with Transit.land routes')
@click.option(
    '--rsp-path',
    type=click.Path(exists=True, dir_okay=False, file_okay=True, readable=True),
    required=False,
    default=None,
    help='Path to GeoJSON file with Transit.land route_stop_patterns')
@click.option(
    '-p',
    '--properties-keys',
    type=str,
    multiple=True,
    default=[],
    required=False,
    help='Keys of properties to retain in outputted Features')
@click.argument('ssp-records', type=click.File())
def main(stops_path, routes_path, rsp_path, properties_keys, ssp_records):
    ssp_geom = ScheduleStopPairGeometry(
        stops_path=stops_path, routes_path=routes_path, rsp_path=rsp_path)

    for ssp_line in ssp_records:
        # Parse json
        ssp = json.loads(ssp_line)

        # Construct GeoJSON Feature of ScheduleStopPair
        ssp_feature = ssp_geom.match_ssp_to_route(ssp, properties_keys)

        if ssp_feature is None:
            continue

        # Write to stdout
        click.echo(geojson.dumps(ssp_feature, separators=(',', ':')))


class ScheduleStopPairGeometry:
    """ScheduleStopPairGeometry"""
    def __init__(self, stops_path, routes_path, rsp_path):
        super(ScheduleStopPairGeometry, self).__init__()

        self.stops = load_list_as_dict(path=stops_path, id_key='id')
        self.routes = load_list_as_dict(path=routes_path, id_key='id')
        self.rsp = None
        if rsp_path:
            self.rsp = load_list_as_dict(path=rsp_path, id_key='id')

    def match_ssp_to_route(self, ssp, properties_keys):
        """Add geometry to ScheduleStopPair

        Args:
            - ssp: dict representing a single ScheduleStopPair record
            - properties_keys: iterable with keys to keep in the GeoJSON Feature
              output.
        """
        orig_id = ssp['origin_onestop_id']
        dest_id = ssp['destination_onestop_id']
        orig_stop = self.stops.get(orig_id)
        dest_stop = self.stops.get(dest_id)

        if orig_stop is None:
            print(
                f'orig_stop not correctly loaded into self.stops for id: {orig_id}',
                file=sys.stderr)
            return None
        if dest_stop is None:
            print(
                f'dest_stop not correctly loaded into self.stops for id: {dest_id}',
                file=sys.stderr)
            return None

        rsp_id = ssp.get('route_stop_pattern_onestop_id')
        route_id = ssp.get('route_onestop_id')
        rsp = self.rsp.get(rsp_id)
        route = self.routes.get(route_id)

        if rsp:
            cut_line = match_using_rsp(rsp, orig_stop, dest_stop)
        elif route:
            cut_line = match_using_route(route, orig_stop, dest_stop)
        else:
            print(f'No route found for ssp: {ssp}', file=sys.stderr)
            return None

        # If cut_line is not a LineString, the linear referencing methods won't
        # work
        if cut_line.type != 'LineString':
            print(f'cut line has type {cut_line.type}', file=sys.stderr)
            return None

        # 6. For each coordinate of the `LineString` between `origin` and
        # `destination`, linearly interpolate the timestamp between the
        # origin timestamp and destination timestamp. Shouldn't have to
        # simplify more because the geometry should already be simplified
        # from transitland.
        #
        # Get start and end times as integers
        start_time = time_str_to_seconds(ssp['origin_departure_time'])
        end_time = time_str_to_seconds(ssp['destination_arrival_time'])

        # Interpolate proportionally to distance for every point
        # _Technically_ it would be best to reproject into a projected
        # coordinate system for these distance calculations, but since the
        # distances are generally quite small, and since I only care about
        # distance _proportions_, I'll keep measurements in degrees for now.
        proportions = []
        for coord in cut_line.coords:
            proportion = cut_line.project(Point(coord), normalized=True)
            proportions.append(proportion)

        time_diff = end_time - start_time
        times = [round(start_time + (p * time_diff), 1) for p in proportions]

        # Create a new geometry where the third coordinate is the
        # interpolated timestamp.
        l = LineString(
            [(c[0], c[1], t) for c, t in zip(cut_line.coords, times)])

        properties = {k: v for k, v in ssp.items() if k in properties_keys}
        return geojson.Feature(geometry=l, properties=properties)


def match_using_route(route, orig_stop, dest_stop):
    """Assign geometry to ScheduleStopPair using route
    """
    orig_stop_geom = asShape(orig_stop['geometry'])
    dest_stop_geom = asShape(dest_stop['geometry'])
    route_geom = asShape(route['geometry'])

    # Note that orig_route_point and dest_route_point are not
    # necessarily coordinates on the line; they are often interpolated
    # 4. For the origin and destination stops, find the closest point on
    # the `RouteStopPattern`
    _, orig_route_point = nearest_points(orig_stop_geom, route_geom)
    _, dest_route_point = nearest_points(dest_stop_geom, route_geom)
    # Vis([orig_stop_geom, dest_stop_geom, MultiPoint(route_geom.coords)])
    # from shapely.geometry import MultiPoint

    if route_geom.type == 'LineString':
        line_to_split = route_geom

    elif route_geom.type == 'MultiLineString':
        # Choose the linestring that has the shortest distance to each
        # route point
        dists = []
        for lineString in route_geom:
            dist = lineString.distance(orig_route_point) + lineString.distance(
                dest_route_point)
            dists.append(dist)

        min_index = dists.index(min(dists))
        line_to_split = route_geom[min_index]

    else:
        print(f'route geometry has type {route_geom.type}', file=sys.stderr)
        return None

    # Now that you have the shortest lineString, split it
    d1 = line_to_split.project(orig_route_point)
    d2 = line_to_split.project(dest_route_point)
    return substring(line_to_split, d1, d2)


def match_using_rsp(rsp, orig_stop, dest_stop):
    """Assign geometry to ScheduleStopPair using RouteStopPattern
    """
    pass


def time_str_to_seconds(s):
    """Convert time str to integer seconds

    Args:
        - s: string of the form '%H:%M:%S'

    Returns:
        int: seconds past midnight
    """
    regex = r'^([0-2]\d):([0-5]\d):([0-5]\d)$'
    match = re.match(regex, s)
    hours = int(match.group(1))
    minutes = int(match.group(2))
    seconds = int(match.group(3))
    return (hours * 60 * 60) + (minutes * 60) + seconds


def load_list_as_dict(path, id_key):
    """Load list of dicts into dict of dicts

    Args:
        - path: file path to load, assumed for each dict to be on individual lines
        - id_key: key of id variable in each inner dict
    """
    data = {}
    stops_iter = iter_file(path)
    for line in stops_iter:
        item = json.loads(line)
        data[item[id_key]] = item

    return data


def iter_file(path):
    """Generator to iterate over lines in a file
    """
    with open(path) as f:
        for line in f:
            yield line


if __name__ == '__main__':
    main()
