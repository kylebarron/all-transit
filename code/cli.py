import json

import click
import geopandas as gpd
from shapely.geometry import box

from download import operators_intersecting_geometry


@click.command()
@click.option(
    '-b',
    '--bbox',
    required=False,
    default=None,
    type=str,
    help='Bounding box to get operators for')
@click.option(
    '-f',
    '--file',
    required=False,
    default=None,
    type=click.Path(exists=True, file_okay=True, readable=True),
    help='File with geometry to use. Must be readable by geopandas')
def operators(bbox, file):
    """Get transit operators within bbox or geometry
    """
    if len(list(map(bool, [bbox, file]))) != 1:
        raise ValueError('provide either bbox or file')

    if bbox:
        bbox = list(map(float, bbox.split(',')))
        geometry = box(*bbox)
    if file:
        # Read file into geodataframe
        gdf = gpd.read_file(file)
        # Coalesce into single geometry
        geometry = gdf.unary_union

    l = operators_intersecting_geometry(geometry)
    click.echo(json.dumps(l, separators=(',', ':')))
