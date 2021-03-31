// swift-tools-version:5.2
import PackageDescription

let package = Package(
    name: "swift-playground",
    platforms: [
        .macOS(.v10_15)
    ],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.0.0"),
        .package(url: "https://github.com/vapor/leaf.git", from: "4.1.0"),
        .package(url: "https://github.com/apple/swift-tools-support-core.git", from: "0.2.2"),
    ],
    targets: [
        .target(
            name: "App",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
                .product(name: "Leaf", package: "leaf"),
                .product(name: "SwiftToolsSupport-auto", package: "swift-tools-support-core"),
            ],
            swiftSettings: [
                .unsafeFlags(["-cross-module-optimization"], .when(configuration: .release)),
            ]
        ),
        .target(name: "Run", dependencies: [.target(name: "App")]),
    ]
)
