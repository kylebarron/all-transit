import { navigate } from "gatsby";

// Default initial viewport settings
// These are overwritten by the URL hash if it exists
const initialViewState = {
  bearing: 0,
  latitude: 30,
  longitude: -40,
  pitch: 0,
  zoom: 1.5
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

export function timeToStr(time) {
  // Milliseconds in day
  const date = new Date(time * 1000);

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleTimeString
  // https://stackoverflow.com/questions/4898574/converting-24-hour-time-to-12-hour-time-w-am-pm-using-javascript
  const dateOptions = {
    hour: "numeric",
    minute: "numeric",
    timeZone: "UTC",
    hour12: true
  };
  const timeString = date.toLocaleTimeString("en-US", dateOptions);
  return timeString;
}
