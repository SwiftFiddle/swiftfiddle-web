"use strict";

const ESC = "\u001B[";

export class Console {
  constructor(container) {
    this.terminal = new Terminal({
      theme: {
        // https://ethanschoonover.com/solarized/
        brightBlack: "#93a1a1", // base03
        black: "#073642", // base02
        brightGreen: "#586e75", // base01
        brightYellow: "#657b83", // base00
        brightBlue: "#839496", // base0
        brightCyan: "#93a1a1", // base1
        white: "#eee8d5", // base2
        brightWhite: "#fdf6e3", // base3
        yellow: "#b58900", // yellow
        brightRed: "#cb4b16", // orange
        red: "#dc322f", // red
        magenta: "#d33682", // magenta
        brightMagenta: "#6c71c4", // violet
        blue: "#268bd2", // blue
        cyan: "#2aa198", // cyan
        green: "#859900", // green
        background: "#002b36",
        foreground: "#93a1a1",
      },
      fontFamily: "Menlo,Consolas,sans-serif,monospace",
      fontSize: 15,
      lineHeight: 1.1,
      convertEol: true,
      cursorStyle: "block",
      cursorBlink: true,
      scrollback: 100000,
    });

    const fitAddon = new FitAddon.FitAddon();
    this.terminal.loadAddon(fitAddon);
    this.terminal.open(container);
    fitAddon.fit();

    this.terminal.write(`\x1b[37mWelcome to SwiftFiddle.\x1b[0m\n`);
  }

  get rows() {
    return this.terminal.rows;
  }

  get cols() {
    return this.terminal.cols;
  }

  moveCursorTo(x, y) {
    if (typeof x !== "number") {
      throw new TypeError("The `x` argument is required");
    }
    if (typeof y !== "number") {
      this.terminal.write(ESC + (x + 1) + "G");
    }
    this.terminal.write(ESC + (y + 1) + ";" + (x + 1) + "H");
  }

  cursorUp(count = 1) {
    this.terminal.write(ESC + count + "A");
  }

  cursorDown(count = 1) {
    this.terminal.write(ESC + count + "B");
  }

  cursorForward(count = 1) {
    this.terminal.write(ESC + count + "C");
  }

  cursorBackward(count = 1) {
    this.terminal.write(ESC + count + "D");
  }

  saveCursorPosition() {
    this.terminal.write(ESC + "s");
  }

  restoreCursorPosition() {
    this.terminal.write(ESC + "u");
  }

  hideCursor() {
    this.terminal.write(ESC + "?25l");
  }

  showCursor() {
    this.terminal.write(ESC + "?25h");
  }

  eraseLine() {
    this.terminal.write("\x1b[2K\r");
  }

  eraseLines(count) {
    for (let i = 0; i < count; i++) {
      this.terminal.write(`\x1b[1F`);
      this.terminal.write("\x1b[2K\r");
    }
  }

  switchNormalBuffer() {
    this.terminal.write("\x9B?47l");
  }

  switchAlternateBuffer() {
    this.terminal.write("\x9B?47h");
  }

  showSpinner(message, progress) {
    const self = this;
    const interval = 200;
    const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let spins = 0;
    function updateSpinner(message) {
      const progressText = `${SPINNER[spins % SPINNER.length]} ${message}`;
      const dotCount = Math.floor((spins * 2) / 4) % 4;
      const animationText = `${progressText} ${".".repeat(dotCount)}`;
      const seconds = `${Math.floor(spins / 5)}s`;
      const speces = " ".repeat(
        self.terminal.cols - animationText.length - seconds.length
      );
      self.terminal.write(
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
      this.eraseLines(numberOfLines);
      numberOfLines = 0;
      lines.forEach((buffer) => {
        numberOfLines += buffer.numberOfLines;
        this.terminal.writeln(buffer.text);
      });
      updateSpinner(message);
    }, interval);
  }

  hideSpinner(cancelToken) {
    clearInterval(cancelToken);
    this.eraseLine();
  }

  write(text) {
    this.terminal.write(text);
  }

  clear() {
    this.terminal.clear();
  }

  reset() {
    this.terminal.reset();
  }
}
