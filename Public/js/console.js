"use strict";

const ESC = "\u001B[";

class Terminal {
  static moveCursorTo(x, y) {
    if (typeof x !== "number") {
      throw new TypeError("The `x` argument is required");
    }
    if (typeof y !== "number") {
      terminal.write(ESC + (x + 1) + "G");
    }
    terminal.write(ESC + (y + 1) + ";" + (x + 1) + "H");
  }

  static cursorUp(count = 1) {
    terminal.write(ESC + count + "A");
  }

  static cursorDown(count = 1) {
    terminal.write(ESC + count + "B");
  }

  static cursorForward(count = 1) {
    terminal.write(ESC + count + "C");
  }

  static cursorBackward(count = 1) {
    terminal.write(ESC + count + "D");
  }

  static cursorSavePosition() {
    terminal.write(ESC + "s");
  }

  static cursorRestorePosition() {
    terminal.write(ESC + "u");
  }

  static cursorHide() {
    terminal.write(ESC + "?25l");
  }

  static cursorShow() {
    terminal.write(ESC + "?25h");
  }

  static eraseLine() {
    terminal.write("\x1b[2K\r");
  }

  static eraseLines(count) {
    for (let i = 0; i < count; i++) {
      terminal.write(`\x1b[1F`);
      terminal.write("\x1b[2K\r");
    }
  }

  static switchNormalBuffer() {
    terminal.write("\x9B?47l");
  }

  static switchAlternateBuffer() {
    terminal.write("\x9B?47h");
  }

  static showSpinner(message, progress) {
    const interval = 200;
    const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let spins = 0;
    function updateSpinner(message) {
      const progressText = `${SPINNER[spins % SPINNER.length]} ${message}`;
      const dotCount = Math.floor((spins * 2) / 4) % 4;
      const animationText = `${progressText} ${".".repeat(dotCount)}`;
      const seconds = `${Math.floor(spins / 5)}s`;
      const speces = " ".repeat(
        terminal.cols - animationText.length - seconds.length
      );
      terminal.write(
        // https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797#256-colors
        `\x1b[1m\x1b[38;5;111m${animationText}\x1b[0m${speces}${seconds}`
      );
      spins++;
    }

    let numberOfLines = 0;
    updateSpinner(message);
    return setInterval(() => {
      this.eraseLine();
      const lines = progress();
      Terminal.eraseLines(numberOfLines);
      numberOfLines = 0;
      lines.forEach((line) => {
        numberOfLines += line.numberOfLines;
        terminal.writeln(line.text);
      });
      updateSpinner(message);
    }, interval);
  }

  static hideSpinner(cancelToken) {
    clearInterval(cancelToken);
    this.eraseLine();
  }
}
