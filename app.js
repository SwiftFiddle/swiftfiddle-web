"use strict";

const axios = require("axios").default;
const base32Encode = require("base32-encode");
const compression = require("compression");
const express = require("express");
const path = require("path");
const util = require("util");
const uuid = require("uuid");

const admin = require("firebase-admin");
const serviceAccount = require(path.join(__dirname, "key.json"));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const app = express();

app.use(compression());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "/static")));
app.use(
  "/css/fontawesome",
  express.static(
    path.join(__dirname, "/node_modules/@fortawesome/fontawesome-free/")
  )
);

app.set("views", path.join(__dirname, "/views"));
app.set("view engine", "ejs");

app.all("*", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.get("/", async (req, res) => {
  const versions = await availableVersions();
  res.render("index", {
    title: "Swift Playground",
    versions: versions,
    default_version: stableVersion(),
    code: `${defaultSampleCode()}\n`,
  });
});

app.get(/^\/([a-f0-9]{32})$/i, async (req, res) => {
  const versions = await availableVersions();
  const gistId = req.params[0];
  const url = `https://api.github.com/gists/${gistId}`;
  const code = await (async () => {
    try {
      const response = await axios.get(url, {
        headers: {
          accept: "application/json",
        },
      });
      if (response.data) {
        const files = response.data.files;
        return files[Object.keys(files)[0]].content;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  })();
  res.render("index", {
    title: "Swift Playground",
    versions: versions,
    default_version: stableVersion(),
    code: `${code || defaultSampleCode()}\n`,
  });
});

app.get(/^\/([A-Z2-7]{26})$/i, async (req, res) => {
  const versions = await availableVersions();
  const id = req.params[0];

  const ref = db.collection("code_snippets").doc(id);
  const doc = await ref.get();
  if (!doc.exists) {
    handlePageNotFound(req, res);
    return;
  }

  const shared_link = doc.data().shared_link;
  const content = shared_link.content;
  res.render("index", {
    title: "Swift Playground",
    versions: versions,
    default_version: shared_link.swift_version,
    code: `${content || `${defaultSampleCode()}\n`}`,
  });
});

app.get("/versions", async (req, res) => {
  res.send({ versions: await availableVersions() });
});

app.post("/run", async (req, res) => {
  const Sandbox = require("./sandbox");

  const root_dir = __dirname;
  const temp_dir = path.join("temp", random(10));
  const filename = "main.swift";

  let toolchain_version = req.body.toolchain_version || stableVersion();
  if (toolchain_version == "latest") {
    toolchain_version = await latestVersion();
  } else if (toolchain_version == "stable") {
    toolchain_version = stableVersion();
  }
  const command = req.body.command || "swift";
  const options = req.body.options || "";
  const code = req.body.code;
  let timeout = req.body.timeout || 30;

  if (!(await availableVersions()).includes(toolchain_version.toString())) {
    const error = `Swift '${toolchain_version}' toolchain is not supported.`;
    res.send({ output: "", errors: error, version: "" });
    return;
  }

  if (!["swift", "swiftc"].includes(command)) {
    const error = `Command '${command}' is not supported.`;
    res.send({ output: "", errors: error, version: "" });
    return;
  }

  const commandInjectionOperators = [";", "&", "&&", "||", "`", "(", ")", "#"];
  if (
    commandInjectionOperators.some((operator) => options.includes(operator))
  ) {
    const error = "Invalid control characters found";
    res.send({ output: "", errors: error, version: "" });
    return;
  }

  if (!code) {
    const error = "There is no code to run.";
    res.send({ output: "", errors: error, version: "" });
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

  const sandbox = new Sandbox(
    root_dir,
    temp_dir,
    filename,
    toolchain_version,
    command,
    options,
    code,
    timeout
  );
  sandbox.run(function (data, error, version) {
    res.send({ output: data, errors: error, version: version });
  });
});

app.post("/shared_link", async (req, res) => {
  const id = base32Encode(
    Buffer.from(uuid.v4().replace(/-/g, ""), "hex"),
    "RFC4648",
    {
      padding: false,
    }
  ).toLowerCase();
  const shared_link = {
    id: id,
    type: "plain_text",
    shared_link: {
      swift_version: req.body.toolchain_version,
      content: req.body.code,
      url: `https://swift-playground.kishikawakatsumi.com/${id}`,
    },
  };

  const doc = db.collection("code_snippets").doc(id);
  await doc.set(shared_link);

  res.send(shared_link);
});

app.use(function (req, res) {
  handlePageNotFound(req, res);
});

app.listen(8080);

function random(size) {
  return require("crypto").randomBytes(size).toString("hex");
}

async function availableVersions() {
  return ["5.3"];
  const exec = util.promisify(require("child_process").exec);
  const result = await exec(
    'docker images kishikawakatsumi/swift --format "{{.Tag}}"'
  );
  return result.stdout
    .split("\n")
    .filter((version) => version.length > 0)
    .sort((a, b) => {
      const compareVersions = require("compare-versions");
      if (a.includes("_")) {
        a = a.split("_")[1];
      }
      if (b.includes("_")) {
        b = b.split("_")[1];
      }
      if (a.includes(".") && b.includes(".")) {
        return compareVersions(a, b) * -1;
      }
      if (a.includes(".")) {
        return 1;
      }
      if (b.includes(".")) {
        return -1;
      }
      return a < b;
    });
}

async function latestVersion() {
  const versions = await availableVersions();
  return versions[0];
}

function stableVersion() {
  return "5.3";
}

function defaultSampleCode() {
  return `import Foundation

func greet(person: String) -> String {
    let greeting = "Hello, " + person + "!"
    return greeting
}

// Prints "Hello, Anna!"
print(greet(person: "Anna"))

// Prints "Hello, Brian!"
print(greet(person: "Brian"))`;
}

function handlePageNotFound(req, res) {
  res.status(404);

  if (req.accepts("html")) {
    res.set("Content-Type", "text/html");
    res.send(
      Buffer.from(
        `<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" integrity="sha384-JcKb8q3iqJ61gNV9KGb8thSsNjpSL0n8PARn9HuZOnIxN0hoP+VmmDGMN5t9UJ0Z" crossorigin="anonymous">
<style type="text/css">body { background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAxMC8yOS8xMiKqq3kAAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzVxteM2AAABHklEQVRIib2Vyw6EIAxFW5idr///Qx9sfG3pLEyJ3tAwi5EmBqRo7vHawiEEERHS6x7MTMxMVv6+z3tPMUYSkfTM/R0fEaG2bbMv+Gc4nZzn+dN4HAcREa3r+hi3bcuu68jLskhVIlW073tWaYlQ9+F9IpqmSfq+fwskhdO/AwmUTJXrOuaRQNeRkOd5lq7rXmS5InmERKoER/QMvUAPlZDHcZRhGN4CSeGY+aHMqgcks5RrHv/eeh455x5KrMq2yHQdibDO6ncG/KZWL7M8xDyS1/MIO0NJqdULLS81X6/X6aR0nqBSJcPeZnlZrzN477NKURn2Nus8sjzmEII0TfMiyxUuxphVWjpJkbx0btUnshRihVv70Bv8ItXq6Asoi/ZiCbU6YgAAAABJRU5ErkJggg==);}
  .error-template {padding: 40px 15px;text-align: center;}
  .error-actions {margin-top:15px;margin-bottom:15px;}
  .error-actions .btn { margin-right:10px; }
</style>
<script src="https://code.jquery.com/jquery-3.5.1.min.js" integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=" crossorigin="anonymous"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js" integrity="sha384-B4gt1jrGC7Jh4AgTPSdUtOBvfO8shuf57BaghqFfPlYxofvL8/KUEfYiJOMMV+rV" crossorigin="anonymous"></script>
<div class="container">
  <div class="row">
    <div class="col-md-12">
      <div class="error-template">
        <h1>Oops!</h1>
        <h2>404 Not Found</h2>
        <div class="error-details">
          Sorry, an error has occured, Requested page not found!
        </div>
        <div class="error-actions"><a href="/" class="btn btn-lg btn-link">Home</a></div>
      </div>
    </div>
  </div>
</div>`
      )
    );
    return;
  }

  if (req.accepts("json")) {
    res.send({ error: "Not found" });
    return;
  }

  res.type("txt").send("Not found");
}
