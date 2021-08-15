import { gzip } from "pako";

export class Encoder {
  static encode(data) {
    const json = JSON.stringify(data);
    const gziped = gzip(json);
    const base64 = btoa(String.fromCharCode(...gziped));
    return encodeURIComponent(base64);
  }
}
