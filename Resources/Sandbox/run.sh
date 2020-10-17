#!/bin/bash

echo "$(swift --version)" > /[REDACTED]/version

exec 1> "/[REDACTED]/stdout"
exec 2> "/[REDACTED]/stderr"

export TERM=xterm-256color
sh /[REDACTED]/faketty.sh $@ /[REDACTED]/main.swift

mv /[REDACTED]/stdout /[REDACTED]/completed
