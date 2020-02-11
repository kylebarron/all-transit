import * as React from "react";
import DeckGL from "@deck.gl/react";
import { MapController } from "deck.gl";
import InteractiveMap, {
  _MapContext as MapContext,
  NavigationControl
} from "react-map-gl";
import { getInitialViewState } from "./utils";
import { Container, Accordion, Icon, Menu, Checkbox } from "semantic-ui-react";
import { TransitLayer, interactiveLayerIds } from "./TransitLayer";

// You'll get obscure errors without including the Mapbox GL CSS
import "../../css/mapbox-gl.css";

const pickingRadius = 5;

class Map extends React.Component {
  state = {
    pickedObject: null,
    pickedLayer: null,
    highlightStopsByRoute: false,
    highlightRoutesByStop: true,
    highlightedStopsOnestopIds: [],
    highlightedRoutesOnestopIds: [],
    zoom: null
  };

  // Called on click by deck.gl
  // event.x, event.y are the clicked x and y coordinates in pixels
  // If the deck.gl picking engine finds something, the `object` , `color` and
  // `layer` attributes will be non-null
  _updatePicked = event => {
    const { x, y, object, layer } = event;
    const { highlightRoutesByStop, highlightStopsByRoute } = this.state;

    // If object and layer both exist, then deck.gl found an object, and I
    // won't query for the Mapbox layers underneath
    if (object && layer) {
      return this.setState({
        pickedObject: object,
        pickedLayer: layer
      });
    }

    if (!highlightStopsByRoute || !highlightRoutesByStop) {
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
      console.log(feature);

      if (highlightStopsByRoute && feature.layer.id === "transit_routes") {
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

  onViewStateChange = ({viewState}) => {
    this.setState({zoom: viewState.zoom})
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
          // layers={layers}
          ContextProvider={MapContext.Provider}
          onClick={this._updatePicked}
          onHover={this._updatePicked}
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
            />
          </InteractiveMap>

          {/* NavigationControl needs to be _outside_ InteractiveMap */}
          <div style={{ position: "absolute", right: 30, top: 110, zIndex: 1 }}>
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
              active={this.state.dataOverlaysExpanded}
              index={0}
              onClick={() => this._toggleState("dataOverlaysExpanded")}
            >
              <Icon name="dropdown" />
              Filters
            </Accordion.Title>
            <Accordion.Content active={this.state.dataOverlaysExpanded}>
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
                  <Checkbox
                    toggle
                    label="Highlight stops by route"
                    onChange={() => this._toggleState("highlightStopsByRoute")}
                    checked={this.state.highlightStopsByRoute}
                  />
                </div>
              )}
            </Accordion.Content>
          </Accordion>
        </Container>
      </div>
    );
  }
}

export default Map;
