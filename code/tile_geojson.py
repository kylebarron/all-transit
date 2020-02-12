from pathlib import Path

import click
import cligj
import geojson
import mercantile
from shapely.geometry import asShape, box
from shapely.ops import split


@click.command()
@cligj.features_in_arg
@click.option(
    '-z',
    '--min-zoom',
    type=int,
    required=True,
    help='Min zoom level to create tiles for',
)
@click.option(
    '-Z',
    '--max-zoom',
    type=int,
    required=True,
    help='Max zoom level to create tiles for (inclusive)',
)
@click.option(
    '-d',
    '--tile-dir',
    type=click.Path(file_okay=False, dir_okay=True, writable=True))
def cut_geojson(features, min_zoom, max_zoom, tile_dir):
    """Cut GeoJSON features into xyz tiles
    """
    tile_dir = Path(tile_dir)

    for feature in features:
        geometry = asShape(feature['geometry'])
        tiles = find_tiles(geometry, min_zoom, max_zoom)

        for tile in tiles:
            clipped_geometries = clip_geometry_to_tile(geometry, tile)

            new_features = [
                geojson.Feature(geometry=c, properties=feature['properties'])
                for c in clipped_geometries]

            # Write feature to tile_dir
            this_tile_dir = (tile_dir / str(tile.z) / str(tile.x))
            this_tile_dir.mkdir(parents=True, exist_ok=True)
            with open(this_tile_dir / f'{str(tile.y)}.geojson', 'a') as f:
                for new_feature in new_features:
                    f.write(geojson.dumps(new_feature, separators=(',', ':')))
                    f.write('\n')


def find_tiles(geometry, min_zoom, max_zoom):
    assert min_zoom <= max_zoom, 'min zoom must be <= max zoom'

    selected_tiles = []

    bound_tiles = mercantile.tiles(
        *geometry.bounds, zooms=range(min_zoom, max_zoom + 1))
    for tile in bound_tiles:
        if box(*mercantile.bounds(tile)).intersects(geometry):
            selected_tiles.append(tile)

    return selected_tiles


def clip_geometry_to_tile(geometry, tile):
    tile_geom = box(*mercantile.bounds(tile))

    # Geometry collection of split objects
    split_gc = split(geometry, tile_geom)

    return [g for g in split_gc if tile_geom.contains(g)]


if __name__ == '__main__':
    cut_geojson()
