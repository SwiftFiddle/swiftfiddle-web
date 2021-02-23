import Vapor
import TSCBasic

private let cache = Cache<String, ByteBuffer>()

func routes(_ app: Application) throws {
    app.get { req in try index(req) }
    app.get("index.html") { (req) in try index(req) }
    func index(_ req: Request) throws -> EventLoopFuture<View> {
        return req.view.render(
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

    app.get("versions") { (req) in try availableVersions() }

    app.get(":id") { req -> EventLoopFuture<Response> in
        func handleImportContent(_ req: Request, _ promise: EventLoopPromise<Response>,
                                 _ id: String, _ code: String, _ swiftVersion: String?) throws {
            let path = req.url.path
            if path.hasSuffix(".png") {
                if let buffer = cache.object(forKey: path) {
                    return promise.succeed(Response(status: .ok, headers: ["Content-Type": "image/png"], body: Response.Body(buffer: buffer)))
                }
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

        if let path = req.parameters.get("id"), let id = try SharedLink.id(from: path) {
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
        } else if let path = req.parameters.get("id"), let id = try Gist.id(from: path) {
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

    app.on(.POST, "run", body: .collect(maxSize: "10mb")) { (req) -> EventLoopFuture<ExecutionResponse> in
        let parameter = try req.content.decode(ExecutionRequestParameter.self)

        var toolchainVersion = parameter.toolchain_version ?? stableVersion()
        if (toolchainVersion == "latest") {
            toolchainVersion = try! latestVersion();
        } else if (toolchainVersion == "stable") {
            toolchainVersion = stableVersion();
        }
        let command = parameter.command ?? "swift"
        let options = parameter.options ?? ((toolchainVersion == "nightly-master" || toolchainVersion == "nightly-main") ? "-Xfrontend -enable-experimental-concurrency" : "")
        let timeout = parameter.timeout ?? 60 // Default timeout is 60 seconds
        let color = parameter._color ?? false

        var environment = ProcessEnv.vars
        environment["_COLOR"] = "\(color)"

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
        let sandboxPath = URL(fileURLWithPath: "\(app.directory.resourcesDirectory)Sandbox")
        let random = UUID().uuidString
        let temporaryPath = URL(fileURLWithPath: "\(app.directory.resourcesDirectory)Temp/\(random)")

        do {
            try FileManager().copyItem(at: sandboxPath, to: temporaryPath)
            try """
                import Glibc
                setbuf(stdout, nil)

                /* Start user code. Do not edit comment generated here */
                \(code)
                /* End user code. Do not edit comment generated here */
                """
                .data(using: .utf8)?
                .write(to: temporaryPath.appendingPathComponent("main.swift"))

            let process = Process(
                args: "sh", temporaryPath.appendingPathComponent("sandobox.sh").path,
                "\(timeout)s",
                "--volume",
                "\(Environment.get("HOST_PWD") ?? app.directory.workingDirectory)Resources/Temp/\(random):/[REDACTED]",
                image,
                "sh",
                "/[REDACTED]/run.sh",
                [command, options].joined(separator: " "),
                environment: environment
            )
            try process.launch()

            let interval = 0.2
            var counter: Double = 0
            let timer = DispatchSource.makeTimerSource()

            let completedPath = temporaryPath.appendingPathComponent("completed")
            let stdoutPath = temporaryPath.appendingPathComponent("stdout")
            let stderrPath = temporaryPath.appendingPathComponent("stderr")
            let versionPath = temporaryPath.appendingPathComponent("version")

            timer.setEventHandler {
                counter += 1
                if let completed = try? String(contentsOf: completedPath) {
                    let stderr = (try? String(contentsOf: stderrPath)) ?? ""
                    let version = (try? String(contentsOf: versionPath)) ?? "N/A"

                    promise.succeed(ExecutionResponse(output: completed, errors: stderr, version: version))

                    try? FileManager().removeItem(at: temporaryPath)
                    timer.cancel()
                } else if interval * counter < Double(timeout) {
                    return
                } else {
                    let stdout = (try? String(contentsOf: stdoutPath)) ?? ""

                    let stderr = "\((try? String(contentsOf: stderrPath)) ?? "")Maximum execution time of \(timeout) seconds exceeded.\n"
                    let version = (try? String(contentsOf: versionPath)) ?? "N/A"

                    promise.succeed(ExecutionResponse(output: stdout, errors: stderr, version: version))

                    try? FileManager().removeItem(at: temporaryPath)
                    timer.cancel()
                }
            }
            timer.schedule(deadline: .now() + .milliseconds(200), repeating: .milliseconds(200))
            timer.resume()
        } catch {
            try? FileManager().removeItem(at: temporaryPath)
            return req.eventLoop.makeFailedFuture(error)
        }

        return promise.futureResult
    }

    app.on(.POST, "shared_link", body: .collect(maxSize: "10mb")) { (req) -> EventLoopFuture<[String: String]> in
        let parameter = try req.content.decode(SharedLinkRequestParameter.self)
        let code = parameter.code
        let swiftVersion = parameter.toolchain_version

        guard let id = Base32.encoode(bytes: convertHexToBytes(UUID().uuidString.replacingOccurrences(of: "-", with: "")))?.lowercased() else { throw Abort(.internalServerError) }

        let promise = req.eventLoop.makePromise(of: [String: String].self)

        try Firestore.createDocument(client: req.client, id: id, code: parameter.code, swiftVersion: swiftVersion)
            .whenComplete {
                switch $0 {
                case .success:
                    try? ShareImage.image(client: req.client, from: code)
                        .whenSuccess {
                            guard let buffer = $0 else { return }
                            cache.setObject(buffer, forKey: "/\(id).png")
                        }
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

    app.get("\(loaderioVerificationToken)") { (req) in return loaderioVerificationToken }
    app.get("\(loaderioVerificationToken).txt") { (req) in return loaderioVerificationToken }
    app.get("\(loaderioVerificationToken).html") { (req) in return loaderioVerificationToken }
}

private func availableVersions() throws -> [String] {
    let process = Process(args: "docker", "images", "--filter=reference=swift", "--filter=reference=*/swift", "--format", "{{.Tag}}")
    try process.launch()
    try process.waitUntilExit()

    guard let output = try process.result?.utf8Output(), !output.isEmpty else  {
        return [stableVersion()]
    }

    let versions = Set(output.split(separator: "\n").map { $0.replacingOccurrences(of: "-bionic", with: "").replacingOccurrences(of: "-focal", with: "").replacingOccurrences(of: "-slim", with: "").replacingOccurrences(of: "snapshot-", with: "") }).sorted(by: >)
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
        .filter { $0.replacingOccurrences(of: "snapshot-", with: "").starts(with: prefix) }
        .map { String($0.split(separator: " ")[1]) }
        .first
}

struct ExecutionRequestParameter: Decodable {
    let toolchain_version: String?
    let command: String?
    let options: String?
    let code: String?
    let timeout: Int?
    let _color: Bool?
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

struct ExecutionResponse: Content {
    let output: String
    let errors: String
    let version: String
}

func latestVersion() throws -> String { try availableVersions()[0] }
func stableVersion() -> String { "5.3.1" }

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

private let loaderioVerificationToken = "loaderio-28dcf65c633864d2ea288eddddbb9da6"
