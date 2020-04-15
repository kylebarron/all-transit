import * as React from "react";
import DeckGL from "@deck.gl/react";
import { TileLayer, TripsLayer } from "@deck.gl/geo-layers";
import {
  StaticMap,
  _MapContext as MapContext,
  NavigationControl
} from "react-map-gl";
import { getInitialViewState, timeToStr, insideBounds } from "./utils";
import {
  Container,
  Accordion,
  Checkbox,
  Card,
  Grid,
  List,
  Icon,
  Header
} from "semantic-ui-react";
import { TransitLayer, interactiveLayerIds } from "./TransitLayer";
import { OperatorsList } from "./OperatorsList";
import { Link } from "gatsby";
import {
  pickingRadius,
  minHighlightZoom,
  minScheduleAnimationZoom,
  minOperatorInfoZoom,
  maxScheduleAnimationZoom,
  usBounds
} from "./constants";
import DeckWorker from "./deckAttributes.worker.js";

// You'll get obscure errors without including the Mapbox GL CSS
import "../../css/mapbox-gl.css";

const mapStyle = require("./style.json");

class Map extends React.Component {
  state = {
    accordionActiveIndex: -1,
    optionsExpanded: false,
    highlightStopsByRoute: false,
    highlightRoutesByStop: false,
    highlightedStopsOnestopIds: [],
    highlightedRoutesOnestopIds: [],
    showRouteLabels: false,
    enableScheduleAnimation: true,
    operators: [],
    operatorsDisabled: {},
    zoom: getInitialViewState(this.props.location).zoom || 0,
    lon: getInitialViewState(this.props.location).longitude || 0,
    lat: getInitialViewState(this.props.location).latitude || 0,
    includeTram: true,
    includeMetro: true,
    includeRail: true,
    includeBus: true,
    includeFerry: true,
    includeCablecar: true,
    time: 65391
  };

  componentDidMount = () => {
    this.worker = typeof window === "object" && new DeckWorker();

    // if (window.Worker) {
    //   // this.worker.postMessage(['hello world'])
    //   this.worker.helloworld('test')
    //   console.log('message posted to worker')
    // }
  };

  componentWillUnmount = () => {
    if (this._animationFrame) {
      window.cancelAnimationFrame(this._animationFrame);
    }
  };

  _animate = () => {
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
    this._animationFrame = window.requestAnimationFrame(this._animate);
  };

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

  _updateOperators = zoom => {
    // Get operators in view
    if (zoom >= minOperatorInfoZoom) {
      const operatorFeatures = this.map.queryRenderedFeatures({
        layers: ["transit_operators"]
      });
      const operators = operatorFeatures.map(feature => feature.properties);
      this.setState({ operators: operators });
    }
  };

  onViewStateChange = ({ viewState }) => {
    const { zoom, latitude, longitude } = viewState;
    const { accordionActiveIndex } = this.state;
    this.setState({ zoom: zoom, lat: latitude, lon: longitude });

    // If now below minScheduleAnimationZoom and previously above it, stop
    // animating
    if (zoom < minScheduleAnimationZoom && this._animationFrame) {
      window.cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }

    // If now above minScheduleAnimationZoom and previously below it, restart
    // animating
    if (zoom >= minScheduleAnimationZoom && !this._animationFrame) {
      this._animate();
    }

    // Get operators in view
    // Only update if accordion is open to operators list
    if (accordionActiveIndex === 1) this._updateOperators(zoom);

    // Reset highlighted objects when zooming out past minHighlightZoom
    if (zoom < minHighlightZoom) {
      this.setState({
        highlightedStopsOnestopIds: [],
        highlightedRoutesOnestopIds: []
      });
    }
  };

  onReactMapGLLoad = () => {
    const zoom = getInitialViewState(this.props.location).zoom || null;
    const { accordionActiveIndex } = this.state;

    // NOTE: this often errors here because while the _map_ has loaded, the
    // operators layer hasn't yet.
    if (accordionActiveIndex === 1) this._updateOperators(zoom);

    if (zoom >= minScheduleAnimationZoom) {
      this._animate();
    }
  };

