import * as React from "react";
import DeckGL from "@deck.gl/react";
import { MapController } from "deck.gl";
import { TileLayer, TripsLayer } from "@deck.gl/geo-layers";
// import { load } from "@loaders.gl/core";
import InteractiveMap, {
  _MapContext as MapContext,
  NavigationControl
} from "react-map-gl";
import { getInitialViewState } from "./utils";
import {
  Container,
  Accordion,
  Icon,
  Menu,
  Checkbox,
  Grid
} from "semantic-ui-react";
import { TransitLayer, interactiveLayerIds } from "./TransitLayer";

// You'll get obscure errors without including the Mapbox GL CSS
import "../../css/mapbox-gl.css";

const pickingRadius = 10;
const minHighlightZoom = 11;

class Map extends React.Component {
  state = {
    filterBoxExpanded: null,
    highlightStopsByRoute: false,
    highlightRoutesByStop: false,
    highlightedStopsOnestopIds: [],
    highlightedRoutesOnestopIds: [],
    zoom: null,
    includeTram: true,
    includeMetro: true,
    includeRail: true,
    includeBus: true,
    includeFerry: true,
    includeCablecar: true,
    time: 57700
  };

  // Called on click by deck.gl
  // event.x, event.y are the clicked x and y coordinates in pixels
  // If the deck.gl picking engine finds something, the `object` , `color` and
  // `layer` attributes will be non-null
  _updatePicked = event => {
    const { x, y } = event;
    const { highlightRoutesByStop, highlightStopsByRoute, zoom } = this.state;

    if (
      zoom < minHighlightZoom ||
      (!highlightStopsByRoute && !highlightRoutesByStop)
    ) {
      return this.setState({
        highlightedStopsOnestopIds: [],
        highlightedRoutesOnestopIds: []
      });
    }

    // You can pass those coordinates to React Map GL's queryRenderedFeatures
    // to query any desired layers rendered there.
    // Make sure you create the ref on InteractiveMap or StaticMap
    // Without an options parameter, checks all layers rendered by React Map GL
    if (!this.map) return;
    const features = this.map.queryRenderedFeatures(
      [
        [x - pickingRadius, y - pickingRadius],
        [x + pickingRadius, y + pickingRadius]
      ],
      { layers: interactiveLayerIds }
    );

    if (!features) {
      return this.setState({
        highlightedStopsOnestopIds: [],
        highlightedRoutesOnestopIds: []
      });
    }

    let highlightedStopIds = [];
    let highlightedRouteIds = [];
    for (const feature of features) {
      if (
        highlightStopsByRoute &&
        ["transit_routes_default", "transit_routes_highlighting"].includes(
          feature.layer.id
        )
      ) {
        if (feature.properties && feature.properties.stops_served_by_route) {
          highlightedStopIds = highlightedStopIds.concat(
            JSON.parse(feature.properties.stops_served_by_route)
          );
        }
      }

      if (highlightRoutesByStop && feature.layer.id === "transit_stops") {
        if (feature.properties && feature.properties.routes_serving_stop) {
          highlightedRouteIds = highlightedRouteIds.concat(
            JSON.parse(feature.properties.routes_serving_stop)
          );
        }
      }
    }
    this.setState({
      highlightedStopsOnestopIds: highlightedStopIds,
      highlightedRoutesOnestopIds: highlightedRouteIds
    });
  };

  _toggleState = name => {
    this.setState(prevState => ({
      [name]: !prevState[name]
    }));
  };

  onViewStateChange = ({ viewState }) => {
    const { zoom } = viewState;
    const newState = { zoom: zoom };

    // Reset highlighted objects when zooming out past minHighlightZoom
    if (zoom < minHighlightZoom) {
      newState["highlightedStopsOnestopIds"] = [];
      newState["highlightedRoutesOnestopIds"] = [];
    }
    this.setState(newState);
  };

