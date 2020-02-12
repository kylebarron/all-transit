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
    help='Path to stops.geojson, with Transit.land routes')
@click.option(
    '--ssp-path',
    type=click.Path(exists=True, dir_okay=False, file_okay=True, readable=True),
    required=True,
    help='Path to ssp.test, with Transit.land ScheduleStopPairs')
def main(stops_path, routes_path, ssp_path):
    ag = Add_Geometry(stops_path=stops_path, routes_path=routes_path)
    ssp_iter = ag.match_ssp_to_route(ssp_path=ssp_path)
    for feature in ssp_iter:
        click.echo(geojson.dumps(feature, separators=(',', ':')))


class Add_Geometry:
    """docstring for """
    def __init__(self, stops_path, routes_path):
        super(Add_Geometry, self).__init__()

        self.stops = load_list_as_dict(path=stops_path, id_key='id')
        self.routes = load_list_as_dict(path=routes_path, id_key='id')

    def match_ssp_to_route(self, ssp_path):
        """Assign geometries with interpolated timestamps to ScheduleStopPairs
        """
        # Iterate over lines in the ScheduleStopPairs file
        for line in iter_file(ssp_path):
            # Parse JSON as dict
            ssp = json.loads(line)

            orig_id = ssp['origin_onestop_id']
            dest_id = ssp['destination_onestop_id']
            orig_stop = self.stops[orig_id]
            dest_stop = self.stops[dest_id]
            orig_stop_geom = asShape(orig_stop['geometry'])
            dest_stop_geom = asShape(dest_stop['geometry'])

            route_id = ssp['route_onestop_id']
            route = self.routes[route_id]
            route_geom = asShape(route['geometry'])

            # Note that orig_route_point and dest_route_point are not
            # necessarily coordinates on the line; they are often interpolated
            # 4. For the origin and destination stops, find the closest point on
            # the `RouteStopPattern`
            _, orig_route_point = nearest_points(orig_stop_geom, route_geom)
            _, dest_route_point = nearest_points(dest_stop_geom, route_geom)

            if route_geom.type == 'LineString':
                line_to_split = route_geom

            elif route_geom.type == 'MultiLineString':
                # Choose the linestring that has the shortest distance to each
                # route point
                dists = []
                for lineString in route_geom:
                    dist = lineString.distance(
                        orig_route_point) + lineString.distance(
                            dest_route_point)
                    dists.append(dist)

                route_geom[0].equals(route_geom[1])
                min_index = dists.index(min(dists))
                line_to_split = route_geom[min_index]

            # Now that you have the shortest lineString, split it
            d1 = line_to_split.project(orig_route_point)
            d2 = line_to_split.project(dest_route_point)
            cut_line = substring(line_to_split, d1, d2)

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
            times = [
                round(start_time + (p * time_diff), 1) for p in proportions]

            # Create a new geometry where the third coordinate is the
            # interpolated timestamp.
            l = LineString(
                [(c[0], c[1], t) for c, t in zip(cut_line.coords, times)])

            keep_keys = [
                'service_start_date', 'service_end_date',
                'service_days_of_week']
            properties = {k: v for k, v in ssp.items() if k in keep_keys}

            yield geojson.Feature(geometry=l, properties=properties)


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
