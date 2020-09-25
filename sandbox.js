"use strict";

const util = require("util");

const exec = util.promisify(require("child_process").exec);
const execFile = util.promisify(require("child_process").execFile);

class Sandbox {
  constructor(
    root_dir,
    temp_dir,
    filename,
    toolchain_version,
    command,
    options,
    code,
    timeout
  ) {
    this.root_dir = root_dir;
    this.temp_dir = temp_dir;
    this.filename = filename;
    this.toolchain_version = toolchain_version;
    this.command = command;
    this.options = options;
    this.code = code;
    let to = parseInt(timeout);
    if (isNaN(to)) {
      to = 60;
    } else if (to > 600) {
      to = 600;
    }
    this.timeout = to;
  }

  async run(success) {
    const sandbox = this;
    await this.prepare(function () {
      sandbox.execute(success);
    });
  }

  async prepare(success) {
    const fs = require("fs").promises;
    const path = require("path");
    const sandbox = this;

    const work_dir = path.join(this.root_dir, this.temp_dir);
    await execFile("mkdir", [work_dir]);
    await execFile("cp", [path.join(this.root_dir, "script.sh"), work_dir]);
    await execFile("chmod", ["777", work_dir]);

    try {
      await fs.writeFile(path.join(work_dir, sandbox.filename), sandbox.code);
      success();
    } catch (error) {
      console.log(error);
    }
  }

  execute(success) {
    const exec = require("child_process").exec;
    const execSync = require("child_process").spawnSync;
    const fs = require("fs");
    const path = require("path");

    const sandbox = this;
    let counter = 0;

    exec(
      [
        "sh",
        path.join(this.root_dir, "run.sh"),
        this.timeout + "s",
        "-v",
        path.join(this.root_dir, this.temp_dir) + ":/usercode",
        "kishikawakatsumi/swift:" + this.toolchain_version,
        "sh",
        "/usercode/script.sh",
        [this.command, this.options].join(" "),
      ].join(" ")
    );

    const work_dir = path.join(sandbox.root_dir, sandbox.temp_dir);
    const intid = setInterval(function () {
      counter = counter + 1;
      fs.readFile(path.join(work_dir, "completed"), "utf8", function (
        error,
        data
      ) {
        if (error && counter < sandbox.timeout) {
          return;
        } else if (counter < sandbox.timeout) {
          fs.readFile(path.join(work_dir, "errors"), "utf8", function (
            error,
            errorlog
          ) {
            if (!errorlog) {
              errorlog = "";
            }
            const version = fs.readFileSync(
              path.join(work_dir, "version"),
              "utf8"
            );
            execSync("rm", ["-rf", sandbox.temp_dir]);
            success(data, errorlog, version);
          });
        } else {
          fs.readFile(path.join(work_dir, "errors"), "utf8", function (
            error,
            errorlog
          ) {
            if (!errorlog) {
              errorlog = "Timed out.";
            }
            const version = fs.readFileSync(
              path.join(work_dir, "version"),
              "utf8"
            );
            execSync("rm", ["-rf", sandbox.temp_dir]);
            success(data, errorlog, version);
          });
        }
        clearInterval(intid);
      });
    }, 1000);
  }
}

module.exports = Sandbox;
