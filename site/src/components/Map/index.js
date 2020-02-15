import * as React from "react";
import DeckGL from "@deck.gl/react";
import { TileLayer, TripsLayer } from "@deck.gl/geo-layers";
import {
  StaticMap,
  _MapContext as MapContext,
  NavigationControl
} from "react-map-gl";
import { getInitialViewState, timeToStr } from "./utils";
import {
  Container,
  Accordion,
  Checkbox,
  Card,
  Grid,
  List,
  Icon
} from "semantic-ui-react";
import { TransitLayer, interactiveLayerIds } from "./TransitLayer";
import { OperatorsList } from "./OperatorsList";
import { Link } from "gatsby";

// You'll get obscure errors without including the Mapbox GL CSS
import "../../css/mapbox-gl.css";

const pickingRadius = 10;
const minHighlightZoom = 11;
const minScheduleAnimationZoom = 11;
const minOperatorInfoZoom = 9;

class Map extends React.Component {
  state = {
    optionsExpanded: false,
    highlightStopsByRoute: false,
    highlightRoutesByStop: false,
    highlightedStopsOnestopIds: [],
    highlightedRoutesOnestopIds: [],
    showRouteLabels: false,
    enableScheduleAnimation: true,
    operators: [],
    operatorsDisabled: {},
    zoom: getInitialViewState(this.props.location).zoom || null,
    includeTram: true,
    includeMetro: true,
    includeRail: true,
    includeBus: true,
    includeFerry: true,
    includeCablecar: true,
    time: 65391
  };

  componentDidMount() {
    this._animate();
  }

  componentWillUnmount() {
    if (this._animationFrame) {
      window.cancelAnimationFrame(this._animationFrame);
    }
  }

  _animate() {
    const {
      // unit corresponds to the timestamp in source data
      // My trip timestamps are in seconds between 4pm and 8pm => 14400 seconds
      loopLength = 14400,
      // unit time per second
      // So essentially 30 would be 30x; every real second corresponds to 30
      // trip-layer seconds.
      // I have this set to 60 because I think 1 second to 1 minute is most
      // intuitive.
      animationSpeed = 60
    } = this.props;

    // The start timeStamp in the data
    // This is added to all calculated timestamps
    const secondsStart = 16 * 60 * 60;

    // Date.now() is in milliseconds; divide by 1000 to get seconds
    const timestamp = Date.now() / 1000;

    // How many loop segments are there? I.e. with a loopLength of 1000 and an
    // animationSpeed of 10, then there are 100 individual loop segments to
    // render
    const loopSegments = loopLength / animationSpeed;

    // `timestamp % loopSegments`
    // Take the remainder of dividing timestamp by loopSegments
    const time =
      ((timestamp % loopSegments) / loopSegments) * loopLength + secondsStart;
    this.setState({ time: time });
    this._animationFrame = window.requestAnimationFrame(
      this._animate.bind(this)
    );
  }

  // Called on click by deck.gl
  // event.x, event.y are the clicked x and y coordinates in pixels
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

    // Get operators in view
    if (zoom >= minOperatorInfoZoom) {
    const operatorFeatures = this.map.queryRenderedFeatures({
      layers: ["transit_operators"]
    });
    const operators = operatorFeatures.map(feature => feature.properties);
    newState["operators"] = operators;
    }

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
        minZoom: minScheduleAnimationZoom,
        maxZoom: 13,
        visible: this.state.enableScheduleAnimation,
        getTileData: ({ x, y, z }) =>
          fetch(`${baseurl}/${z}/${x}/${y}.json`).then(response =>
            response.json()
          ),

        // this prop is passed on to the TripsLayer that's rendered as a
        // SubLayer. Otherwise, the TripsLayer can't access the state being
        // updated.
        currentTime: this.state.time,

