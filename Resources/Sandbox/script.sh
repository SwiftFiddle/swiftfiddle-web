#!/bin/bash

echo "$(swift --version)" > /[REDACTED]/version

exec 1> "/[REDACTED]/log"
exec 2> "/[REDACTED]/errors"

export TERM=xterm-256color
LD_PRELOAD=/[REDACTED]/isatty.so $@ /[REDACTED]/main.swift

mv /[REDACTED]/log /[REDACTED]/completed
