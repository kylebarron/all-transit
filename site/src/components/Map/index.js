import * as React from "react";
import DeckGL from "@deck.gl/react";
import { MapController } from "deck.gl";
import InteractiveMap, {
  _MapContext as MapContext,
  NavigationControl,
} from "react-map-gl";
import { getInitialViewState } from "./utils";
// import {
//   interactiveLayerIds
// } from "./MapboxLayer";
import {TransitLayer} from "./TransitLayer"

// You'll get obscure errors without including the Mapbox GL CSS
import "../../css/mapbox-gl.css";

const pickingRadius = 5;

class Map extends React.Component {
  state = {
    showTooltip: true,
    pinnedTooltip: false,
    pickedObject: null,
    pickedLayer: null,
    pointerX: null,
    pointerY: null,
  };

  _renderTooltip() {
    const {
      pinnedTooltip,
      pickedObject,
      pickedLayer,
      pointerX,
      pointerY,
      showTooltip
    } = this.state || {};

    // Sometimes pointerX and pointerY will get set to -1 when the pointer is
    // over the map options div
    if (pointerX === -1 || pointerY === -1) {
      return;
    }

    if (!showTooltip) {
      return;
    }
  }

  // Called on click by deck.gl
  // event.x, event.y are the clicked x and y coordinates in pixels
  // If the deck.gl picking engine finds something, the `object` , `color` and
  // `layer` attributes will be non-null
  // _updatePicked = (event, source) => {
  //   const { x, y, object, layer } = event;

  //   // If object and layer both exist, then deck.gl found an object, and I
  //   // won't query for the Mapbox layers underneath
  //   if (object && layer) {
  //     if (source === "click") {
  //       this._toggleState("pinnedTooltip");
  //     }
  //     return this.setState({
  //       pickedObject: object,
  //       pickedLayer: layer,
  //       pointerX: x,
  //       pointerY: y
  //     });
  //   }

  //   // You can pass those coordinates to React Map GL's queryRenderedFeatures
  //   // to query any desired layers rendered there.
  //   // Make sure you create the ref on InteractiveMap or StaticMap
  //   // Without an options parameter, checks all layers rendered by React Map GL
  //   if (!this.map) return;
  //   const features = this.map.queryRenderedFeatures([
  //     [x - pickingRadius, y - pickingRadius],
  //     [x + pickingRadius, y + pickingRadius]
  //   ]);

  //   // Find the first feature where the layer id is in interactiveLayerIDs
  //   const pickedFeature = features.find(feature =>
  //     interactiveLayerIds.includes(feature.layer.id)
  //   );
  //   if (pickedFeature) {
  //     if (source === "click") {
  //       this._toggleState("pinnedTooltip");
  //     }
  //     return this.setState({
  //       pickedObject: pickedFeature,
  //       pickedLayer: pickedFeature.layer,
  //       pointerX: x,
  //       pointerY: y
  //     });
  //   }

  //   this.setState({
  //     pickedObject: null,
  //     pinnedTooltip: false
  //   });
  //   return;
  // };

  _onClick = event => {
    this._updatePicked(event, "click");
  };

  _onHover = event => {
    // If the tooltip is pinned, don't update picked state
    if (this.state.pinnedTooltip) {
      return;
    }

    this._updatePicked(event, "hover");
  };

  _onChangeOpacity = (e, { name, value }) => {
    this.setState({ [name]: Number(value) });
  };

  _toggleState = name => {
    this.setState(prevState => ({
      [name]: !prevState[name]
    }));
  };

  _toggleMapOptionsExpanded = value => {
    // If currently expanded, close it; else open this section
    this.setState(prevState => ({
      dataOverlaysExpandedSection:
        prevState.dataOverlaysExpandedSection === value ? null : value
    }));
  };

  render() {
    const { location } = this.props;

    return (
      <div ref={ref => (this.deckDiv = ref)}>
        <DeckGL
          ref={ref => {
            this.deck = ref;
          }}
          controller={{
            type: MapController,
            touchRotate: true
          }}
          initialViewState={getInitialViewState(location)}
          // layers={layers}
          ContextProvider={MapContext.Provider}
          // onClick={this._onClick}
          // onHover={this._onHover}
          pickingRadius={pickingRadius}
        >
          <InteractiveMap
            ref={ref => {
              this.map = ref && ref.getMap();
            }}
            mapStyle="https://raw.githubusercontent.com/kylebarron/fiord-color-gl-style/master/style.json"
            mapOptions={{ hash: true }}
          >
            <TransitLayer />
          </InteractiveMap>

          {/* NavigationControl needs to be _outside_ InteractiveMap */}
          <div style={{ position: "absolute", right: 30, top: 110, zIndex: 1 }}>
            <NavigationControl />
          </div>
        </DeckGL>
        {this._renderTooltip()}
      </div>
    );
  }
}

export default Map;
