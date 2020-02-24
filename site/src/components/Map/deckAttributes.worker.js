export const onmessage = function(e) {
  console.log("Message received from main script");
  var workerResult = "Result: " + e.data[0] * e.data[1];
  console.log("Posting message back to main script");
  postMessage(workerResult);
};

export function helloworld(test) {
  console.log('hello world')
  console.log(test)

}

export function getTileData({ x, y, z }) {
  const baseurl =
    "https://data.kylebarron.dev/all-transit/tmpjson/schedule/4_16-20";
  return fetch(`${baseurl}/${z}/${x}/${y}.json`)
    .then(response => {
      let data;
      if (response.status === 200) {
        data = response.json();
      }
      return data;
    })
    .then(data => createBinaryAttributes(data));

  // console.log(data)
  // return createBinaryAttributes(data);
}

const createBinaryAttributes = (data) => {
  console.log('here')
  if (!data) {
    return {
      length: 0,
      startIndices: new Uint16Array(0),
      positions: new Float64Array(0),
      timestamps: new Float64Array(0)
    };
  }
  
  console.log("here2");

  // data is an array of Linestring coordinates, which are themselves arrays of
  // points
  const positions = [];
  const timestamps = [];
  const startIndices = [0];
  let coordIndex = 0

  for (const line of data) {
    for (const coord of line) {
      positions.push(...coord.slice(0, 2))
      timestamps.push(...coord.slice(2));
      coordIndex += 1;
    }
    startIndices.push(coordIndex);
  }

  console.log(positions);
  console.log(timestamps);
  console.log(startIndices);

  const dataObj = {
    length: startIndices.slice(-1)[0],
    startIndices: new Uint16Array(startIndices),
    attributes: {
      getPath: {
        value: new Float64Array(positions),
        size: 2,
      },
      getTimestamps: {
        value: new Float64Array(timestamps),
        size: 1,
      }
    }
  }
  console.log('dataObj')
  console.log(dataObj);
  return dataObj;
}
