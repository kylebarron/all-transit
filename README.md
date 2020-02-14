# All transit

[![Build Status](https://travis-ci.org/kylebarron/all-transit.svg?branch=master)](https://travis-ci.org/kylebarron/all-transit)

[![Example Screenshot](assets/overview_screenshot.png)](https://kylebarron.dev/all-transit)

[Website: https://kylebarron.dev/all-transit](https://kylebarron.dev/all-transit)

All transit in the continental US, as reported by the [Transitland
database](https://transit.land). Inspired by [_All
Streets_](https://benfry.com/allstreets/map5.html).

## Website

The code for the website is in `site/`. It uses React, Gatsby, Deck.gl, and
React Map GL/Mapbox GL JS.

## Data

Most of the data-generating code for this project is done in Bash,
[`jq`](https://stedolan.github.io/jq/), GNU Parallel, and a couple Python
scripts. Data is kept in _newline-delimited JSON_ and _newline-delimited
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
transitland operators \
    --geometry data/gis/states/states.shp \
    > data/operators.geojson

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
transitland routes \
    --geometry data/gis/states/states.shp \
    > data/routes.geojson

# Split these routes into different files by operator
mkdir -p data/routes/
cat data/operator_onestop_ids.txt | while read operator_id
do
    cat data/routes.geojson \
        | jq -c "if .properties.operated_by_onestop_id == \"$operator_id\" then . else empty end" \
        > data/routes/$operator_id.geojson
done
```

Now that the routes are downloaded, I extract the identifiers for all
`RouteStopPattern`s and `Route`s.
```bash
# All route stop patterns `onestop_id`s for those routes:
cat data/routes.geojson \
    | jq '.properties.route_stop_patterns_by_onestop_id[]' \
    | uniq \
    | tr -d \" \
    > data/route_stop_patterns_by_onestop_id.txt

# All route onestop_ids
cat data/routes.geojson \
    | jq '.properties.onestop_id' \
    | uniq \
    | tr -d \" \
    > data/routes_onestop_ids.txt
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
rm data/stops.geojson
cat data/operator_onestop_ids.txt | while read operator_id
do
    transitland stops \
        --served-by $operator_id \
        --per-page 1000 \
        >> data/stops.geojson
done

# Split these stops into different files by operator
# NOTE: Again, if I were doing this again, I'd just write into individual files
# in the above step, but I didn't want to spend more time calling the API
# server.
mkdir -p data/stops/
cat data/operator_onestop_ids.txt | while read operator_id
do
    cat data/stops.geojson \
        | jq -c "if .properties.operators_serving_stop | any(.operator_onestop_id == \"$operator_id\") then . else empty end" \
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
# All route-stop-patterns (completed relatively quickly, overnight)
transitland onestop-id \
    --file data/route_stop_patterns_by_onestop_id.txt \
    > data/route-stop-patterns.json
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
rm data/ssp.json
mkdir -p data/ssp/
for i in {1..5}; do
    cat data/routes_onestop_ids_${i}.txt | while read route_id
    do
        transitland schedule-stop-pairs \
        --route-onestop-id $route_id \
        --per-page 1000 --active \
        | gzip >> data/ssp/ssp${i}.json.gz
    done
done
```

It probably would've been better to save `ScheduleStopPair`s in the above step
by `Route` identifier and not concatenating them all together. Alas. Since
`Stops` and `Routes` are saved by operator, I extract `ScheduleStopPairs` into
operator files as well, and then use them separately for the code later that
assigns geometries to `ScheduleStopPair`s.

First, find operator identifiers that exist in each fifth of the
`ScheduleStopPair`s, then loop over those to separate `ScheduleStopPair`s into
files by operator.
```bash
# Find operators that exist in each fifth of the ScheduleStopPairs files
for i in {1..5}; do
    gunzip -c data/ssp/ssp${i}.json.gz \
        | jq -c '.operator_onestop_id' \
        | uniq \
        | tr -d \" \
        > data/ssp/ssp${i}_operators.txt
done

# Sort into different files by operator
num_cpu=15
for i in {1..5}; do
    mkdir -p data/ssp_by_operator_id_${i}
    # I think the {} means "send all stdin arguments to the function"
    # So `{} $i` should send operator_id, i to sort_ssp_by_operator.sh
    cat data/ssp/ssp${i}_operators.txt \
        | parallel -P $num_cpu bash code/sort_ssp_by_operator.sh {} $i
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
# Writes mbtiles to data/routes.mbtiles
# The -c is important so that each feature gets output onto a single line
cat data/routes.geojson \
    | jq -c -f code/jq/routes.jq \
    | bash code/tippecanoe/routes.sh

# Writes mbtiles to data/operators.mbtiles
bash code/tippecanoe/operators.sh data/operators.geojson

# Writes mbtiles to data/stops.mbtiles
# The -c is important so that each feature gets output onto a single line
cat data/stops.geojson \
    | jq -c -f code/jq/stops.jq \
    | bash code/tippecanoe/stops.sh
```

Combine into single mbtiles
```bash
tile-join \
    -o data/all.mbtiles \
    --no-tile-size-limit \
    --force \
    stops.mbtiles operators.mbtiles routes.mbtiles
```

### Schedules

NOTE: Figure out a way to select by ssp id?? I.e. you're matching _StopPairs_ to
geometries, and then saving those geometries, and then ideally later when you
have many different _ScheduleStopPairs_ corresponding to those _StopPairs_ you
should be able to loop over them quickly instead of having to match the
_ScheduleStopPair_ to a geometry every time.

Try to import `ScheduleStopPair` data into sqlite.
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

Import CSV into sqlite3 db
```bash
for i in {1..5}; do
    gunzip -c data/ssp_sqlite/ssp${i}.csv.gz \
        | sqlite3 -csv data/ssp_sqlite/ssp.db '.import /dev/stdin ssp'
done
```

```bash
# Loop over _routes_
for i in {1..5}; do
    cat data/routes_onestop_ids_${i}.txt | while read route_id
    do
        # Find _a_ route with this route_id from routes.geojson so that I can
        # get its operator id
        operator_id=$(cat data/routes.geojson | jq -c "if .properties.onestop_id == \"$route_id\" then .properties.operated_by_onestop_id else empty end" | head -n 1 | tr -d \")
        echo "Found operator: $operator_id"
        echo "Running ssp_geom.sh for operator: $operator_id and route: $route_id"
        bash code/schedules/ssp_geom.sh "$operator_id" "$route_id"
    done
done
```

Then cut these into tiles:
```bash
rm -rf data/ssp_geom_tiles
mkdir -p data/ssp_geom_tiles
for file in data/ssp_geom/*.geojson; do
    # If file exists and has size > 0
    if [ -s $file ]; then
        python code/tile_geojson.py \
            `# Set minimum tile zoom to 12` \
            -z 12 \
            `# Set maximum tile zoom to 12` \
            -Z 12 \
            `# Only keep LineStrings` \
            --allowed-geom-type 'LineString' \
            `# Write tiles into the following root dir` \
            -d data/ssp_geom_tiles $file
    fi
done
```

Then compress these tiles
```bash
rm -rf data/ssp_geom_tiles_comp
mkdir -p data/ssp_geom_tiles_comp
for file in data/ssp_geom_tiles/**/*.geojson; do
    z="$(echo $file | awk -F'/' '{print $(NF-2)}')"
    x="$(echo $file | awk -F'/' '{print $(NF-1)}')"
    y="$(basename $file .geojson)"
    mkdir -p data/ssp_geom_tiles_comp/$z/$x
    # Take only the coordinates, minified, and gzip them
    cat $file \
    `# Take only the coordinates of each GeoJSON record` \
    | jq -c '.geometry.coordinates' \
    `# Convert JSONlines to JSON` \
    | jq -cs '.' \
    | gzip > data/ssp_geom_tiles_comp/$z/$x/$y.json
done
```

Upload to AWS
```bash
aws s3 cp \
    data/ssp_geom_tiles_comp s3://data.kylebarron.dev/all-transit/schedule/4_16-20/ \
    --recursive \
    --content-type application/json \
    --content-encoding gzip \
    `# Set to public read access` \
    --acl public-read
```