  _renderDeckLayers() {
    const baseurl = "https://data.kylebarron.dev/all-transit/schedule/4_16-20";

    return [
      new TileLayer({
        minZoom: 12,
        maxZoom: 12,
        getTileData: ({ x, y, z }) =>
          fetch(`${baseurl}/${z}/${x}/${y}.json`).then(response =>
            response.json()
          ),

        renderSubLayers: props => {
          return new TripsLayer(props, {
            data: props.data,
            getPath: d => d.map(p => p.slice(0, 2)),
            getTimestamps: d => d.map(p => p.slice(2)),
            getColor: [253, 128, 93],
            opacity: 0.5,
            widthMinPixels: 2,
            rounded: true,
            trailLength: 500,
            currentTime: this.state.time,
            shadowEnabled: false
          });
        }
      })
    ];
  }

  render() {
    const { location } = this.props;
    const {
      highlightedStopsOnestopIds,
      highlightedRoutesOnestopIds,
      zoom
    } = this.state;

    return (
      <div ref={ref => (this.deckDiv = ref)}>
        <DeckGL
          ref={ref => {
            this.deck = ref;
          }}
          controller={{
            type: MapController
          }}
          initialViewState={getInitialViewState(location)}
          ContextProvider={MapContext.Provider}
          onClick={this._updatePicked}
          onHover={this._updatePicked}
          layers={this._renderDeckLayers()}
          pickingRadius={pickingRadius}
          onViewStateChange={this.onViewStateChange}
        >
          <InteractiveMap
            ref={ref => {
              this.map = ref && ref.getMap();
            }}
            mapStyle="https://raw.githubusercontent.com/kylebarron/fiord-color-gl-style/master/style.json"
            mapOptions={{ hash: true }}
          >
            <TransitLayer
              highlightedRouteIds={highlightedRoutesOnestopIds}
              highlightedStopIds={highlightedStopsOnestopIds}
              transitModes={{
                tram: this.state.includeTram,
                metro: this.state.includeMetro,
                rail: this.state.includeRail,
                bus: this.state.includeBus,
                ferry: this.state.includeFerry,
                cablecar: this.state.includeCablecar,
              }}
            />
          </InteractiveMap>

          {/* NavigationControl needs to be _outside_ InteractiveMap */}
          <div style={{ position: "absolute", right: 30, top: 30, zIndex: 1 }}>
            <NavigationControl />
          </div>
        </DeckGL>

        <Container
          style={{
            position: "absolute",
            width: 240,
            left: 30,
            top: 30,
            maxHeight: "70%",
            zIndex: 1,
            backgroundColor: "#fff",
            pointerEvents: "auto",
            overflowY: "auto"
          }}
        >
          <Accordion as={Menu} vertical fluid styled style={{ maxWidth: 240 }}>
            <Accordion.Title
              active={this.state.filterBoxExpanded}
              index={0}
              onClick={() => this._toggleState("filterBoxExpanded")}
            >
              <Icon name="dropdown" />
              Filters
            </Accordion.Title>
            <Accordion.Content active={this.state.filterBoxExpanded}>
              {zoom < 11 ? (
                <p>Zoom in for more options</p>
              ) : (
                <div>
                  <Checkbox
                    toggle
                    label="Highlight routes by stop"
                    onChange={() => this._toggleState("highlightRoutesByStop")}
                    checked={this.state.highlightRoutesByStop}
                  />
                  {/* <Checkbox
                    toggle
                    label="Highlight stops by route"
                    onChange={() => this._toggleState("highlightStopsByRoute")}
                    checked={this.state.highlightStopsByRoute}
                  /> */}
                </div>
              )}
              <Grid columns={1} relaxed>
                <Grid.Column>
                  {["Tram", "Metro", "Rail", "Bus", "Ferry", "Cablecar"].map(
                    mode => (
                    <Grid.Row>
                      <Checkbox
                        toggle
                        label={`${mode}`}
                        onChange={() => this._toggleState(`include${mode}`)}
                        checked={this.state[`include${mode}`]}
                      />
                    </Grid.Row>
                    )
                  )}
                </Grid.Column>
              </Grid>
            </Accordion.Content>
          </Accordion>
        </Container>
      </div>
    );
  }
}

export default Map;
