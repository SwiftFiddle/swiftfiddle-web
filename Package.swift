// swift-tools-version:5.4
import PackageDescription

let package = Package(
    name: "swift-playground",
    platforms: [
        .macOS(.v10_15)
    ],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.47.1"),
        .package(url: "https://github.com/vapor/leaf.git", from: "4.1.2"),
        .package(url: "https://github.com/apple/swift-tools-support-core.git", from: "0.2.3"),
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
        .executableTarget(name: "Run", dependencies: [.target(name: "App")])
    ]
)
