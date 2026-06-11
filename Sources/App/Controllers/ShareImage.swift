import Vapor

#if canImport(Glibc)
import Glibc
#elseif canImport(Darwin)
import Darwin
#endif

struct ShareImage {
  /// Renders `code` to a PNG at `destination` using the `silicon` CLI.
  ///
  /// The image is written to a temporary file first and atomically moved into
  /// place, so a crashed or killed render never leaves a partial image to be
  /// served (or cached).
  @available(macOS 12.0.0, *)
  static func generate(code: String, to destination: URL) async throws {
    let process = Process()
    #if os(macOS)
    process.executableURL = URL(fileURLWithPath: "/opt/homebrew/bin/silicon")
    #else
    process.executableURL = URL(fileURLWithPath: "/home/linuxbrew/.linuxbrew/bin/silicon")
    #endif

    let tempURL = destination
      .deletingLastPathComponent()
      .appendingPathComponent(".tmp-\(UUID().uuidString).png")
    process.arguments = [
      "--language", "swift",
      "--pad-horiz", "0",
      "--pad-vert", "0",
      "--font", "Source Han Code JP",
      "--no-window-controls",
      "--theme", "GitHub",
      "--output", tempURL.path,
    ]

    let standardInput = Pipe()
    process.standardInput = standardInput
    // Discard silicon's stdout/stderr via the null device. Wiring up unread
    // Pipes here is a latent deadlock: once silicon writes more than the ~64KB
    // pipe buffer, it blocks on the write, the termination handler never fires,
    // and the request (and the silicon process) hangs forever.
    process.standardOutput = FileHandle.nullDevice
    process.standardError = FileHandle.nullDevice

    defer { try? FileManager.default.removeItem(at: tempURL) }

    try standardInput.fileHandleForWriting.write(contentsOf: Data(code.utf8))
    try standardInput.fileHandleForWriting.close()

    let status = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Int32, Error>) in
      // Force-kill silicon if it hangs so it can't pin a request thread and its
      // (font-rendering) memory indefinitely.
      let killItem = DispatchWorkItem {
        if process.isRunning {
          kill(process.processIdentifier, SIGKILL)
        }
      }
      DispatchQueue.global().asyncAfter(deadline: .now() + 20, execute: killItem)
      process.terminationHandler = { process in
        killItem.cancel()
        continuation.resume(returning: process.terminationStatus)
      }
      do {
        try process.run()
      } catch {
        killItem.cancel()
        continuation.resume(throwing: error)
      }
    }

    guard status == 0, FileManager.default.fileExists(atPath: tempURL.path) else {
      throw Abort(.internalServerError, reason: "Failed to render share image")
    }

    try? FileManager.default.removeItem(at: destination)
    try FileManager.default.moveItem(at: tempURL, to: destination)
  }
}
