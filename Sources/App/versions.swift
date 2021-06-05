import Foundation
import TSCBasic

func latestVersion() throws -> String { try availableVersions()[0] }
func stableVersion() -> String { "5.4.1" }

func availableVersions() throws -> [String] {
    let process = Process(args: "docker", "images", "--filter=reference=swift", "--filter=reference=*/swift", "--format", "{{.Tag}}")
    try process.launch()
    try process.waitUntilExit()

    guard let output = try process.result?.utf8Output(), !output.isEmpty else  {
        return [stableVersion()]
    }

    let versions = Set(output.split(separator: "\n").map { $0.replacingOccurrences(of: "-bionic", with: "").replacingOccurrences(of: "-focal", with: "").replacingOccurrences(of: "-slim", with: "").replacingOccurrences(of: "snapshot-", with: "") }).sorted(by: >)
    return versions.isEmpty ? [stableVersion()] : versions
}

func imageTag(for prefix: String) throws -> String? {
    let process = Process(args: "docker", "images", "--filter=reference=swift", "--filter=reference=*/swift", "--format", "{{.Tag}} {{.Repository}}:{{.Tag}}")
    try process.launch()
    try process.waitUntilExit()

    guard let output = try process.result?.utf8Output(), !output.isEmpty else  {
        return nil
    }

    return output
        .split(separator: "\n")
        .sorted()
        .filter { $0.replacingOccurrences(of: "snapshot-", with: "").starts(with: prefix) }
        .map { String($0.split(separator: " ")[1]) }
        .first
}
