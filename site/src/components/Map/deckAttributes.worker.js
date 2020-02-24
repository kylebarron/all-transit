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

export async function getTileData({ x, y, z }) {
  const baseurl =
    "https://data.kylebarron.dev/all-transit/tmpjson/schedule/4_16-20";
  const response = await fetch(`${baseurl}/${z}/${x}/${y}.json`);
  let data = []
  if (response.status === 200) {
    data = response.json();
  }

  return data;
}
