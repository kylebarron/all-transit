"""
Given an existing zoom level with full-resolution tiles, create desired overview
zoom levels.

For now, I'll set a max file size and then select a random fraction of the
features in child tiles in order to meet this size requirement. On the plus
side, keeping a random fraction is simple, and should maintain a general sense
of areas with more transit schedules. As a con, this most likely creates
discontinuities at tile boundaries, since a transit route may be randomly
removed from one side of the tile boundary, but kept in the other.
"""

import random
from pathlib import Path

import click
import geojson
import mercantile


@click.command()
@click.option(
    '-z',
    '--min-zoom',
    type=int,
    required=True,
    help='Min zoom level to create tiles for',
)
@click.option(
    '-Z',
    '--existing-zoom',
    type=int,
    required=True,
    help=
    'Max already-generated zoom level. These tiles are assumed to already exist.',
)
@click.option(
    '-d',
    '--tile-dir',
    type=click.Path(
        file_okay=False, dir_okay=True, readable=True, writable=True),
    required=True,
    help=
    'Root of directory with tiles. The folder `existing-zoom` will not be modified, but lower zooms (down to min-zoom) will be added.'
)
@click.option(
    '--max-coords',
    type=int,
    default=200000,
    help=
    'Max number of coordinates in a tile. I found that a gzip-compressed tile with ~800,000 coordinates was ~2MB, so in order to keep gzip-compressed tiles to around 500KB, 200,000 coordinates is probably a good ballpark estimate for maximum number of coordinates.'
)
def main(min_zoom, existing_zoom, tile_dir, max_coords):
    """Create overview tiles
    """
    tile_dir = Path(tile_dir)
    while existing_zoom > min_zoom:
        print(f'Generating overview tiles for zoom {existing_zoom - 1}')
        generate_overview_for_zoom(existing_zoom, tile_dir, max_coords)
        existing_zoom -= 1


def generate_overview_for_zoom(existing_zoom, tile_dir, max_coords):
    """Generate overview tiles for a given zoom level

    Args:
        - existing_zoom: the zoom level for which tiles already exist
        - tile_dir: the root of directory with tiles
    """
    zoom_dir = tile_dir / str(existing_zoom)
    tile_coords = []
    for path in zoom_dir.glob('*/*.geojson'):
        y = int(path.stem)
        x = int(path.parents[0].name)
        tile_coords.append((x, y))

    tiles = [mercantile.Tile(x, y, existing_zoom) for x, y in tile_coords]
    parents = {mercantile.parent(t) for t in tiles}
    for parent in parents:
        # Which of its children exist?
        children = [c for c in mercantile.children(parent) if c in tiles]

        # If the parent only has one child, then you can assume the child was
        # already small enough, and just write
        if len(children) == 1:
            # Load the child's features
            features = load_features(tile=children[0], tile_dir=tile_dir)
            # And write to the parent's tile
            write_geojson(features=features, tile=parent, tile_dir=tile_dir)
            continue

        # Otherwise, we have more than one child.
        # Load all the features, then determine if there are too many
        features = []
        for child in children:
            features.extend(load_features(tile=child, tile_dir=tile_dir))

        features = simplify_features(features, max_coords)
        write_geojson(features=features, tile=parent, tile_dir=tile_dir)


def simplify_features(features, max_coords):
    """Remove features randomly to stay within maximum coordinate limit

    Args:
        - features: list of geojson features
        - max_coords: max number of individual (3D) coordinates
    """
    n_coords = sum([len(f['geometry']['coordinates']) for f in features])
    if n_coords < max_coords:
        return features

    # Else, need to simplify
    while n_coords > max_coords:
        # Take away 1% of features each iteration
        n_features = len(features)
        n_to_remove = round(n_features * .01)

        # Find indices of random features to remove
        idx_to_remove = random.sample(range(n_features), n_to_remove)

        # Take away those features
        # Note that you need to delete them in reverse order so that you don't
        # throw off the subsequent indexes
        # https://stackoverflow.com/a/11303234
        for idx in sorted(idx_to_remove, reverse=True):
            del features[idx]

        # Recompute number of coords
        n_coords = sum([len(f['geometry']['coordinates']) for f in features])

    return features


def load_features(tile, tile_dir):
    path = tile_path(tile, tile_dir)
    with open(path) as f:
        return [geojson.loads(line) for line in f.readlines()]


def write_geojson(features, tile, tile_dir):
    path = tile_path(tile, tile_dir)
    # Make directory if it doesn't exist
    path.parents[0].mkdir(exist_ok=True, parents=True)
    with open(path, 'w') as f:
        for feature in features:
            f.write(geojson.dumps(feature, separators=(',', ':')))
            f.write('\n')


def tile_path(tile, tile_dir, ext='.geojson'):
    x, y, z = tile.x, tile.y, tile.z
    return tile_dir / str(z) / str(x) / f'{y}{ext}'


if __name__ == '__main__':
    main()