        renderSubLayers: props => {
          return new TripsLayer(props, {
            data: props.data,
            getPath: d => d.map(p => p.slice(0, 2)),
            getTimestamps: d => d.map(p => p.slice(2)),
            getColor: [253, 128, 93],
            opacity: 0.7,
            widthMinPixels: 3,
            rounded: true,
            trailLength: 50,
            currentTime: props.currentTime,
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
      zoom,
      time
    } = this.state;

    const optionsPanels = [
      {
        key: "scheduleAnimation",
        title: "Schedule Animation",
        content: {
          content:
            zoom >= minScheduleAnimationZoom ? (
            <div>
              <Checkbox
                label="Enable Animation"
                onChange={() => this._toggleState("enableScheduleAnimation")}
                checked={this.state.enableScheduleAnimation}
              />
            <p>Time: Friday {timeToStr(time)}</p>
            </div>
            ) : (
              <p>Zoom in to see schedule animation</p>
          )
        }
      },
      {
        key: "operators",
        title: "Operators",
        content: {
          content: (
            <div>
              {zoom >= minOperatorInfoZoom ? (
              <OperatorsList
                operators={this.state.operators}
                operatorsDisabled={this.state.operatorsDisabled}
                onChange={operator_onestop_id => {
                  this.setState(prevState => {
                    const { operatorsDisabled } = prevState;
                    const thisOperatorDisabled =
                      operatorsDisabled[operator_onestop_id] || false;
                    operatorsDisabled[
                      operator_onestop_id
                    ] = !thisOperatorDisabled;

                    return { operatorsDisabled: operatorsDisabled };
                  });
                }}
              />
              ) : (
                <p>Zoom in to see local operators</p>
              )}
            </div>
          )
        }
      },
      {
        key: "transitMode",
        title: "Transit Modes",
        content: {
          content: (
            <List>
                {["Tram", "Metro", "Rail", "Bus", "Ferry", "Cablecar"].map(
                  mode => (
                    <List.Item>
                      <Checkbox
                        label={`${mode}`}
                        onChange={() => this._toggleState(`include${mode}`)}
                        checked={this.state[`include${mode}`]}
                      />
                    </List.Item>
                  )
                )}
            </List>
          )
        }
      },
      {
        key: "otherOptions",
        title: "Other Options",
        content: {
          content: (
            <div>
              {zoom < minHighlightZoom ? (
                <Checkbox
                  disabled
                  label="Zoom in to highlight routes on hover"
                  checked={this.state.highlightRoutesByStop}
                />
              ) : (
                <div>
                  <Checkbox
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
              <Checkbox
                label="Show route labels"
                onChange={() => this._toggleState("showRouteLabels")}
                checked={this.state.showRouteLabels}
              />
            </div>
          )
        }
      }
    ];

    return (
      <div ref={ref => (this.deckDiv = ref)}>
        <DeckGL
          ref={ref => {
            this.deck = ref;
          }}
          controller
          initialViewState={getInitialViewState(location)}
          ContextProvider={MapContext.Provider}
          onClick={this._updatePicked}
          onHover={this._updatePicked}
          layers={this._renderDeckLayers()}
          pickingRadius={pickingRadius}
          onViewStateChange={this.onViewStateChange}
        >
          <StaticMap
            ref={ref => {
              this.map = ref && ref.getMap();
            }}
            mapStyle="https://raw.githubusercontent.com/kylebarron/fiord-color-gl-style/master/style.json"
            mapOptions={{ hash: true }}
          >
            <TransitLayer
              highlightedRouteIds={highlightedRoutesOnestopIds}
              highlightedStopIds={highlightedStopsOnestopIds}
              operatorsDisabled={this.state.operatorsDisabled}
              showRouteLabels={this.state.showRouteLabels}
              transitModes={{
                tram: this.state.includeTram,
                metro: this.state.includeMetro,
                rail: this.state.includeRail,
                bus: this.state.includeBus,
                ferry: this.state.includeFerry,
                cablecar: this.state.includeCablecar
              }}
            />
          </StaticMap>

          {/* NavigationControl needs to be _outside_ InteractiveMap */}
          <div style={{ position: "absolute", right: 10, top: 10, zIndex: 1 }}>
            <NavigationControl />
          </div>
        </DeckGL>

        <Container
          style={{
            position: "absolute",
            width: 280,
            maxWidth: 400,
            left: 10,
            top: 10,
            maxHeight: "70%",
            zIndex: 1,
            backgroundColor: "#fff",
            pointerEvents: "auto",
            overflowY: "auto"
          }}
        >
          <Accordion as={Card}>
            <Card.Content>
              <Accordion.Title
                as={Card.Header}
                active={this.state.optionsExpanded}
                onClick={() => this._toggleState("optionsExpanded")}
              >
                <Grid columns={2}>
                  <Grid.Row>
                    <Grid.Column width={1}>
                      <Icon name="dropdown" />
                    </Grid.Column>
                    <Grid.Column width={20}>
                      <Card.Header textAlign="center">All Transit</Card.Header>
                    </Grid.Column>
                  </Grid.Row>
                </Grid>
              </Accordion.Title>
              <Accordion.Content active={this.state.optionsExpanded}>
                <Card.Meta textAlign="left">
                  <Link as={Link} to="/about/">
                    About
                  </Link>
                </Card.Meta>
                <Card.Description>
                  <Accordion fluid styled panels={optionsPanels} />
                </Card.Description>
              </Accordion.Content>
            </Card.Content>
          </Accordion>
        </Container>
      </div>
    );
  }
}

export default Map;
