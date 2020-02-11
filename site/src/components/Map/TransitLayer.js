import * as React from "react";
import { Source, Layer } from "react-map-gl";

// List of Mapbox/React Map GL layer ids that are allowed to be picked
// These will be picked if no deck.gl layer is above it.
export const interactiveLayerIds = [
  // React map gl layers:
  "transit_routes",
  "transit_stops"
];

export function TransitLayer(props) {
  return (
    <Source
      id="transit"
      type="vector"
      minzoom={0}
      maxzoom={11}
      tiles={[
        "https://mbtiles.nst.guide/services/all-transit/all/tiles/{z}/{x}/{y}.pbf"
      ]}
    >
      <Layer
        id="transit_routes_casing"
        source-layer="routes"
        type="line"
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
              [15, 0.7]
            ]
          }
        }}
      />
      <Layer
        id="transit_routes"
        source-layer="routes"
        type="line"
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
              [15, 0.7]
            ]
          }
          // "line-opacity": ["case", ["has", "color"], 0.7, 0.8]
        }}
      />
      <Layer
        id="transit_stops"
        source-layer="stops"
        minzoom={11}
        type="circle"
        paint={{
          "circle-blur": 0.2,
          "circle-opacity": {
            stops: [
              [11, 0.4],
              [15, 0.6]
            ]
          },
          "circle-radius": {
            stops: [
              [11, 1],
              [15, 5]
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
        filter={[
          "all",
          ["!=", ["get", "operated_by_name"], "Amtrak California"],
          ["!=", ["get", "operated_by_name"], "Amtrak Chartered Vehicle"]
        ]}
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
          "text-max-width": 15
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
