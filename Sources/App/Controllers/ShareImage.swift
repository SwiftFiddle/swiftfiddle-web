import Vapor

struct ShareImage {
  @available(macOS 12.0.0, *)
  static func generate(code: String) async throws -> Data? {
    let process = Process()
    #if os(macOS)
    process.executableURL = URL(fileURLWithPath: "/opt/homebrew/bin/freeze")
    #else
    process.executableURL = URL(fileURLWithPath: "/home/linuxbrew/.linuxbrew/bin/freeze")
    #endif
    let output = "\(UUID().uuidString).png"
    process.arguments = [
      "--language", "swift",
      "--width", "600",
      "--height", "315",
      "--output", output,
    ]

    let standardInput = Pipe()
    process.standardInput = standardInput
    process.standardOutput = Pipe()

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


