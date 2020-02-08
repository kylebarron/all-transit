from keplergl_quickvis import Visualize as Vis
from time import sleep

import geojson
import requests
from shapely.geometry import shape, box

# Bbox around lower 48
# bbox = [-127.1, 24.1, -66.3, 49.7]
# bbox = [-124.4826, 45.9742, -119.3763, 48.3192]
# geometry = box(*bbox)


class Transit():
    """
    """
    def __init__(self):
        super(Transit, self).__init__()

    def download(self, geometry):
        """Create trail-relevant transit dataset from transit.land database

        Args:
            - geometry: geometry around which to find transit services. A
              transit _stop_ must intersect this geometry. For this reason, you
              should probably provide a polygon geometry, not a LineString.

              Note that not all of the transit line needs to be within the
              geometry. This finds all routes that have at least one stop
              intersecting the geometry, but then grabs all routes that serve
              the selected stop.
        """

        # Get operators in geometry
        operators = self._get_operators_intersecting_geometry(geometry)

        len(operators)
        operators[0]
        Vis(operators[0])
        operators[0].keys()
        Vis(geojson.Feature(geometry=operators[0]['geometry']))

        # Get all stops in geometry by all providers
        nearby_stops = self.get_stops_in_geometry(geometry)

        # Get all routes that serve these stops
        routes = self.get_routes_serving_stops(nearby_stops)

        # Get all stops for all routes
        all_stops = self.get_all_stops_for_routes(routes)

        # Make sure I have all info about every stop
        nearby_stops = self.update_stop_info(nearby_stops)
        all_stops = self.update_stop_info(all_stops)

        return nearby_stops, all_stops, routes

    def get_stops_in_geometry(self, geometry):
        """Get all stops for all providers that intersect geometry provided
        """

        # For each operator, see if there are actually transit stops that
        # intersect the provided geometry
        _intersecting_stops = []
        for operator in operators_intersecting_geom:
            stops = self._get_stops_intersecting_geometry(
                geometry=geometry, operator_id=operator['onestop_id'])
            if len(stops) > 0:
                _intersecting_stops.extend(stops)

        nearby_stops = {}
        for stop in _intersecting_stops:
            nearby_stops[stop['onestop_id']] = stop

        return nearby_stops

    def get_routes_serving_stops(self, stops):
        """Get all routes that stop and given stops
        """
        # For each stop that intersects the geometry, add it to the nearby_stops
        # dict
        # For each route that stops at each nearby stop, get information about
        # the route and add it to the routes dict
        routes = {}
        for stop in stops.values():
            # Get more info about each route that stops at stop
            # Routes are added to self.routes
            for route_dict in stop['routes_serving_stop']:
                route_id = route_dict['route_onestop_id']
                routes[route_id] = self.get_route_from_id(route_id=route_id)

        return routes

    def get_all_stops_for_routes(self, routes):
        """Get all stops served by the given routes
        """
        # For each stop along each route, get the id's of all stops.
        # {stop_onestop_id: stop}
        all_stops = {}
        for route in routes.values():
            route_stops = route['stops_served_by_route']
            for route_stop in route_stops:
                route_stop_id = route_stop['stop_onestop_id']
                all_stops[route_stop_id] = self.get_stop_from_id(
                    stop_id=route_stop_id)

        return all_stops

    def _get_stops_intersecting_geometry(self, geometry, operator_id):
        """Find all stops by operator that intersect geometry

        Args:
            - geometry: shapely geometry object to take intersections with
            - operator_id: onestop operator id
        """
        url = 'https://transit.land/api/v1/stops'
        params = {'served_by': operator_id, 'per_page': 10000}
        d = request_transit_land(url, params=params)

        intersecting_stops = []
        for stop in d['stops']:
            stop_geometry = shape(stop['geometry'])
            intersects = geometry.intersects(stop_geometry)

            if intersects:
                intersecting_stops.append(stop)

        return intersecting_stops

    def get_route_from_id(self, route_id):
        """Find route info from route_id

        Args:
            - route_id: onestop id for a route
        """
        url = f'https://transit.land/api/v1/onestop_id/{route_id}'
        return request_transit_land(url)

    def get_stop_from_id(self, stop_id):
        """Find stop info from stop_id

        Args:
            - stop_id: onestop id for a stop
        """
        url = f'https://transit.land/api/v1/onestop_id/{stop_id}'
        return request_transit_land(url)

    def update_stop_info(self, stops):
        """Update stop information from Transit land

        For every value of stops that is None, search for the key in
        transit.land.

        Args:
            - stops: dict {stop_onestop_id: None or stop_info}

        Returns:
            dict {stop_onestop_id: stop_info}
        """
        for stop_id, value in stops.items():
            if value is not None:
                continue

            url = f'https://transit.land/api/v1/onestop_id/{stop_id}'
            stops[stop_id] = request_transit_land(url)

        return stops

    def _get_operators_intersecting_geometry(self, geometry):
        """Find transit operators with service area crossing provided geometry

        Using the transit.land API, you can find all transit operators within a
        bounding box. Since the bbox of the PCT is quite large, I then check the
        service area polygon of each potential transit operator to see if it
        intersects the trail.

        Args:
            - geometry: Shapely geometry object of some type
        """
        # Create stringified bbox
        bbox = ','.join(map(str, geometry.bounds))

        url = 'https://transit.land/api/v1/operators'
        params = {'bbox': bbox, 'per_page': 10000}
        d = self.request_transit_land(url, params=params)

        operators_intersecting_geom = []
        for operator in d['operators']:
            # Check if the service area of the operator intersects trail
            operator_geom = shape(operator['geometry'])
            intersects = geometry.intersects(operator_geom)
            if intersects:
                operators_intersecting_geom.append(operator)

        return operators_intersecting_geom