  _renderDeckLayers = () => {
    // Should've named this better, but this is the current dir of json files
    const baseurl =
      "https://data.kylebarron.dev/all-transit/tmpjson/schedule/4_16-20";

    // 1206 - 1538 - 12;
    return [
      new TripsLayer({
        data: () =>
          fetch(
            "https://data.kylebarron.dev/all-transit/tmpjson/schedule/4_16-20/12/1206/1538.json"
          ).then(response => response.json()).then(data => {
            console.log(data)
            return data;
          }),
        getPath: d => d.map(p => p.slice(0, 2)),
        getTimestamps: d => d.map(p => p.slice(2)),
        getColor: [253, 128, 93],
        getWidth: 3,
        widthUnits: "pixels",
        opacity: 0.7,
        rounded: true,
        trailLength: 50,
        currentTime: this.state.time,
        shadowEnabled: false
      })

      // new TileLayer({
      //   minZoom: minScheduleAnimationZoom,
      //   maxZoom: maxScheduleAnimationZoom,
      //   visible: this.state.enableScheduleAnimation,
      //   getTileData: data => this.worker.getTileData(data),

      //   // this prop is passed on to the TripsLayer that's rendered as a
      //   // SubLayer. Otherwise, the TripsLayer can't access the state being
      //   // updated.
      //   currentTime: this.state.time,

      //   renderSubLayers: props => {
      //     return new TripsLayer(props, {
      //       data: props.data,
      //       // getPath: d => d.map(p => p.slice(0, 2)),
      //       // getTimestamps: d => d.map(p => p.slice(2)),
      //       getColor: [253, 128, 93],
      //       getWidth: 3,
      //       widthUnits: "pixels",
      //       opacity: 0.7,
      //       rounded: true,
      //       trailLength: 50,
      //       currentTime: props.currentTime,
      //       shadowEnabled: false,
      //       // If you get binary data working in the format Deck.gl expects,then
      //       // uncomment this:
      //       // _pathType: "open" // this instructs the layer to skip normalization and use the binary as-is
      //     });
      //   }
      // })
    ];
  };

  _handleAccordionTitleClick = (e, itemProps) => {
    const { index } = itemProps;
    const { accordionActiveIndex } = this.state;
    const newIndex = accordionActiveIndex === index ? -1 : index;

    if (newIndex == 1) {
      const { zoom } = this.state;
      this._updateOperators(zoom);
    }

    this.setState({ accordionActiveIndex: newIndex });
  };

  render() {
    const { location } = this.props;
    const {
      highlightedStopsOnestopIds,
      highlightedRoutesOnestopIds,
      zoom,
      time,
      lon,
      lat,
      accordionActiveIndex
    } = this.state;

    const optionsPanels = [
      {
        key: "scheduleAnimation",
        title: "Schedule Animation",
        content: {
          content: (
            <div style={{ paddingLeft: 10, paddingRight: 10 }}>
              {insideBounds(lon, lat, usBounds) ? (
                zoom >= minScheduleAnimationZoom ? (
                  <div>
                    <Checkbox
                      label="Enable Animation"
                      onChange={() =>
                        this._toggleState("enableScheduleAnimation")
                      }
                      checked={this.state.enableScheduleAnimation}
                    />
                    {this.state.enableScheduleAnimation && (
                      <div>
                        <p>Time: Friday {timeToStr(time)}</p>
                        <p>
                          Animation scale is 60x. One second in the animation
                          represents one minute in real life.
                        </p>
                        {zoom < maxScheduleAnimationZoom && (
                          <p>
                            Animation uses simplified data at this zoom level.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p>Zoom in to a city to see schedule animation</p>
                )
              ) : (
                <p>Schedule animation only currently available for the U.S.</p>
              )}
            </div>
          )
        }
      },
      {
        key: "operators",
        title: "Operators",
        content: {
          content: (
            <div style={{ paddingLeft: 10, paddingRight: 10 }}>
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
            <div style={{ paddingLeft: 10, paddingRight: 10 }}>
              <List>
                {["Tram", "Metro", "Rail", "Bus", "Ferry", "Cablecar"].map(
                  mode => (
                    <List.Item key={mode}>
                      <Checkbox
                        label={`${mode}`}
                        onChange={() => this._toggleState(`include${mode}`)}
                        checked={this.state[`include${mode}`]}
                      />
                    </List.Item>
                  )
                )}
              </List>
            </div>
          )
        }
      },
      {
        key: "otherOptions",
        title: "Other Options",
        content: {
          content: (
            <div
              style={{
                paddingLeft: 10,
                paddingRight: 10,
                paddingBottom: 10
              }}
            >
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
          // Controls the resolution of drawing buffer used for rendering
          // false: CSS pixels resolution (equal to the canvas size) is used for rendering
          useDevicePixels={false}
        >
          <StaticMap
            ref={ref => {
              this.map = ref && ref.getMap();
            }}
            mapStyle={mapStyle}
            mapOptions={{ hash: true }}
            onLoad={this.onReactMapGLLoad}
            preventStyleDiffing
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
                    <Grid.Column width={8}>
                      <Card.Header textAlign="center">All Transit</Card.Header>
                    </Grid.Column>
                  </Grid.Row>
                </Grid>
              </Accordion.Title>
              <Accordion.Content active={this.state.optionsExpanded}>
                <Card.Meta textAlign="left">
                  <Link to="/about/">
                    <Header as="h5">
                      <Header.Content>About</Header.Content>
                    </Header>
                  </Link>
                </Card.Meta>
                <Card.Description>
                  <Accordion
                    activeIndex={accordionActiveIndex}
                    fluid
                    styled
                    panels={optionsPanels}
                    onTitleClick={this._handleAccordionTitleClick}
                  />
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
