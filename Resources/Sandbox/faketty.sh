#!/bin/bash
set -eu

isatty_so=$(mktemp --tmpdir "$(basename "$0")".XXXXX.isatty.so)
echo "int isatty(int fd) { return 1; }" \
  | clang -O2 -fpic -shared -ldl -o "$isatty_so" -xc -

sh -c 'eval $@' - LD_PRELOAD="$isatty_so" "$@"
