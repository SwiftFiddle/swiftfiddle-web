import { ungzip } from "pako";

export class Decoder {
  static decode(string) {
    const base64 = decodeURIComponent(string);
    const gziped = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const json = ungzip(gziped, { to: "string" });
    return JSON.parse(json);
  }
}
