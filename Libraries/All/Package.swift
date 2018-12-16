// swift-tools-version:4.0
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "All",
    products: [
        .library(
            name: "All",
            type: .dynamic,
            targets: ["All"]),
    ],
    dependencies: [
        .package(url: "https://github.com/pvieito/PythonKit.git", .branch("master")),
//        .package(url: "https://github.com/ReactiveX/RxSwift.git", from: "4.1.2"),
//        .package(url: "https://github.com/krzyzanowskim/CryptoSwift.git", from: "0.9.0"),
//        .package(url: "https://github.com/taketo1024/SwiftyMath.git", .revision("8a70d3920b45222faf6b05ddfc926df24f2ae228")),
        ],
    targets: [
        .target(
            name: "All",
            dependencies: ["PythonKit",
//                           "RxSwift",
//                           "CryptoSwift",
//                           "SwiftyMath",
//                           "SwiftyTopology",
                           ]),
    ]
)
