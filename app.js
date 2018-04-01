'use strict';

const BodyParser = require('body-parser');
const Compression = require('compression')
const Express = require("express");

const app = Express();

function random(size) {
  return require("crypto").randomBytes(size).toString('hex');
}

app.use(Compression())
app.use(Express.static(__dirname + '/static'));
app.use(BodyParser.urlencoded({ extended: false }));
app.use(BodyParser.json());

app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/', function(req, res) {
  res.sendfile("./index.html");
});

app.post('/run', function(req, res) {
  const path = require('path');
  const Sandbox = require('./sandbox');

  const root_dir = __dirname;
  const temp_dir = path.join('temp', random(10));
  const filename = 'main.swift';

  const toolchain_version = req.body.toolchain_version || '4.1';
  const command = req.body.command || 'swift';
  const options = req.body.options || '';
  const code = req.body.code;
  const timeout = req.body.timeout || 60;

  const sandbox = new Sandbox(root_dir, temp_dir, filename, toolchain_version, command, options, code, timeout);
  sandbox.run(function(data, error) {
    res.send({ output: data, errors: error })
  });
});

var server = require("http").createServer(app);
server.listen(8080, function() {
  console.log("Playground app listening on port " + server.address().port);
});
