# All Transit

[![Build Status](https://travis-ci.org/kylebarron/all-transit.svg?branch=master)](https://travis-ci.org/kylebarron/all-transit)

[![Static image of US Transit](static_image/us.png)](https://all-transit.com)

[Website: https://kylebarron.dev/all-transit](https://kylebarron.dev/all-transit)

All transit, as reported by the [Transitland][transitland] database. Inspired by
[_All Streets_][all_streets]. I have a blog post [here][blog_post] detailing
more information about the project.

[transitland]: https://transit.land
[all_streets]: https://benfry.com/allstreets/map5.html
[blog_post]: https://kylebarron.dev/blog/all-transit

## Website

The code for the website is in `site/`. It uses React, Gatsby, Deck.gl, and
React Map GL/Mapbox GL JS.

## Static SVG/PNG

The `static_image` folder contains code to generate an SVG and PNG of all the
routes in the U.S. It uses `d3` and
[`geo2svg`](https://github.com/d3/d3-geo-projection/blob/master/README.md#geo2svg).

## Data

Most of the data-generating code for this project is done in Bash,
[`jq`](https://stedolan.github.io/jq/), GNU Parallel, SQLite, and a couple
Python scripts. Data is kept in _newline-delimited JSON_ and _newline-delimited
GeoJSON_ for all intermediate steps to facilitate streaming and keep memory use
low.

### Data Download

Clone this Git repository and install the Python package I wrote to easily
access the Transitland API.
```bash
git clone https://github.com/kylebarron/all-transit
cd all-transit
pip install transitland-wrapper
mkdir -p data
```

Each of the API endpoints allows for a bounding box. At first, I tried to just
pass a bounding box of the entire United States to these APIs and page through
the results. Unsurprisingly, that method isn't successful for the endpoints that
have more data to return, like stops and schedules. I found that for the
schedules endpoint, the API was really slow and occasionally timed out when I
was trying to request something with `offset=100000`, because presumably it
takes a lot of time to find the 100,000th row of a given query.

Because of this, I found it best in general to split API queries into smaller
pieces, by using e.g. operator ids or route ids.

#### Operators

Download all operators whose service area intersects the continental US, and
then extract their identifiers.
```bash
# All operators
transitland operators --page-all > data/operators_new.geojson

# All operator `onestop_id`s
cat data/operators.geojson \
    | jq '.properties.onestop_id' \
    | uniq \
    | \
    tr -d \" \
    > data/operator_onestop_ids.txt
```

#### Routes

I downloaded routes by the geometry of the US, and then later found it best to
split the response into separate files by operator. If I were to run this
download again, I'd just download routes by operator to begin with.

```bash
# All routes
rm -rf data/routes
mkdir -p data/routes
cat data/operator_onestop_ids.txt | while read operator_id
do
    transitland routes \
        --page-all \
        --operated-by $operator_id \
        --per-page 1000 \
        > data/routes/$operator_id.geojson
done
```

Now that the routes are downloaded, I extract the identifiers for all
`RouteStopPattern`s and `Route`s.
```bash
mkdir -p data/route_stop_patterns_by_onestop_id/
cat data/operator_onestop_ids.txt | while read operator_id
do
    cat data/routes/$operator_id.geojson \
        | jq '.properties.route_stop_patterns_by_onestop_id[]' \
        | uniq \
        | tr -d \" \
        > data/route_stop_patterns_by_onestop_id/$operator_id.txt
done

mkdir -p data/routes_onestop_ids/
cat data/operator_onestop_ids.txt | while read operator_id
do
    cat data/routes/$operator_id.geojson \
        | jq '.properties.onestop_id' \
        | uniq \
        | tr -d \" \
        > data/routes_onestop_ids/$operator_id.txt
done
```

In order to split up how I later call the `ScheduleStopPairs` API endpoint, I
split the `Route` identifiers into sections. There are just shy of 15,000 route
identifiers, so I split into 5 files of roughly equal 3,000 route identifiers.
```bash
# Split into fifths so that I can call the ScheduleStopPairs API in sections
cat routes_onestop_ids.txt \
    | sed -n '1,2999p;3000q' \
    > routes_onestop_ids_1.txt
cat routes_onestop_ids.txt \
    | sed -n '3000,5999p;6000q' \
    > routes_onestop_ids_2.txt
cat routes_onestop_ids.txt \
    | sed -n '6000,8999p;9000q' \
    > routes_onestop_ids_3.txt
cat routes_onestop_ids.txt \
    | sed -n '9000,11999p;12000q' \
    > routes_onestop_ids_4.txt
cat routes_onestop_ids.txt \
    | sed -n '12000,15000p;15000q' \
    > routes_onestop_ids_5.txt
```

#### Stops

`Stops` are points along a `Route` or `RouteStopPattern` where passengers may
get on or off.

Downloading stops by operator was necessary to keep the server from paging
through too long of results. I was stupid and concatenated them all into a
single file, which I later saw that I needed to split with `jq`. If I were
downloading these again, I'd write each `Stops` response into a file named by
operator.
```bash
# All stops
rm -rf data/stops
mkdir -p data/stops
cat data/operator_onestop_ids_new.txt | while read operator_id
do
    transitland stops \
        --page-all \
        --served-by $operator_id \
        --per-page 1000 \
        > data/stops/$operator_id.geojson
done
```

#### Route Stop Patterns

`RouteStopPattern`s are portions of a route. I think an easy way to think of the
difference is the a `Route` can be a MultiLineString, while a `RouteStopPattern`
is always a LineString.

So far I haven't actually needed to use `RouteStopPattern`s for anything. I
would've ideally matched `ScheduleStopPair`s to `RouteStopPattern`s instead of
to `Route`s, but I found that some `ScheduleStopPair` have missing
`RouteStopPattern`s, while `Route` is apparently never missing.

```bash
mkdir -p data/route_stop_patterns/
cat data/operator_onestop_ids.txt | while read operator_id
do
    transitland onestop-id \
        --page-all \
        --file data/route_stop_patterns_by_onestop_id/$operator_id.txt \
        > data/route_stop_patterns/$operator_id.json
done
```

#### Schedule Stop Pairs

`ScheduleStopPair`s are edges along a `Route` or `RouteStopPattern` that define
a single instance of transit moving between a pair of stops along the route.

I at first tried to download this by `operator_id`, but even that stalled the
server because some operators in big cities have millions of different
`ScheduleStopPair`s. Instead I downloaded by `route_id`.

Apparently you can only download by `Route` and not by `RouteStopPattern`, or
else I probably would've chosen the latter, which might've made associating
`ScheduleStopPair`s to geometries easier.

I used each fifth of the `Route` identifiers from earlier so that I could make
sure each portion was correctly downloaded.
```bash
# All schedule-stop-pairs
# Best to loop over route_id, not operator_id
mkdir -p data/ssp/
cat data/operator_onestop_ids_new.txt | while read operator_id
do
    cat data/routes_onestop_ids/$operator_id.txt | while read route_id
    do
        transitland schedule-stop-pairs \
            --page-all \
            --route-onestop-id $route_id \
            --per-page 1000 \
            --active \
            | gzip >> data/ssp/$operator_id.json.gz
        touch data/ssp/$operator_id.finished
    done
done

for i in {1..5}; do
    cat data/routes_onestop_ids_${i}.txt | while read route_id
    do
        transitland schedule-stop-pairs \
        --page-all \
        --route-onestop-id $route_id \
        --per-page 1000 --active \
        | gzip >> data/ssp/ssp${i}.json.gz
    done
done
```

### Vector tiles for Operators, Routes, Stops

I generate vector tiles for the routes, operators, and stops. I have `jq`
filters in `code/jq/` to reshape the GeoJSON into the format I want, so that the
correct properties are included in the vector tiles.

In order to keep the size of the vector tiles small:

- The `stops` layer is only included at zoom 11
- The `routes` layer only includes metadata about the identifiers of the stops
  that it passes at zoom 11

```bash
# Writes mbtiles to data/mbtiles/routes.mbtiles
# The -c is important so that each feature gets output onto a single line
find data/routes -type f -name '*.geojson' -exec cat {} \; \
    `# Apply jq filter at code/jq/routes.jq` \
    | jq -c -f code/jq/routes.jq \
    | bash code/tippecanoe/routes.sh

# Writes mbtiles to data/mbtiles/operators.mbtiles
bash code/tippecanoe/operators.sh data/operators.geojson

# Writes mbtiles to data/mbtiles/stops.mbtiles
# The -c is important so that each feature gets output onto a single line
find data/stops -type f -name '*.geojson' -exec cat {} \; \
    | jq -c -f code/jq/stops.jq \
    | bash code/tippecanoe/stops.sh
```

Combine into single mbtiles
```bash
tile-join \
    -o data/mbtiles/all.mbtiles \
    `# Don't enforce size limits;` \
    `# Size limits already enforced individually for each sublayer` \
    --no-tile-size-limit \
    `# Overwrite existing mbtiles` \
    --force \
    `# Input files` \
    data/mbtiles/stops.mbtiles \
    data/mbtiles/operators.mbtiles \
    data/mbtiles/routes.mbtiles
```

Then publish! Host on a small server with
[`mbtileserver`](https://github.com/consbio/mbtileserver) or export the
`mbtiles` to a directory of individual tiles with
[`mb-util`](https://github.com/mapbox/mbutil) and upload the individual files to
S3.

I'll upload this to S3:

Export mbtiles to a directory
```bash
mb-util \
    `# Existing mbtiles` \
    data/all.mbtiles \
    `# New directory` \
    data/all \
    `# Set file extension to pbf` \
    --image_format=pbf
```

Then upload to S3
```bash
# First the tile.json
aws s3 cp \
    code/tile/op_rt_st.json s3://data.kylebarron.dev/all-transit/op_rt_st/tile.json \
    --content-type application/json \
    `# Set to public read access` \
    --acl public-read
aws s3 cp \
    data/all s3://data.kylebarron.dev/all-transit/op_rt_st/ \
    --recursive \
    --content-type application/x-protobuf \
    --content-encoding gzip \
    `# Set to public read access` \
    --acl public-read \
    `# 6 hour cache; one day swr` \
    --cache-control "public, max-age=21600, stale-while-revalidate=86400"
```

### Schedules

The schedule component is my favorite part of the project. You can see streaks
moving around that correspond to transit vehicles: trains, buses, ferries. This
data comes from actual schedule information from the Transitland API and matches
it to route geometries. (Though it's not real-time info, so it doesn't reflect
delays).

I use the deck.gl
[`TripsLayer`](https://deck.gl/#/documentation/deckgl-api-reference/layers/trips-layer)
to render the schedule data as an animation. That means that I need to figure
out the best way to transport three-dimensional `LineStrings` (where the third
dimension refers to time) to the client. Unfortunately, at this time Tippecanoe
[doesn't support three-dimensional
coordinates](https://github.com/mapbox/tippecanoe/issues/714). The
recommendation in that thread was to reformat to have individual points with
properties. That would make it harder to associate the points to lines, however.
I eventually decided it was best to pack the data into tiled
gzipped-minified-GeoJSON. And since I know that all features are `LineStrings`,
and since I have no properties that I care about, I take only the coordinates,
so that the data the client receives is like:

```json
[
    [
        [
            0, 1, 2
        ],
        [
            1, 2, 3
        ]
    ],
    [
        []
        ...
    ]
]
```

I currently store the third coordinate as seconds of the day. So that 4pm is `16
* 60 * 60 = 57000`.

In order to make the data download manageable, I cut each GeoJSON into xyz map
tiles, so that only data pertaining to the current viewport is loaded. For dense
cities like Washington DC and New York City, some of the LineStrings are very
dense, so I cut the schedule tiles into full resolution at zoom 13, and then
generate overview tiles for lower zooms that contain a fraction of the features
of their child tiles.

I generated tiles in this manner down to zoom 2, but discovered that performance
was very poor on lower-powered devices like my phone. Because of that, I think
it's best to have the schedule feature disabled by default.

#### Data Processing

I originally tried to do everything with `jq`, but the schedule data for all
routes in the US as uncompressed JSON is >100GB and things were too slow. I
tried SQLite and it's pretty amazing.

To import `ScheduleStopPair` data into SQLite, I first converted the JSON files
to CSV:
```bash
# Create CSV file with data
mkdir -p data/ssp_sqlite/
for i in {1..5}; do
    # header line
    gunzip -c data/ssp/ssp${i}.json.gz \
        | head -n 1 \
        | jq -rf code/ssp/ssp_keys.jq \
        | gzip \
        > data/ssp_sqlite/ssp${i}.csv.gz
    # Data
    gunzip -c data/ssp/ssp${i}.json.gz \
        | jq -rf code/ssp/ssp_values.jq \
        | gzip \
        >> data/ssp_sqlite/ssp${i}.csv.gz
done
```

Then import the CSV files into SQLite:
```bash
for i in {1..5}; do
    gunzip -c data/ssp_sqlite/ssp${i}.csv.gz \
        | sqlite3 -csv data/ssp_sqlite/ssp.db '.import /dev/stdin ssp'
done
```

Create SQLite index on `route_id`
```bash
sqlite3 data/ssp_sqlite/ssp.db \
    'CREATE INDEX route_onestop_id_idx ON ssp(route_onestop_id);'
```

I found it best to loop over `route_id`s when matching schedules to route
geometries. Here I create a crosswalk with the operator id for each route, so
that I can pass to my Python script 1) `ScheduleStopPair`s pertaining to a
route, 2) `Stops` by operator and 3) `Routes` by operator.
```bash
# Make xw with route_id: operator_id
cat data/routes/*.geojson \
    | jq -c '{route_id: .properties.onestop_id, operator_id: .properties.operated_by_onestop_id}' \
    > data/route_operator_xw.json
```

Here's the meat of connecting schedules to route geometries. The bash script
calls `code/schedules/ssp_geom.py`, and the general process of that script is:

1. Load stops, routes, and route stop patterns for the operator
2. Load provided `ScheduleStopPair`s from stdin
3. Iterate over every `ScheduleStopPair`. For each pair, try to find the route stop pattern it's associated with. If it exists, use the linear stop distances contained in the `ScheduleStopPair` and Shapely's linear referencing methods to take the substring of that `LineString`.
4. If a route stop pattern isn't found directly, find the associated route, then find its associate route stop patterns, then try taking a substring of each of those, checking that the start/end points are very close to the start/end stops.
5. As a fallback, skip route stop patterns entirely. Find the starting/ending `Point`s; find the nearest point on the route for each of those points, and take the line between them.
5. Get the time at which the vehicle leaves the start stop and at which it
    arrives at the destination stop. Then linearly interpolate this along
    every coordinate of the `LineString`. This way, the finalized
    `LineString`s have the same geometry as the original routes, and every
    coordinate has a time.

```bash
# Loop over _routes_
num_cpu=12
for i in {1..5}; do
    cat data/routes_onestop_ids_${i}.txt \
        | parallel -P $num_cpu bash code/schedules/ssp_geom.sh {}
done
```

Now in `data/ssp/geom` I have a newline-delimited GeoJSON file for every route.
I take all these individual features and cut them into individual tiles for a
zoom that has all the original data with no simplification, which I currently
have as zoom 13.
```bash
rm -rf data/ssp/tiles
mkdir -p data/ssp/tiles
find data/ssp/geom/ -type f -name 'r-*.geojson' -exec cat {} \; \
    | uniq \
    | python code/tile/tile_geojson.py \
            `# Set minimum and maximum tile zooms` \
            -z 13 -Z 13 \
            `# Only keep LineStrings` \
            --allowed-geom-type 'LineString' \
            `# Write tiles into the following root dir` \
            -d data/ssp/tiles
```

Create overview tiles for lower zooms
```bash
python code/tile/create_overview_tiles.py \
    --min-zoom 10 \
    --existing-zoom 13 \
    --tile-dir data/ssp/tiles \
    --max-coords 150000
```

Make gzipped protobuf files from these tiles:
```bash
rm -rf data_us/ssp/pbf
mkdir -p data_us/ssp/pbf
num_cpu=15
for zoom in {10..13}; do
    find data_us/ssp_geom_tiles/${zoom} -type f -name '*.geojson' \
        | parallel -P $num_cpu bash code/tile/compress_tiles_pbf.sh {}
done
```

Upload to AWS
```bash
aws s3 cp \
    data/ssp/pbf/13 s3://data.kylebarron.dev/all-transit/pbfv2/schedule/4_16-20/13 \
    --recursive \
    --content-type application/x-protobuf \
    --content-encoding gzip \
    `# Set to public read access` \
    --acl public-read
```

## Feed Attribution

Several data providers wish to be accredited when you use their data.

Download all feed information:

```bash
transitland feeds --page-all > data/feeds.geojson
python code/generate_attribution.py data/feeds.geojson \
    | gzip \
    > data/attribution.json.gz
aws s3 cp \
    data/attribution.json.gz \
    s3://data.kylebarron.dev/all-transit/attribution.json \
    --content-type application/json \
    --content-encoding gzip \
    --acl public-read
```
