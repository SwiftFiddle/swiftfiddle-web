import Foundation

struct InitialPageResponse: Encodable {
    let title: String
    let versions: [VersionGroup]
    let stableVersion: String
    let latestVersion: String
    let codeSnippet: String
    let ogpImageUrl: String
    let packageInfo: [PackageInfo]
}
