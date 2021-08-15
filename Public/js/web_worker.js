"use strict";

import { Decoder } from "./decoder.js";
import { Encoder } from "./encoder.js";

onmessage = (e) => {
  if (!e.data || !e.data.type || !e.data.value) {
    return;
  }
  switch (e.data.type) {
    case "decode": {
      const searchParams = new URLSearchParams(e.data.value);
      const query = Object.fromEntries(searchParams.entries());
      if (!query.c) {
        return;
      }
      try {
        const data = Decoder.decode(query.c);
        if (!data) {
          return;
        }
        postMessage({
          type: e.data.type,
          value: {
            code: data.code,
            version: data.version,
          },
        });
      } catch (error) {}
      break;
    }
    case "encode": {
      if (!e.data.value.code || !e.data.value.version) {
        return;
      }
      postMessage({
        type: e.data.type,
        value: `?c=${Encoder.encode({
          code: e.data.value.code,
          version: e.data.value.version,
        })}`,
      });
      break;
    }
  }
};
