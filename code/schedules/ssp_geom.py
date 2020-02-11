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


def main():
    pass


class ClassName(object):
    """docstring for """
    def __init__(self, stops_path):
        super(ClassName, self).__init__()

        self.stops_path = '/Users/kyle/github/mapping/all-transit/data/stops.geojson'
        self.routes_path = '/Users/kyle/github/mapping/all-transit/data/routes.geojson'
        self.ssp_path = '/Users/kyle/github/mapping/all-transit/data/ssp/test.json'

        self.stops = load_list_as_dict(path=self.stops_path, id_key='id')
        self.routes = load_list_as_dict(path=self.routes_path, id_key='id')

    def match_ssp_to_route(self):
        ssp_iter = iter_file(self.ssp_path)
        ssp = json.loads(next(ssp_iter))
        for line in ssp_iter:
            ssp = json.loads(line)

            orig_id = ssp['origin_onestop_id']
            dest_id = ssp['destination_onestop_id']
            orig_stop = self.stops[orig_id]
            dest_stop = self.stops[dest_id]

            route_id = ssp['route_onestop_id']
            route = self.routes[route_id]

            # 4. For the origin and destination stops, find the closest point on the `RouteStopPattern`
            # 5. Keep the `LineString` of the `RouteStopPattern` between the `origin` and `destination` coordinate
            # 6. For each coordinate of the `LineString` between `origin` and `destination`, linearly interpolate the timestamp between the origin timestamp and destination timestamp. Shouldn't have to simplify more because the geometry should already be simplified from transitland.

        pass


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
