'use strict';

const BodyParser = require('body-parser');
const Compression = require('compression');
const Express = require('express');

const app = Express();

function random(size) {
  return require('crypto').randomBytes(size).toString('hex');
}

function availableVersions() {
  const result = require('child_process').execSync('docker images kishikawakatsumi/swift --format "{{.Tag}}"').toString();
  return result.split('\n').filter(version => version.length > 0).sort((a, b) => {
    const compareVersions = require('compare-versions');
    if (a.includes('_')) {
      a = a.split('_')[1]
    }
    if (b.includes('_')) {
      b = b.split('_')[1]
    }
    if (a.includes('.') && b.includes('.')) {
      return compareVersions(a, b) * -1;
    }
    if (a.includes('.')) {
      return 1;
    }
    if (b.includes('.')) {
      return -1;
    }
    return a < b;
  });
}

function latestVersion() {
  const versions = availableVersions();
  return versions[0];
}

function stableVersion() {
  return '4.2.1';
}

app.use(Compression());
app.use(BodyParser.urlencoded({ extended: false }));
app.use(BodyParser.json());
app.use(Express.static(__dirname + '/static'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/', function(req, res) {
  res.render('index', {title: 'Swift Playground', versions: availableVersions()});
});

app.get('/versions', function(req, res) {
  res.send({ versions: availableVersions() });
});

app.post('/run', function(req, res) {
  const path = require('path');
  const Sandbox = require('./sandbox');

  const root_dir = __dirname;
  const temp_dir = path.join('temp', random(10));
  const filename = 'main.swift';

  let toolchain_version = req.body.toolchain_version || stableVersion();
  if (toolchain_version == 'latest') {
    toolchain_version = latestVersion();
  } else if (toolchain_version == 'stable') {
    toolchain_version = stableVersion();
  }
  const defaultCommand = 'swift';
  const command = req.body.command || defaultCommand;
  const options = req.body.options || '';
  const code = req.body.code;
  let timeout = req.body.timeout || 30;

  if (!availableVersions().includes(toolchain_version.toString())) {
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
    const error = 'There is no code to run.';
    res.send({ output: '', errors: error, version: '' });
    return;
  }

  timeout = parseInt(timeout);
  const maxTimeout = 600;
  const defaultTimeout = 30;
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

var server = require('http').createServer(app);
server.listen(8080, function() {
  console.log('Playground app listening on port ' + server.address().port);
});
