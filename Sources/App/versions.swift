import Foundation

func latestVersion() throws -> String { try availableVersions()[0] }
func stableVersion() -> String { "5.4.2" }

func availableVersions() throws -> [String] {
    [
        "5.4.2",
        "5.4.1",
        "5.4",
        "5.3.3",
        "5.3.2",
        "5.3.1",
        "5.3",
        "5.2",
        "5.1",
        "5.0",
        "4.2",
        "4.1.2",
        "4.1.1",
        "4.1",
        "4.0",
        "3.1",
        "3.0.1",
        "3.0",
        "2.2.1",
        "2.2",
        "nightly-main",
        "nightly-5.5",
        "nightly-5.4",
        "nightly-5.3",
    ]
}
