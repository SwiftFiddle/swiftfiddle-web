import { gzip } from "pako";

export class Encoder {
  static encode(data) {
    const json = JSON.stringify({ code: data.code, version: data.version });
    const gziped = gzip(json);
    const base64 = btoa(String.fromCharCode(...gziped));
    return encodeURIComponent(base64);
  }
}
