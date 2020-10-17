import Vapor
import TSCBasic
import Base32

func routes(_ app: Application) throws {
    app.get { req in
        req.view.render(
            "index", InitialPageResponse(
                title: "Swift Playground",
                versions: try VersionGroup.grouped(versions: availableVersions()),
                stableVersion: stableVersion(),
                latestVersion: try latestVersion(),
                codeSnippet: defaultCodeSnippet,
                ogpImageUrl: "./default_ogp.jpeg"
            )
        )
    }

    app.get("index.html") { req -> EventLoopFuture<View> in
        req.view.render(
            "index", InitialPageResponse(
                title: "Swift Playground",
                versions: try VersionGroup.grouped(versions: availableVersions()),
                stableVersion: stableVersion(),
                latestVersion: try latestVersion(),
                codeSnippet: defaultCodeSnippet,
                ogpImageUrl: "./default_ogp.jpeg"
            )
        )
    }

    app.get("versions") { req in try availableVersions() }

    app.get("*") { req -> EventLoopFuture<Response> in
        func handleImportContent(_ req: Request, _ promise: EventLoopPromise<Response>,
                                 _ id: String, _ code: String, _ swiftVersion: String?) throws {
            if req.url.path.hasSuffix(".png") {
                return try ShareImage.image(client: req.client, from: code)
                    .flatMapThrowing {
                        guard let buffer = $0 else { throw Abort(.notFound) }
                        return Response(status: .ok, headers: ["Content-Type": "image/png"], body: Response.Body(buffer: buffer))
                    }
                    .cascade(to: promise)
            } else {
                return req.view.render(
                    "index", InitialPageResponse(
                        title: "Swift Playground",
                        versions: try VersionGroup.grouped(versions: availableVersions()),
                        stableVersion: swiftVersion ?? stableVersion(),
                        latestVersion: try latestVersion(),
                        codeSnippet: code,
                        ogpImageUrl: "https://swiftfiddle.com/\(id).png"
                    )
                )
                .encodeResponse(for: req)
                .cascade(to: promise)
            }
        }

        if let id = try SharedLink.id(from: req.url.path) {
            let promise = req.eventLoop.makePromise(of: Response.self)
            try SharedLink.content(client: req.client, id: id.replacingOccurrences(of: ".png", with: ""))
                .whenComplete {
                    switch $0 {
                    case .success(let content):
                        do {
                            if let content = content {
                                let code = content.fields.shared_link.mapValue.fields.content.stringValue
                                let swiftVersion = content.fields.shared_link.mapValue.fields.swift_version.stringValue
                                try handleImportContent(req, promise, id, code, swiftVersion)
                            } else {
                                promise.fail(Abort(.notFound))
                            }
                        } catch {
                            promise.fail(Abort(.internalServerError))
                        }
                    case .failure(let error):
                        promise.fail(error)
                    }
                }
            return promise.futureResult
        } else if let id = try Gist.id(from: req.url.path) {
            let promise = req.eventLoop.makePromise(of: Response.self)
            Gist.content(client: req.client, id: id.replacingOccurrences(of: ".png", with: ""))
                .whenComplete{
                    switch $0 {
                    case .success(let content):
                        do {
                            if let content = content {
                                let code = Array(content.files.values)[0].content
                                try handleImportContent(req, promise, id, code, nil)
                            } else {
                                promise.fail(Abort(.notFound))
                            }
                        } catch {
                            promise.fail(Abort(.internalServerError))
                        }
                    case .failure(let error):
                        promise.fail(error)
                    }
                }
            return promise.futureResult
        } else {
            throw Abort(.notFound)
        }
    }

    app.on(.POST, "run", body: .collect(maxSize: "10mb")) { req -> EventLoopFuture<ExecutionResponse> in
        let parameter = try req.content.decode(ExecutionRequestParameter.self)

        var toolchainVersion = parameter.toolchain_version ?? stableVersion()
        if (toolchainVersion == "latest") {
            toolchainVersion = try! latestVersion();
        } else if (toolchainVersion == "stable") {
            toolchainVersion = stableVersion();
        }
        let command = parameter.command ?? "swift"
        let options = parameter.options ?? toolchainVersion == "nightly-master" ? "-Xfrontend -enable-experimental-concurrency" : ""
        let timeout = parameter.timeout ?? 30 // Default timeout

        guard try availableVersions().contains(toolchainVersion) else {
            throw Abort(.badRequest)
        }

        guard ["swift", "swiftc"].contains(command) else {
            throw Abort(.badRequest)
        }

        // Security check
        if [";", "&", "&&", "||", "`", "(", ")", "#"].contains(where: { options.contains($0) }) {
            throw Abort(.badRequest)
        }

        guard let code = parameter.code else {
            throw Abort(.badRequest)
        }

        let image: String
        if let tag = try imageTag(for: toolchainVersion) {
            image = tag
        } else {
            throw Abort(.internalServerError)
        }

        let promise = req.eventLoop.makePromise(of: ExecutionResponse.self)
        do {
            let sandboxPath = URL(fileURLWithPath: "\(app.directory.resourcesDirectory)Sandbox")
            let random = UUID().uuidString
            let temporaryPath = URL(fileURLWithPath: "\(app.directory.resourcesDirectory)Temp/\(random)")
            try FileManager().copyItem(at: sandboxPath, to: temporaryPath)
            try code.data(using: .utf8)?.write(to: temporaryPath.appendingPathComponent("main.swift"))

            let process = Process(
                args: "sh", temporaryPath.appendingPathComponent("sandobox.sh").path,
                "\(timeout)s",
                "--volume",
                "\(Environment.get("HOST_PWD") ?? app.directory.workingDirectory)/Resources/Temp/\(random):/[REDACTED]",
                image,
                "sh",
                "/[REDACTED]/run.sh",
                [command, options].joined(separator: " ")
            )
            try process.launch()

            let interval = 0.2
            var counter: Double = 0
            let timer = DispatchSource.makeTimerSource()

            let completedPath = temporaryPath.appendingPathComponent("completed")
            let errorsPath = temporaryPath.appendingPathComponent("errors")
            let versionPath = temporaryPath.appendingPathComponent("version")

            timer.setEventHandler {
                counter += 1
                if let completed = try? String(contentsOf: completedPath) {
                    var errorlog = ""
                    if let errors = try? String(contentsOf: errorsPath) {
                        errorlog = errors
                    } else {
                        errorlog = ""
                    }
                    let version = try? String(contentsOf: versionPath)
                    promise.succeed(ExecutionResponse(output: completed, errors: errorlog, version: version ?? ""))

                    try? FileManager().removeItem(at: temporaryPath)
                    timer.cancel()
                } else if interval * counter < Double(timeout) {
                    return
                } else {
                    var errorlog = ""
                    if let errors = try? String(contentsOf: errorsPath) {
                        errorlog = errors
                    } else {
                        errorlog = "Maximum execution time of \(timeout) seconds exceeded."
                    }
                    let version = try? String(contentsOf: versionPath)
                    promise.succeed(ExecutionResponse(output: "", errors: errorlog, version: version ?? ""))

                    try? FileManager().removeItem(at: temporaryPath)
                    timer.cancel()
                }
            }
            timer.schedule(deadline: .now() + .milliseconds(200), repeating: .milliseconds(200))
            timer.resume()
        } catch {
            return req.eventLoop.makeFailedFuture(error)
        }

        return promise.futureResult
    }

    app.post("shared_link") { req -> EventLoopFuture<[String: String]> in
        let parameter = try req.content.decode(SharedLinkRequestParameter.self)
        let code = parameter.code
        let swiftVersion = parameter.toolchain_version
        let id = Base32.base32Encode(UUID().uuidString.replacingOccurrences(of: "-", with: "").hexaData).replacingOccurrences(of: "=", with: "").lowercased()

        let promise = req.eventLoop.makePromise(of: [String: String].self)

        try Firestore.createDocument(client: req.client, id: id, code: parameter.code, swiftVersion: swiftVersion)
            .whenComplete {
                switch $0 {
                case .success:
                    promise.succeed(
                        ["swift_version": swiftVersion,
                        "content": code,
                        "url": "https://swiftfiddle.com/\(id)",
                        ]
                    )
                case .failure(let error):
                    promise.fail(error)
                }
            }

        return promise.futureResult
    }
}

