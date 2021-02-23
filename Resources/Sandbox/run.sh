#!/bin/bash

echo "$(swift --version)" > /[REDACTED]/version

exec 1> "/[REDACTED]/stdout"
exec 2> "/[REDACTED]/stderr"

if [ "$_COLOR" = true ] ; then
  export TERM=xterm-256color

  if [ "$_TYPE_BASED_PROGRAM_ENTORY_POINTS" = true ] ; then
    sh /[REDACTED]/faketty.sh $@ /[REDACTED]/main.swift && ./main
  else
    sh /[REDACTED]/faketty.sh $@ /[REDACTED]/main.swift
  fi
else
  if [ "$_TYPE_BASED_PROGRAM_ENTORY_POINTS" = true ] ; then
    $@ /[REDACTED]/main.swift && ./main
  else
    $@ /[REDACTED]/main.swift
  fi
fi

mv /[REDACTED]/stdout /[REDACTED]/completed
