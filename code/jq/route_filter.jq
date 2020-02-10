# Note, this is run _after_ an initial pass of `routes.jq`, and after the first pass of Tippecanoe.
# Set stops_served_by_route to an empty array, and delete the onestop_id

.properties.stops_served_by_route = [] | del(.properties.onestop_id)
