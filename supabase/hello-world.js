import express from "express";

const http_server = express();
const port = 3000;
http_server.get("/hello-world", (req, res) => {
  res.send("Hello World!");
});

http_server.listen(port, (port) => {
  console.log(`Server is listening ${port}.`);
});
