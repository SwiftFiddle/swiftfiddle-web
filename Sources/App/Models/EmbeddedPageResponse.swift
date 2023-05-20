import Foundation

struct EmbeddedPageResponse: Encodable {
  let title: String
  let versions: [VersionGroup]
  let stableVersion: String
  let latestVersion: String
  let codeSnippet: String
  let url: String
  let foldRanges: [FoldRange]
}
