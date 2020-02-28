import json
import os
from pathlib import Path

import click
import cligj
import geojson
import geopandas as gpd


@click.command()
@click.option(
    '--amtrak-shp',
    type=click.Path(),
    required=True,
)
@cligj.features_in_arg
def main(features, amtrak_shp):
    current_path = Path(os.path.realpath(__file__))
    amtrak_xw_path = current_path.parents[0] / 'amtrak_xw.json'

    with open(amtrak_xw_path) as f:
        xw = json.load(f)

    gdf = gpd.read_file(amtrak_shp)
    gdf = gdf.to_crs(epsg=4326)

    for feature in features:
        # Get onestop id of current feature
        route_onestop_id = feature['properties']['onestop_id']

        # Find the shapefile_names that are mapped to this onestop_id
        # Note that there can be multiple shapefile_names mapped to a single
        # onestop_id
        shp_names = [
            d['shapefile_name']
            for d in xw
            if d['route_onestop_id'] == route_onestop_id]

        # Find rows of shapefile that match these names
        rows = gdf[gdf['NAME'].isin(shp_names)]

        # Iterate over these rows
        for row in rows.itertuples():
            new_geom = row.geometry
            new_properties = feature['properties']
            new_id = feature['id']
            new_feature = geojson.Feature(
                id=new_id, geometry=new_geom, properties=new_properties)
            print(json.dumps(new_feature, separators=(',', ':')))


if __name__ == '__main__':
    main()
