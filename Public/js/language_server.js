"use strict";

import { uuidv4 } from "./uuid.js";

export class LanguageServer {
  constructor(endpoint) {
    this.connection = this.createConnection(endpoint);

    this.onconnect = () => {};
    this.onready = () => {};
    this.onresponse = () => {};
  }

  get isReady() {
    return this.connection.readyState === 1;
  }

  openDocument(code) {
    const params = {
      method: "didOpen",
      code: code || "",
      sessionId: this.sessionId,
    };
    this.connection.send(JSON.stringify(params));
  }

  syncDocument(code) {
    const params = {
      method: "didChange",
      code: code,
      sessionId: this.sessionId,
    };
    this.connection.send(JSON.stringify(params));
  }

  requestHover(sequence, row, column) {
    const params = {
      method: "hover",
      id: sequence,
      row: row,
      column: column,
      sessionId: this.sessionId,
    };
    this.connection.send(JSON.stringify(params));
  }

  requestCompletion(sequence, row, column) {
    const params = {
      method: "completion",
      id: sequence,
      row: row,
      column: column,
      sessionId: this.sessionId,
    };
    this.connection.send(JSON.stringify(params));
  }

  convertCompletionItemKind(kind) {
    switch (kind) {
      case 1:
        return monaco.languages.CompletionItemKind.Text;
      case 2:
        return monaco.languages.CompletionItemKind.Method;
      case 3:
        return monaco.languages.CompletionItemKind.Function;
      case 4:
        return monaco.languages.CompletionItemKind.Constructor;
      case 5:
        return monaco.languages.CompletionItemKind.Field;
      case 6:
        return monaco.languages.CompletionItemKind.Variable;
      case 7:
        return monaco.languages.CompletionItemKind.Class;
      case 8:
        return monaco.languages.CompletionItemKind.Interface;
      case 9:
        return monaco.languages.CompletionItemKind.Module;
      case 10:
        return monaco.languages.CompletionItemKind.Property;
      case 11:
        return monaco.languages.CompletionItemKind.Unit;
      case 12:
        return monaco.languages.CompletionItemKind.Value;
      case 13:
        return monaco.languages.CompletionItemKind.Enum;
      case 14:
        return monaco.languages.CompletionItemKind.Keyword;
      case 15:
        return monaco.languages.CompletionItemKind.Snippet;
      case 16:
        return monaco.languages.CompletionItemKind.Color;
      case 17:
        return monaco.languages.CompletionItemKind.File;
      case 18:
        return monaco.languages.CompletionItemKind.Reference;
      case 19:
        return monaco.languages.CompletionItemKind.Folder;
      case 20:
        return monaco.languages.CompletionItemKind.EnumMember;
      case 21:
        return monaco.languages.CompletionItemKind.Constant;
      case 22:
        return monaco.languages.CompletionItemKind.Struct;
      case 23:
        return monaco.languages.CompletionItemKind.Event;
      case 24:
        return monaco.languages.CompletionItemKind.Operator;
      case 25:
        return monaco.languages.CompletionItemKind.TypeParameter;
      default:
        return kind;
    }
  }

  convertDiagnosticSeverity(severity) {
    switch (severity) {
      case 1:
        return monaco.MarkerSeverity.Error;
      case 2:
        return monaco.MarkerSeverity.Warning;
      case 3:
        return monaco.MarkerSeverity.Info;
      case 4:
        return monaco.MarkerSeverity.Hint;
      default:
        return severity;
    }
  }

  createConnection(endpoint) {
    console.log(`Connecting to ${endpoint}`);
    this.sessionId = uuidv4();
    const connection = new WebSocket(endpoint);

    connection.onopen = () => {
      console.log(`Language Server connected (${connection.readyState}).`);
      this.onconnect();
      const cancelToken = setInterval(() => {
        if (connection.readyState !== 1) {
          clearInterval(cancelToken);
          return;
        }
        connection.send("ping");
      }, 10000);

      document.addEventListener("visibilitychange", () => {
        switch (document.visibilityState) {
          case "hidden":
            break;
          case "visible":
            if (connection.readyState === 2 || connection.readyState === 3) {
              this.connection = this.createConnection(connection.url);
            }
            break;
        }
      });
    };

    connection.onclose = (event) => {
      console.log(
        `Language Server disconnected (${event.code}). ${event.reason}`
      );
      if (event.code !== 1006) {
        return;
      }
      setTimeout(() => {
        if (connection.readyState === 2 || connection.readyState === 3) {
          this.connection = this.createConnection(connection.url);
        }
      }, 1000);
    };

    connection.onerror = (event) => {
      console.error(`Language Server error: ${event.message}`);
      connection.close();
    };

    connection.onmessage = (event) => {
      const response = JSON.parse(event.data);
      this.onresponse(response);
    };
    return connection;
  }

  close() {
    const params = {
      method: "didClose",
      sessionId: this.sessionId,
    };
    this.connection.send(JSON.stringify(params));
  }
}
