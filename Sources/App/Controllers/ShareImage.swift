import Vapor

struct ShareImage {
  @available(macOS 12.0.0, *)
  static func generate(code: String) async throws -> Data? {
    let process = Process()
    #if os(macOS)
    process.executableURL = URL(fileURLWithPath: "/opt/homebrew/bin/silicon")
    #else
    process.executableURL = URL(fileURLWithPath: "/home/linuxbrew/.linuxbrew/bin/silicon")
    #endif
    let output = "\(UUID().uuidString).png"
    process.arguments = [
      "--language", "swift",
      "--pad-horiz", "0",
      "--pad-vert", "0",
      "--font", "Source Han Code JP",
      "--no-window-controls",
      "--theme", "GitHub",
      "--output", output,
    ]

    let standardInput = Pipe()
    process.standardInput = standardInput
    process.standardOutput = Pipe()
    process.standardError = Pipe()

    try standardInput.fileHandleForWriting.write(contentsOf: Data(code.utf8))
    try standardInput.fileHandleForWriting.close()

    _ = try await withCheckedThrowingContinuation { (continuation) in
      process.terminationHandler = { (process) in
        continuation.resume(returning: process.terminationStatus)
      }
      do {
        try process.run()
      } catch {
        continuation.resume(throwing: error)
      }
    }

    return try Data(contentsOf: URL(fileURLWithPath: output))
  }
}


