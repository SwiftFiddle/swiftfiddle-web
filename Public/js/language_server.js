"use strict";

import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import ReconnectingWebSocket from "reconnecting-websocket";
import { datadogLogs } from "@datadog/browser-logs";
import { uuidv4 } from "./uuid.js";

export class LanguageServer {
  constructor(endpoint) {
    this.connection = this.createConnection(endpoint);

    this.onconnect = () => {};
    this.onresponse = () => {};
    this.onerror = () => {};
    this.onclose = () => {};
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

  requestFormat(code) {
    const params = {
      method: "format",
      code: code,
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

  insertTextRule() {
    return monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
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
    if (
      this.connection &&
      (this.connection.readyState === 0 || this.connection.readyState === 1)
    ) {
      return this.connection;
    }

    this.sessionId = uuidv4();
    const connection = new ReconnectingWebSocket(endpoint, [], {
      maxReconnectionDelay: 10000,
      minReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1.3,
      connectionTimeout: 10000,
      maxRetries: Infinity,
      debug: false,
    });

    connection.onopen = () => {
      this.onconnect();
    };

    connection.onerror = (event) => {
      datadogLogs.logger.error("lang-server websocket error", event);
      this.onerror(event);
      connection.close();
    };

    connection.onclose = (event) => {
      this.onclose(event);
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
