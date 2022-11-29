// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "swift-playground",
    platforms: [
        .macOS(.v12)
    ],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.67.4"),
        .package(url: "https://github.com/vapor/leaf.git", from: "4.2.4"),
    ],
    targets: [
        .target(
            name: "App",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
                .product(name: "Leaf", package: "leaf"),
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
