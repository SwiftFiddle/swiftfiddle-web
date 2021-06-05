import Vapor
import TSCBasic

private let cache = Cache<String, ByteBuffer>()
private var timers = [ObjectWrapper]()

private class ObjectWrapper {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }
}

func routes(_ app: Application) throws {
    app.get { (req) in try index(req) }
    app.get("index.html") { (req) in try index(req) }
    func index(_ req: Request) throws -> EventLoopFuture<View> {
        return req.view.render(
            "index", InitialPageResponse(
                title: "Swift Playground",
                versions: try VersionGroup.grouped(versions: availableVersions()),
                stableVersion: stableVersion(),
                latestVersion: try latestVersion(),
                codeSnippet: defaultCodeSnippet,
                ogpImageUrl: "./default_ogp.jpeg",
                packageInfo: swiftPackageInfo(app)
            )
        )
    }

    app.get(":id") { req -> EventLoopFuture<Response> in
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

    app.get(":id", "embedded") { req -> EventLoopFuture<Response> in
        let foldRanges: [FoldRange] = req.query[[String].self, at: "fold"]?.compactMap {
            let lines = $0.split(separator: "-")
            guard lines.count == 2 else { return nil }
            guard let start = Int(lines[0]), let end = Int(lines[1]) else { return nil }
            guard start <= end else { return nil }
            return FoldRange(start: start, end: end)
        } ?? []

        if let path = req.parameters.get("id"), let id = try SharedLink.id(from: path) {
            let promise = req.eventLoop.makePromise(of: Response.self)
            try SharedLink.content(client: req.client, id: id)
                .whenComplete {
                    switch $0 {
                    case .success(let content):
                        do {
                            if let content = content {
                                let code = content.fields.shared_link.mapValue.fields.content.stringValue
                                let swiftVersion = content.fields.shared_link.mapValue.fields.swift_version.stringValue
                                try handleEmbeddedContent(req, promise, id, code, swiftVersion, foldRanges)
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
            Gist.content(client: req.client, id: id)
                .whenComplete{
                    switch $0 {
                    case .success(let content):
                        do {
                            if let content = content {
                                let code = Array(content.files.values)[0].content
                                try handleEmbeddedContent(req, promise, id, code, nil, foldRanges)
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
        let runner = try Runner(parameter: parameter)

        let promise = req.eventLoop.makePromise(of: ExecutionResponse.self)
        try runner.run(
            application: app,
            onComplete: { (response) in
                promise.succeed(response)
            },
            onTimeout: { (response) in
                promise.succeed(response)
            }
        )

        req.logger.info("=====")
        req.logger.info("\((try? FileManager().contentsOfDirectory(atPath: "\(app.directory.resourcesDirectory)")) ?? [])")
        req.logger.info("\((try? FileManager().contentsOfDirectory(atPath: "\(app.directory.resourcesDirectory)Temp/")) ?? [])")
        let timer = DispatchSource.makeTimerSource()
        let wrapped = ObjectWrapper(timer)
        var counter = 0
        timer.setEventHandler {
            counter += 1
            req.logger.info("\((try? FileManager().contentsOfDirectory(atPath: "\(app.directory.resourcesDirectory)Temp/")) ?? [])")
            if counter >= 10 {
                timer.cancel()
                if let index = timers.firstIndex(where: { $0 === wrapped }) {
                    timers.remove(at: index)
                    req.logger.info("timers: \(timers.count)")
                }
            }
        }
        timer.schedule(deadline: .now() + .milliseconds(500), repeating: .milliseconds(500))
        timer.activate()
        timers.append(wrapped)

        return promise.futureResult
    }

    app.webSocket("ws", ":nonce", "run") { (req, ws) in
        guard let nonce = req.parameters.get("nonce") else {
            _ = ws.close()
            return
        }

        let timer = DispatchSource.makeTimerSource()
        timer.setEventHandler {
            guard let contents = try? FileManager().contentsOfDirectory(atPath: "\(app.directory.resourcesDirectory)Temp/") else {
                return
            }

            let prefix = "\(nonce)_"
            guard let directory = contents.first(where: { $0.hasPrefix(prefix)}) else { return }

            let path = URL(fileURLWithPath: "\(app.directory.resourcesDirectory)Temp/\(directory)")
            let completedPath = path.appendingPathComponent("completed")
            let stdoutPath = path.appendingPathComponent("stdout")
            let stderrPath = path.appendingPathComponent("stderr")
            let versionPath = path.appendingPathComponent("version")

            guard let version = (try? String(contentsOf: versionPath)) else { return }

            let stdout = (try? String(contentsOf: stdoutPath)) ?? ""
            let stderr = (try? String(contentsOf: stderrPath)) ?? ""

            let encoder = JSONEncoder()
            if let response = try? String(data: encoder.encode(ExecutionResponse(output: stdout, errors: stderr, version: version)), encoding: .utf8) {
                ws.send(response)
            }

            if let _ = (try? String(contentsOf: completedPath)) {
                timer.cancel()
                _ = ws.close()
            }
        }
        timer.schedule(deadline: .now() + .milliseconds(200), repeating: .milliseconds(200))
        timer.resume()

        _ = ws.onClose.always { _ in
            timer.cancel()
        }
    }

    app.webSocket("ws", "echo") { (req, ws) in
        ws.onText { (ws, text) in
            ws.send(text)
        }
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

    app.get("versions") { (req) in try availableVersions() }
}

private func handleImportContent(_ req: Request, _ promise: EventLoopPromise<Response>,
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
                ogpImageUrl: "https://swiftfiddle.com/\(id).png",
                packageInfo: swiftPackageInfo(req.application)
            )
        )
        .encodeResponse(for: req)
        .cascade(to: promise)
    }
}

private func handleEmbeddedContent(_ req: Request, _ promise: EventLoopPromise<Response>,
                                   _ id: String, _ code: String, _ swiftVersion: String?,
                                   _ foldRanges: [FoldRange]) throws {
    req.view.render(
        "embedded", EmbeddedPageResponse(
            title: "Swift Playground",
            versions: try VersionGroup.grouped(versions: availableVersions()),
            stableVersion: swiftVersion ?? stableVersion(),
            latestVersion: try latestVersion(),
            codeSnippet: code,
            url: "https://swiftfiddle.com/\(id)",
            foldRanges: foldRanges
        )
    )
    .encodeResponse(for: req)
    .cascade(to: promise)
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

private func swiftPackageInfo(_ app: Application) -> [PackageInfo] {
    let packagePath = URL(fileURLWithPath: "\(app.directory.resourcesDirectory)Views/Package.json")
    let decoder = JSONDecoder()
    do {
        let package = try decoder.decode(Package.self, from: Data(contentsOf: packagePath))
        guard let target = package.targets.first else { return [] }
        return zip(package.dependencies, target.dependencies).compactMap { (dependency, target) -> PackageInfo? in
            guard let product = target.product.first, let productName = product else { return nil }
            guard let range = dependency.requirement.range.first else { return nil }
            return PackageInfo(
                url: dependency.url,
                name: dependency.name,
                productName: productName,
                version: range.lowerBound
            )
        }

    } catch {
        return []
    }
}

private struct ExecutionRequestParameter: Decodable {
    let toolchain_version: String?
    let command: String?
    let options: String?
    let code: String?
    let timeout: Int?
    let _color: Bool?
    let _nonce: String?
}

private struct SharedLinkRequestParameter: Decodable {
    let toolchain_version: String
    let code: String
}

private struct InitialPageResponse: Encodable {
    let title: String
    let versions: [VersionGroup]
    let stableVersion: String
    let latestVersion: String
    let codeSnippet: String
    let ogpImageUrl: String
    let packageInfo: [PackageInfo]
}

private struct PackageInfo: Encodable {
    let url: String
    let name: String
    let productName: String
    let version: String
}

private struct EmbeddedPageResponse: Encodable {
    let title: String
    let versions: [VersionGroup]
    let stableVersion: String
    let latestVersion: String
    let codeSnippet: String
    let url: String
    let foldRanges: [FoldRange]
}

private struct FoldRange: Codable {
    let start: Int
    let end: Int
}

private final class VersionGroup: Encodable {
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

private struct ExecutionResponse: Content {
    let output: String
    let errors: String
    let version: String
}

private func latestVersion() throws -> String { try availableVersions()[0] }
private func stableVersion() -> String { "5.4" }

private let defaultCodeSnippet = #"""
import Foundation

func greet(_ something: String) -> String {
  let greeting = "Hello, " + something + "!"
  return greeting
}

// Prints "Hello, World!"
print(greet("World"))

// Prints "Hello, Swift!"
print(greet("Swift"))

"""#

private struct Runner {
    private let parameter: Parameter

    init(parameter: ExecutionRequestParameter) throws {
        self.parameter = try Parameter(parameter: parameter)
    }

    func run(
        application app: Application,
        onComplete: @escaping (ExecutionResponse) -> Void,
        onTimeout: @escaping (ExecutionResponse) -> Void
    ) throws {
        let command = parameter.command
        let options = parameter.options
        let timeout = parameter.timeout
        let nonce = parameter.nonce
        let envVars = parameter.environment
        let image = parameter.image
        let code = parameter.code

        let sandboxPath = URL(fileURLWithPath: "\(app.directory.resourcesDirectory)Sandbox")
        let random = UUID().uuidString
        let directory = "\(nonce)_\(random)"
        let temporaryPath = URL(fileURLWithPath: "\(app.directory.resourcesDirectory)Temp/\(directory)")

        let fileManager = FileManager()
        do {
            try fileManager.copyItem(at: sandboxPath, to: temporaryPath)
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
                "\(Environment.get("HOST_PWD") ?? app.directory.workingDirectory)Resources/Temp/\(directory):/[REDACTED]",
                image,
                "sh",
                "/[REDACTED]/run.sh",
                [command, options].joined(separator: " "),
                environment: envVars
            )
            try process.launch()
        } catch {
            try? fileManager.removeItem(at: temporaryPath)
            throw error
        }

        observe(workspace: temporaryPath, timeout: timeout, onComplete: onComplete, onTimeout: onTimeout)
    }

    private func observe(
        workspace path: URL, timeout: Int,
        onComplete: @escaping (ExecutionResponse) -> Void,
        onTimeout: @escaping (ExecutionResponse) -> Void
    ) {
        let interval = 0.2
        var counter: Double = 0
        let timer = DispatchSource.makeTimerSource()

        let completedPath = path.appendingPathComponent("completed")
        let stdoutPath = path.appendingPathComponent("stdout")
        let stderrPath = path.appendingPathComponent("stderr")
        let versionPath = path.appendingPathComponent("version")

        let fileManager = FileManager()
        timer.setEventHandler {
            counter += 1
            if let completed = try? String(contentsOf: completedPath) {
                let stderr = (try? String(contentsOf: stderrPath)) ?? ""
                let version = (try? String(contentsOf: versionPath)) ?? "N/A"

                onComplete(ExecutionResponse(output: completed, errors: stderr, version: version))

                try? fileManager.removeItem(at: path)
                timer.cancel()
            } else if interval * counter < Double(timeout) {
                return
            } else {
                let stdout = (try? String(contentsOf: stdoutPath)) ?? ""

                let stderr = "\((try? String(contentsOf: stderrPath)) ?? "")Maximum execution time of \(timeout) seconds exceeded.\n"
                let version = (try? String(contentsOf: versionPath)) ?? "N/A"

                onTimeout(ExecutionResponse(output: stdout, errors: stderr, version: version))

                try? fileManager.removeItem(at: path)
                timer.cancel()
            }
        }
        timer.schedule(deadline: .now() + .milliseconds(200), repeating: .milliseconds(200))
        timer.resume()
    }

    private struct Parameter {
        let toolchainVersion: String
        let command: String
        let options: String
        let timeout: Int
        let environment: [String: String]
        let image: String
        let code: String
        let nonce: String

        init(parameter: ExecutionRequestParameter) throws {
            var toolchainVersion = parameter.toolchain_version ?? stableVersion()
            if (toolchainVersion == "latest") {
                toolchainVersion = try! latestVersion();
            } else if (toolchainVersion == "stable") {
                toolchainVersion = stableVersion();
            }
            let command = parameter.command ?? "swift"
            let options = parameter.options ??
                (toolchainVersion ==
                    "nightly-main" ? "-Xfrontend -enable-experimental-concurrency -Xfrontend -enable-experimental-async-handler" :
                 toolchainVersion.compare("5.3", options: .numeric) != .orderedAscending ?
                    "-I ./swiftfiddle.com/_Packages/.build/release/ -L ./swiftfiddle.com/_Packages/.build/release/ -l_Packages" :
                    "")
            let timeout = parameter.timeout ?? 60 // Default timeout is 60 seconds
            let color = parameter._color ?? false
            let nonce = parameter._nonce ?? ""

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

            self.toolchainVersion = toolchainVersion
            self.command = command
            self.options = options
            self.timeout = timeout
            self.nonce = nonce
            self.environment = environment
            self.image = image
            self.code = code
        }
    }
}
