import Foundation

final class WorkingDirectoryRegistry {
  static let shared = WorkingDirectoryRegistry()

  private var directories = [String: URL]()
  private var prefixes = [URL: String]()

  private init() {}

  func register(prefix: String, path: URL) {
    if prefix.isEmpty { return }
    directories[prefix] = path
    prefixes[path] = prefix
  }

  func remove(path: URL) {
    if let prefix = prefixes[path] {
      directories[prefix] = nil
      prefixes[path] = nil
    }
  }

  func get(prefix: String) -> URL? { directories[prefix] }
}
