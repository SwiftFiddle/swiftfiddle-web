#!/bin/bash

echo "$(swift --version)" > /[REDACTED]/version

exec 1> "/[REDACTED]/log"
exec 2> "/[REDACTED]/errors"

export TERM=xterm-256color
sh /[REDACTED]/faketty.sh $@ /[REDACTED]/main.swift

mv /[REDACTED]/log /[REDACTED]/completed
