#!/bin/bash

exec 1> "/usercode/log"
exec 2> "/usercode/errors"

swift --version
$@ /usercode/main.swift

mv /usercode/log /usercode/completed