private func availableVersions() throws -> [String] {
    let process = Process(args: "docker", "images", "--filter=reference=swift", "--filter=reference=*/swift", "--format", "{{.Tag}}")
    try process.launch()
    try process.waitUntilExit()

    guard let output = try process.result?.utf8Output(), !output.isEmpty else  {
        return [stableVersion()]
    }

    let versions = Set(output.split(separator: "\n").map { $0.replacingOccurrences(of: "-bionic", with: "").replacingOccurrences(of: "-focal", with: "") }).sorted(by: >)
    return versions.isEmpty ? [stableVersion()] : versions
}

private func imageTag(for prefix: String) throws -> String? {
    let process = Process(args: "docker", "images", "--filter=reference=swift", "--filter=reference=*/swift", "--format", "{{.Tag}} {{.Repository}}:{{.Tag}}")
    try process.launch()
    try process.waitUntilExit()

    guard let output = try process.result?.utf8Output(), !output.isEmpty else  {
        return nil
    }

    return output
        .split(separator: "\n")
        .sorted()
        .filter { $0.starts(with: prefix) }
        .map { String($0.split(separator: " ")[1]) }
        .first
}

struct ExecutionRequestParameter: Decodable {
    let toolchain_version: String?
    let command: String?
    let options: String?
    let code: String?
    let timeout: Int?
}

struct SharedLinkRequestParameter: Decodable {
    let toolchain_version: String
    let code: String
}

struct InitialPageResponse: Encodable {
    let title: String
    let versions: [VersionGroup]
    let stableVersion: String
    let latestVersion: String
    let codeSnippet: String
    let ogpImageUrl: String
}

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
                    versionGroup.append(VersionGroup(majorVersion: String(majorVersion), versions: [version]))
                } else {
                    versionGroup.last?.versions.append(version)
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

struct ExecutionResponse: Content {
    let output: String
    let errors: String
    let version: String
}

func latestVersion() throws -> String { try availableVersions()[0] }
func stableVersion() -> String { "5.3" }

let defaultCodeSnippet = #"""
import Foundation

func greet(person: String) -> String {
    let greeting = "Hello, " + person + "!"
    return greeting
}

// Prints "Hello, Anna!"
print(greet(person: "Anna"))

// Prints "Hello, Brian!"
print(greet(person: "Brian"))

"""#

extension StringProtocol {
    var hexaData: Data { .init(hexa) }
    var hexaBytes: [UInt8] { .init(hexa) }
    private var hexa: UnfoldSequence<UInt8, Index> {
        sequence(state: startIndex) { startIndex in
            guard startIndex < self.endIndex else { return nil }
            let endIndex = self.index(startIndex, offsetBy: 2, limitedBy: self.endIndex) ?? self.endIndex
            defer { startIndex = endIndex }
            return UInt8(self[startIndex..<endIndex], radix: 16)
        }
    }
}
