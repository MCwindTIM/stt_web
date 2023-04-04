const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");
const upload = multer({ dest: "./uploads/" });
const fs = require("fs");
const util = require("util");
const io = require('socket.io');
const http = require("http");

module.exports = class WebServer {
  constructor(main) {
    this.main = main;
    this.app = express();
    this.io = null;
    this.server = http.createServer(this.app);

    //TODO: add socketio to conversation to backend in realtime
    //NOTE: html/css/js
    this.app.get("/", (req, res) => {
      
      res.sendFile(path.resolve(__dirname + "/../html/upload.html"));
    });
    this.app.get("/script.js", (req, res) => {
      res.sendFile(path.resolve(__dirname + "/../html/script.js"));
    });
    this.app.get("/style.css", (req, res) => {
      res.sendFile(path.resolve(__dirname + "/../html/style.css"));
    });
    this.app.get(/sttResult/, (req, res) => {
      res.download(path.resolve(__dirname + "/../" + decodeURI(req.url)))
    });

    this.app.use(cors());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.post("/upload-sttTarget", upload.single("sttTarget"), (req, res) => uploadSingle(req, res, this.main));
    const uploadSingle = (req, res) => {
      console.log(`File ${req.file.originalname} uploaded successfully`);
      fs.rename(req.file.path, req.file.destination + req.file.originalname, () => {
      });
      res.json({ message: "Successfully uploaded files" });
      return this.main.uploadFinish(req.file.originalname, req.headers.socketid);
    }

    this.server.listen(this.main.config.port, () => {
      console.log(`listening at http://localhost:${this.main.config.port} with option → ${util.inspect(this.main.config)}`);
    });
    this.io = io.listen(this.server, {
      pingTimeout: 600000
    })

    this.io.on('connection', function (socket) {
      console.log(`ID: ${socket.id} socket connected`)
      socket.emit('id', { 'id': `${socket.id}`});
    })
  }

  downloadBtn(socketID, data){
    this.io.sockets.connected[socketID].emit('finish', { 'url': data.url, 'ds': data.ds,  gec: data.gec});
  }

  apiError(socketID){
    this.io.sockets.connected[socketID].emit('error', { 'error': 'API Error'});
  }
};
