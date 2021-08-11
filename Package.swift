// swift-tools-version:5.4
import PackageDescription

let package = Package(
    name: "swift-playground",
    platforms: [
        .macOS(.v10_15)
    ],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.48.3"),
        .package(url: "https://github.com/vapor/leaf.git", from: "4.1.3"),
        .package(url: "https://github.com/nodes-vapor/bugsnag.git", from: "4.0.0-rc.2"),
    ],
    targets: [
        .target(
            name: "App",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
                .product(name: "Leaf", package: "leaf"),
                .product(name: "Bugsnag", package: "bugsnag"),
            ],
            swiftSettings: [
                .unsafeFlags(["-cross-module-optimization"], .when(configuration: .release)),
            ]
        ),
        .executableTarget(
            name: "Run", dependencies: [
                .target(name: "App"),
            ]
        ),
        .testTarget(
            name: "AppTests", dependencies: [
                .target(name: "App"),
                .product(name: "XCTVapor", package: "vapor"),
            ]
        )
    ]
)
