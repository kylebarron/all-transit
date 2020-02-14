import * as React from "react";
import { Source, Layer } from "react-map-gl";

// List of Mapbox/React Map GL layer ids that are allowed to be picked
// These will be picked if no deck.gl layer is above it.
export const interactiveLayerIds = [
  "transit_routes_default",
  "transit_routes_highlighting",
  "transit_stops"
];

function transitModeFilter(transitModes) {
  // https://stackoverflow.com/a/25095796
  const transitTypes = Object.keys(transitModes).filter(k => transitModes[k]);
  const transitModeFilter = [
    "in",
    ["get", "vehicle_type"],
    ["literal", transitTypes]
  ];
  return transitModeFilter;
}

function operatorsFilter(operatorsDisabled) {
  const disabled_operator_ids = [];
  for (const operator_id of Object.keys(operatorsDisabled)) {
    const disabled = operatorsDisabled[operator_id];
    if (disabled) {
      disabled_operator_ids.push(operator_id);
    }
  }

  // NOTE! ["get", variable_name] is necessary!!!
  // If you don't add ["get"] it won't try to access the name from the vector
  // tile
  const filter = [
    "!",
    [
      "in",
      ["get", "operated_by_onestop_id"],
      ["literal", disabled_operator_ids]
    ]
  ];
  return filter;
}

export function TransitLayer(props) {
  const {
    highlightedRouteIds,
    highlightedStopIds,
    transitModes,
    operatorsDisabled,
    showRouteLabels
  } = props;

  // Mapbox style spec filter syntax allows you to have "all" and then a list of
  // filters. So I should be able to just append filters to this list and then
  // pass the list to the Layers
  // Note that this is specifically the filter passed to the layers that use the
  // "routes" source-layer
  const routesFilter = ["all"];

  // Add transit mode filter
  routesFilter.push(transitModeFilter(transitModes));

  // Add operators filter
  routesFilter.push(operatorsFilter(operatorsDisabled));

  const useRouteHighlighting = !(
    !Array.isArray(highlightedRouteIds) || !highlightedRouteIds.length
  );

  return (
    <Source
      id="transit"
      type="vector"
      url="https://mbtiles.nst.guide/services/all-transit/all"
    >
      <Layer
        id="transit_operators"
        source-layer="operators"
        type="fill"
        paint={{
          "fill-opacity": 0
        }}
      />
      <Layer
        id="transit_routes_casing_default"
        beforeId="highway_name_other"
        source-layer="routes"
        type="line"
        filter={routesFilter}
        paint={{
          "line-color": "#000",
          "line-width": {
            stops: [
              [5, 0.3],
              [15, 0.7]
            ]
          },
          "line-gap-width": 1,
          "line-opacity": {
            stops: [
              [4, 0.3],
              [14, 0.4]
            ]
          }
        }}
        layout={{
          visibility: useRouteHighlighting ? "none" : "visible"
        }}
      />
      <Layer
        id="transit_routes_casing_highlighting"
        beforeId="highway_name_other"
        source-layer="routes"
        type="line"
        filter={routesFilter}
        paint={{
          "line-color": "#000",
          "line-width": {
            stops: [
              [5, 0.3],
              [15, 0.4]
            ]
          },
          "line-gap-width": 1,
          "line-opacity": [
            "case",
            ["in", ["get", "onestop_id"], ["literal", highlightedRouteIds]],
            1,
            0.05
          ]
        }}
        layout={{
          visibility: useRouteHighlighting ? "visible" : "none"
        }}
      />
      <Layer
        id="transit_routes_default"
        beforeId="highway_name_other"
        source-layer="routes"
        type="line"
        filter={routesFilter}
        paint={{
          "line-color": [
            "case",
            ["has", "color"],
            ["concat", "#", ["downcase", ["get", "color"]]],
            "hsl(229, 50%, 35%)"
          ],
          "line-width": {
            stops: [
              [5, 0.7],
              [15, 1.5]
            ]
          },
          "line-opacity": {
            stops: [
              [4, 0.3],
              [14, 0.4]
            ]
          }
        }}
        layout={{
          visibility: useRouteHighlighting ? "none" : "visible"
        }}
      />
      <Layer
        id="transit_routes_highlighting"
        beforeId="highway_name_other"
        source-layer="routes"
        type="line"
        filter={routesFilter}
        paint={{
          "line-color": [
            "case",
            ["has", "color"],
            ["concat", "#", ["downcase", ["get", "color"]]],
            "hsl(229, 50%, 35%)"
          ],
          "line-width": {
            stops: [
              [5, 0.7],
              [15, 1.5]
            ]
          },
          "line-opacity": [
            "case",
            ["in", ["get", "onestop_id"], ["literal", highlightedRouteIds]],
            1,
            0.05
          ]
        }}
        layout={{
          visibility: useRouteHighlighting ? "visible" : "none"
        }}
      />
      <Layer
        id="transit_stops"
        beforeId="highway_name_other"
        source-layer="stops"
        minzoom={11}
        type="circle"
        paint={{
          "circle-blur": 0.2,
          "circle-opacity": {
            stops: [
              [11, 0.4],
              [15, 0.5]
            ]
          },
          "circle-radius": {
            stops: [
              [11, 1],
              [15, 4]
            ]
          },
          "circle-color": "#cccccc",
          "circle-stroke-color": "#000000",
          "circle-stroke-width": 0.6
        }}
      />

      <Layer
        id="transit_routes_label"
        source-layer="routes"
        type="symbol"
        filter={routesFilter}
        minzoom={13}
        layout={{
          "symbol-placement": "line",
          "text-anchor": "center",
          "text-field": "{name}",
          "text-font": ["Metropolis Regular"],
          "text-offset": [1, 0],
          "text-size": {
            base: 1,
            stops: [
              [5, 10],
              [14, 10]
            ]
          },
          "symbol-spacing": 350,
          "text-max-angle": 50,
          "text-letter-spacing": 0,
          "text-max-width": 15,
          visibility: showRouteLabels ? "visible" : "none"
        }}
        paint={{
          "text-color": "rgba(255, 255, 255, 1)",
          "text-halo-blur": 0,
          "text-halo-width": 1,
          "text-halo-color": "rgba(30, 30, 30, 1)"
        }}
      />
    </Source>
  );
}
