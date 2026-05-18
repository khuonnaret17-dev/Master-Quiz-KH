import https from "https";

https.get("https://ibb.co/ymLyB5Sc", (res) => {
  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    const match = data.match(/<meta property="og:image" content="(.*?)"/);
    if (match) {
      console.log(match[1]);
    } else {
      console.log("No match found");
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
