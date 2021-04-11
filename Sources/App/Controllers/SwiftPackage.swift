import Foundation

struct Package: Codable {
    let name: String
    let dependencies: [Dependency]
    let targets: [Target]
}

struct Dependency: Codable {
    let name: String
    let url: String
    let requirement: Requirement
}

struct Requirement: Codable {
    let range: [Range]
}

struct Range: Codable {
    let lowerBound: String
    let upperBound: String
}

struct Target: Codable {
    let dependencies: [TargetDependency]
    let name: String
    let type: String
}

struct TargetDependency: Codable {
    let product: [String?]
}
