#!/bin/bash

echo "$(swift --version)" > /[REDACTED]/version

exec 1> "/[REDACTED]/log"
exec 2> "/[REDACTED]/errors"

$@ /[REDACTED]/main.swift

mv /[REDACTED]/log /[REDACTED]/completed
