{
    id: .id,
    type: .type,
    geometry: .geometry,
    properties: {
        operators_serving_stop: [.properties.operators_serving_stop[] | .operator_onestop_id],
        routes_serving_stop: [.properties.routes_serving_stop[] | .route_onestop_id]
    }
}
