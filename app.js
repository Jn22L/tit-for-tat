const express = require("express");
const cors = require("cors");
const mySocket = require("./socket");
const app = express();
const port = 8080;

app.use(cors());

const rootDir = __dirname.replace("services", ""); // root 폴더위치 ( /services -> / )
app.use(express.json()); // json body 받기설정

app.use(express.static(__dirname + "/public")); // 라우터 밑에 위치해야 좀더 빠르다곤 하는데 ? 모르겠음.

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Example app listening on port ${port}`);
});

mySocket(server); // 서버를 넘겨줌!!!!
