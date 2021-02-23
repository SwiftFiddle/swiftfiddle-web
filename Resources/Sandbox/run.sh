#!/bin/bash

echo "$(swift --version)" > /[REDACTED]/version

exec 1> "/[REDACTED]/stdout"
exec 2> "/[REDACTED]/stderr"

if [ "$_COLOR" = true ] ; then
  export TERM=xterm-256color
  sh /[REDACTED]/faketty.sh $@ /[REDACTED]/main.swift
else
  $@ /[REDACTED]/main.swift
fi

mv /[REDACTED]/stdout /[REDACTED]/completed
