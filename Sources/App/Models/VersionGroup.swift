import Foundation

final class VersionGroup: Encodable {
    let majorVersion: String
    var versions: [String]

    init(majorVersion: String, versions: [String]) {
        self.majorVersion = majorVersion
        self.versions = versions
    }

    static func grouped(versions: [String]) -> [VersionGroup] {
        versions.reduce(into: [VersionGroup]()) { (versionGroup, version) in
            let nightlyVersion = version.split(separator: "-")
            if nightlyVersion.count == 2 {
                let majorVersion = String(nightlyVersion[0])
                if majorVersion != versionGroup.last?.majorVersion {
                    versionGroup.append(VersionGroup(majorVersion: majorVersion, versions: [version]))
                } else {
                    versionGroup.last?.versions.append(version)
                }
            } else if nightlyVersion.count == 4 {
                let majorVersion = "snapshot"
                if majorVersion != versionGroup.last?.majorVersion {
                    versionGroup.append(VersionGroup(majorVersion: majorVersion, versions: [nightlyVersion.joined(separator: "-")]))
                } else {
                    versionGroup.last?.versions.append(nightlyVersion.joined(separator: "-"))
                }
            } else {
                let majorVersion = "Swift \(version.split(separator: ".")[0])"
                if majorVersion != versionGroup.last?.majorVersion {
                    versionGroup.append(VersionGroup(majorVersion: majorVersion, versions: [version]))
                } else {
                    versionGroup.last?.versions.append(version)
                }
            }
        }
    }
}
