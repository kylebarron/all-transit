# All transit

All transit in the continental US, as reported by <transit.land>.

```bash
git clone https://github.com/kylebarron/all-transit
cd all-transit
pip install transitland-wrapper
mkdir -p data

# All operators
transitland operators --geometry data/gis/states/states.shp > data/operators.geojson

# All routes
transitland routes --geometry data/gis/states/states.shp > data/routes.geojson

# All stops
transitland stops --geometry data/gis/states/states.shp > data/routes.geojson
```
