// swift-tools-version:5.3
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "_Packages",
    products: [
        .library(name: "_Packages", type: .dynamic, targets: ["_Packages"]),
    ],
    dependencies: [
        .package(
			url: "https://github.com/taketo1024/swm-core.git",
			from:"1.1.1"
		),
        .package(
            url: "https://github.com/taketo1024/swm-matrix-tools.git",
            from: "1.0.0"
        ),
        .package(
			url: "https://github.com/taketo1024/swm-knots.git",
			from: "1.0.0"
		),
        .package(
			url: "https://github.com/taketo1024/swm-homology.git",
			from: "1.1.0"
		),
        .package(
			url: "https://github.com/taketo1024/swm-khovanov.git",
			from: "1.1.0"
		),
        .package(
			url: "https://github.com/taketo1024/swm-kr.git",
			from: "0.2.0"
		),
    ],
    targets: [
        .target(
            name: "_Packages",
            dependencies: [
                .product(name: "SwmCore", package: "swm-core"),
                .product(name: "SwmKnots", package: "swm-knots"),
                .product(name: "SwmHomology", package: "swm-homology"),
                .product(name: "SwmKhovanov", package: "swm-khovanov"),
                .product(name: "SwmKR", package: "swm-kr"),
			],
            swiftSettings: [
                .unsafeFlags(["-cross-module-optimization"], .when(configuration: .release)),
            ]
		),
    ]
)
