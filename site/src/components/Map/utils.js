import { navigate } from "gatsby";

// Default initial viewport settings
// These are overwritten by the URL hash if it exists
const initialViewState = {
  bearing: 0,
  latitude: 38.85,
  longitude: -98.38,
  pitch: 0,
  zoom: 4
};

// Parse hash from url
// By default, if no hash or hash is invalid, returns initialViewState
export function getInitialViewState(location) {
  const hash = location.hash;
  if (!hash || hash.charAt(0) !== "#") {
    return initialViewState;
  }
  // Split the hash into an array of numbers
  const hashArray = hash
    .substring(1)
    .split("/")
    .map(Number);

  // If hash is not all Numbers, navigate to current page without hash
  // Note that it's not enough to just return initialViewState because the
  // Mapbox GL JS `hash` option is enabled. If you just return
  // initialViewState, MapboxGL JS will get confused.
  if (hashArray.some(Number.isNaN)) {
    navigate(location.pathname);
    return;
  }

  // Destructure the hash into an array with defaults
  // Order of arguments:
  // https://docs.mapbox.com/mapbox-gl-js/api/
  const [
    zoom = initialViewState.zoom,
    latitude = initialViewState.latitude,
    longitude = initialViewState.longitude,
    bearing = initialViewState.bearing,
    pitch = initialViewState.pitch
  ] = hashArray;
  return {
    bearing: bearing,
    latitude: latitude,
    longitude: longitude,
    pitch: pitch,
    zoom: zoom
  };
}
