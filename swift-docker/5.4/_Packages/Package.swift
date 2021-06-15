// swift-tools-version:5.4
import PackageDescription

let package = Package(
    name: "_Packages",
    products: [
        .library(name: "_Packages", type: .dynamic, targets: ["_Packages"]),
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-algorithms", from: "0.2.1"),
        .package(url: "https://github.com/apple/swift-collections", from: "0.0.3"),
        .package(url: "https://github.com/apple/swift-crypto", from: "1.1.6"),
        .package(url: "https://github.com/apple/swift-system", from: "0.0.2"),
        .package(url: "https://github.com/taketo1024/swm-core.git", from:"1.2.2"),
        .package(url: "https://github.com/taketo1024/swm-homology.git", from: "1.3.0"),
        .package(url: "https://github.com/taketo1024/swm-khovanov.git", from: "1.1.2"),
        .package(url: "https://github.com/taketo1024/swm-knots.git", from: "1.1.0"),
        .package(url: "https://github.com/taketo1024/swm-kr.git", from: "0.3.1"),
        .package(url: "https://github.com/taketo1024/swm-matrix-tools.git", from: "1.1.2"),
    ],
    targets: [
        .target(
            name: "_Packages",
            dependencies: [
                .product(name: "Algorithms", package: "swift-algorithms"),
                .product(name: "Collections", package: "swift-collections"),
                .product(name: "Crypto", package: "swift-crypto"),
                .product(name: "SystemPackage", package: "swift-system"),
                .product(name: "SwmCore", package: "swm-core"),
                .product(name: "SwmHomology", package: "swm-homology"),
                .product(name: "SwmKhovanov", package: "swm-khovanov"),
                .product(name: "SwmKnots", package: "swm-knots"),
                .product(name: "SwmKR", package: "swm-kr"),
                .product(name: "SwmMatrixTools", package: "swm-matrix-tools"),
            ],
            swiftSettings: [
                .unsafeFlags(["-cross-module-optimization"], .when(configuration: .release)),
            ]
        ),
    ]
)
