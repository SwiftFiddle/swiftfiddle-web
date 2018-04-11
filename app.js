'use strict';

const BodyParser = require('body-parser');
const Compression = require('compression');
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
  let timeout = req.body.timeout || 30;

  const availableVersions = ['2018-04-04-a',
                             '2018-04-03-a',
                             '2018-04-02-a',
                             '2018-04-01-a',
                             '2018-03-31-a',
                             '4.1',
                             '4.0.3',
                             '3.1.1',
                             '3.0.2'];
  if (!availableVersions.includes(toolchain_version.toString())) {
    const error = `Swift '${toolchain_version}' toolchain is not supported.`;
    res.send({ output: '', errors: error, version: '' });
    return;
  }
  if (!['swift', 'swiftc'].includes(command)) {
    const error = `Command '${command}' is not supported.`;
    res.send({ output: '', errors: error, version: '' });
    return;
  }

  const commandInjectionOperators = [';', '&', '&&', '||', '`', '(', ')', '#'];
  if (commandInjectionOperators.some(operator => options.includes(operator))) {
    const error = 'Invalid control characters found';
    res.send({ output: '', errors: error, version: '' });
    return;
  }
  if (!code) {
    const error = `No code to run.`;
    res.send({ output: '', errors: error, version: '' });
    return;
  }
  timeout = parseInt(timeout);
  const maxTimeout = 600;
  if (isNaN(timeout)) {
    timeout = defaultTimeout;
  } else if (timeout > maxTimeout) {
    timeout = maxTimeout;
  }

  const sandbox = new Sandbox(root_dir, temp_dir, filename, toolchain_version, command, options, code, timeout);
  sandbox.run(function(data, error, version) {
    res.send({ output: data, errors: error, version: version });
  });
});

var server = require("http").createServer(app);
server.listen(8080, function() {
  console.log("Playground app listening on port " + server.address().port);
});
