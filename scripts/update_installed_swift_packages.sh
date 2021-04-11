#!/bin/bash

set -ex

cp swift-docker/5.3/_Packages/Package.swift swift-docker/5.3.1/_Packages/Package.swift
cp swift-docker/5.3/_Packages/Package.swift swift-docker/5.3.2/_Packages/Package.swift
cp swift-docker/5.3/_Packages/Package.swift swift-docker/5.3.3/_Packages/Package.swift

swift package --package-path swift-docker/5.3/_Packages/ dump-package > Resources/Views/Package.json
