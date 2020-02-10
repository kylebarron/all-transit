{
    id: .id,
    type: .type,
    geometry: .geometry,
    properties: {
        color: .properties.color,
        name: .properties.name,
        vehicle_type: .properties.vehicle_type,
        # This will be filtered out for all zoom < max_zoom in route_filter.jq
        onestop_id: .properties.onestop_id,
        long_name: .properties.tags.route_long_name,
        # This will be filtered out for all zoom < max_zoom in route_filter.jq
        stops_served_by_route: [.properties.stops_served_by_route[] | .stop_onestop_id],
        operated_by_onestop_id: .properties.operated_by_onestop_id,
    }
}