def operators_intersecting_geometry(geometry):
    """Find transit operators with service area in bbox

    Using the transit.land API, you can find all transit operators within a
    bounding box. Since the bbox of the PCT is quite large, I then check the
    service area polygon of each potential transit operator to see if it
    intersects the trail.

    Args:
        - bbox: tuple of minx, miny, maxx, maxy
    """
    # Create stringified bbox
    bbox = ','.join(map(str, geometry.bounds))

    url = 'https://transit.land/api/v1/operators'
    params = {'bbox': bbox, 'per_page': 1000}
    d = request_transit_land(url, params=params)

    operators_intersecting_geom = []
    for operator in d['operators']:
        # Check if the service area of the operator intersects trail
        operator_geom = shape(operator['geometry'])
        intersects = geometry.intersects(operator_geom)
        if intersects:
            operators_intersecting_geom.append(operator)

    return operators_intersecting_geom


def request_transit_land(url, params=None):
    """Wrapper to transit.land API to page over all results

    Args:
        - url: url to send requests to
        - params: None or dict of params for sending requests

    Returns:
        dict of transit.land output
    """

    # Page over responses if necessary
    # If there are more responses in another page, there will be a 'next'
    # key in the meta with the url to request
    all_results = {}
    while True:
        r = _make_request(url, params=params)
        d = r.json()

        # Add data to all_results
        for key, value in d.items():
            if key == 'meta':
                continue

            if not isinstance(value, list):
                msg = f'returned data in key {key} not of type list'
                raise ValueError(msg)

            all_results[key] = all_results.get(key, [])
            all_results[key].extend(value)

        # If the 'next' key does not exist, done; so break
        if d['meta'].get('next') is None:
            break

        # Otherwise, keep paging
        url = d['meta']['next']
        params = None

    return all_results


def _make_request(url, params=None):
    """Make request to transit.land API

    Wrapper for requests to transit.land API to stay within rate limit

    You can make 60 requests per minute to the transit.land API, which
    presumably resets after each 60-second period. (It's not per 1-second
    period, because I was able to make 60 requests in like 10 seconds).

    Given this, when I hit r.status_code, I'll sleep for 2 seconds before
    trying again.
    """
    r = requests.get(url, params=params)
    if r.status_code == 429:
        sleep(2)
        return _make_request(url, params=params)

    return r
