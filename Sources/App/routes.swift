import Vapor

func routes(_ app: Application) throws {
  app.get("health") { _ in ["status": "pass"] }

  app.get { (req) in try await index(req) }
  app.get("index.html") { (req) in try await index(req) }
  func index(_ req: Request) async throws -> View {
    try await req.view.render(
      "index",
      InitialPageResponse(
        title: "Swift Playground",
        versions: try VersionGroup.grouped(versions: availableVersions()),
        stableVersion: stableVersion(),
        latestVersion: try latestVersion(),
        codeSnippet: escape(defaultCodeSnippet),
        ogpImageUrl: "https://swiftfiddle.com/images/ogp_small.png",
        packageInfo: swiftPackageInfo(app)
      )
    )
  }

  app.get(":id") { req -> Response in
    if let path = req.parameters.get("id"), let id = try SharedLink.id(from: path) {
      let content = try await SharedLink.content(
        client: req.client,
        id: id.replacingOccurrences(of: ".png", with: "")
      )

      let code = content.fields.shared_link.mapValue.fields.content.stringValue
      let swiftVersion = content.fields.shared_link.mapValue.fields.swift_version.stringValue
      return try await makeImportResponse(req, id, code, swiftVersion)
    } else if let path = req.parameters.get("id"), let id = try Gist.id(from: path) {
      let content = try await Gist.content(
        client: req.client,
        id: id.replacingOccurrences(of: ".png", with: "")
      )

      let code = Array(content.files.values)[0].content
      return try await makeImportResponse(req, id, code, nil)
    } else {
      throw Abort(.notFound)
    }
  }

  app.get(":id", "embedded") { req -> Response in
    let foldRanges: [FoldRange] = req.query[[String].self, at: "fold"]?.compactMap {
      let lines = $0.split(separator: "-")
      guard lines.count == 2 else { return nil }
      guard let start = Int(lines[0]), let end = Int(lines[1]) else { return nil }
      guard start <= end else { return nil }
      return FoldRange(start: start, end: end)
    } ?? []

    if let path = req.parameters.get("id"), let id = try SharedLink.id(from: path) {
      let document = try await SharedLink.content(client: req.client, id: id)

      let code = document.fields.shared_link.mapValue.fields.content.stringValue
      let swiftVersion = document.fields.shared_link.mapValue.fields.swift_version.stringValue

      return try await makeEmbeddedResponse(req, id, code, swiftVersion, foldRanges)
    } else if let path = req.parameters.get("id"), let id = try Gist.id(from: path) {
      let content = try await Gist.content(client: req.client, id: id)
      let code = Array(content.files.values)[0].content

      return try await makeEmbeddedResponse(req, id, code, nil, foldRanges)
    } else {
      throw Abort(.notFound)
    }
  }

  app.on(.POST, "shared_link", body: .collect(maxSize: "10mb")) { (req) -> [String: String] in
    let parameter = try req.content.decode(SharedLinkRequestParameter.self)
    let code = parameter.code
    let swiftVersion = parameter.toolchain_version

    guard let id = Base32.encoode(bytes: convertHexToBytes(UUID().uuidString.replacingOccurrences(of: "-", with: "")))?.lowercased() else { throw Abort(.internalServerError) }

    _ = try await Firestore.createDocument(
      client: req.client,
      id: id,
      code: parameter.code,
      swiftVersion: swiftVersion
    )
    if let data = try? await ShareImage.generate(client: req.client, from: code) {
      try? await req.cache.set("/\(id).png", to: data, expiresIn: .days(14))
    }
    return [
      "swift_version": swiftVersion,
      "content": code,
      "url": "https://swiftfiddle.com/\(id)",
    ]
  }

  app.get("versions") { (req) in try availableVersions() }

  app.on(.POST, "run", body: .collect(maxSize: "10mb")) { (req) -> ClientResponse in
    guard let data = req.body.data else { throw Abort(.badRequest) }
    guard let parameter = try? req.content.decode(ExecutionRequestParameter.self) else {
      throw Abort(.badRequest)
    }
    let version = parameter.toolchain_version ?? stableVersion()

    let url = URI(scheme: .https, host: "swiftfiddle.com", path: "/runner/\(version)/run")
    let clientRequest = ClientRequest(
      method: .POST,
      url: url,
      headers: HTTPHeaders([("Content-type", "application/json")]),
      body: data
    )

    return try await req.client.send(clientRequest)
  }

  app.on(.POST, "runner", "*", "run", body: .collect(maxSize: "10mb")) { (req) -> ClientResponse in
    guard let data = req.body.data else { throw Abort(.badRequest) }
    let latestVersion = (try? latestVersion()) ?? stableVersion()

    let path: String
    if req.url.path.contains("/stable/") {
      path = "/runner/\(stableVersion())/run"
    } else if req.url.path.contains("/latest/") {
      path = "/runner/\(latestVersion)/run"
    } else {
      path = req.url.path
    }

    let clientRequest = ClientRequest(
      method: .POST,
      url: URI(scheme: .https, host: "swiftfiddle.com", path: path),
      headers: HTTPHeaders([("Content-type", "application/json")]),
      body: data
    )
    return try await req.client.send(clientRequest)
  }
}

private func makeImportResponse(_ req: Request, _ id: String, _ code: String, _ swiftVersion: String?) async throws -> Response {
  let path = req.url.path
  if path.hasSuffix(".png") {
    if let data = try await req.cache.get(path, as: Data.self) {
      return Response(
        status: .ok,
        headers: ["Content-Type": "image/png"],
        body: Response.Body(buffer: ByteBuffer(data: data))
      )
    } else {
      guard let data = try await ShareImage.generate(client: req.client, from: code) else { throw Abort(.notFound) }
      try? await req.cache.set(path, to: data, expiresIn: .days(14))
      return Response(
        status: .ok,
        headers: ["Content-Type": "image/png"],
        body: Response.Body(buffer:  ByteBuffer(data: data))
      )
    }
  } else {
    let version: String
    if let swiftVersion = swiftVersion {
      if swiftVersion == "nightly-master" {
        version = "nightly-main"
      } else {
        version = swiftVersion
      }
    } else {
      version = stableVersion()
    }
    return try await req.view.render(
      "index", InitialPageResponse(
        title: "Swift Playground",
        versions: try VersionGroup.grouped(versions: availableVersions()),
        stableVersion: version,
        latestVersion: try latestVersion(),
        codeSnippet: escape(code),
        ogpImageUrl: "https://swiftfiddle.com/\(id).png",
        packageInfo: swiftPackageInfo(req.application)
      )
    )
    .encodeResponse(for: req)
  }
}

private func makeEmbeddedResponse(_ req: Request, _ id: String, _ code: String, _ swiftVersion: String?, _ foldRanges: [FoldRange]) async throws -> Response {
  return try await req.view.render(
    "embedded", EmbeddedPageResponse(
      title: "Swift Playground",
      versions: try VersionGroup.grouped(versions: availableVersions()),
      stableVersion: swiftVersion ?? stableVersion(),
      latestVersion: try latestVersion(),
      codeSnippet: escape(code),
      url: "https://swiftfiddle.com/\(id)",
      foldRanges: foldRanges
    )
  )
  .encodeResponse(for: req)
}

private func swiftPackageInfo(_ app: Application) -> [PackageInfo] {
  let packagePath = URL(fileURLWithPath: app.directory.resourcesDirectory).appendingPathComponent("Package.swift.json")
  let decoder = JSONDecoder()
  do {
    let package = try decoder.decode(Package.self, from: Data(contentsOf: packagePath))
    guard let target = package.targets.first else { return [] }
    return zip(package.dependencies, target.dependencies).compactMap { (dependency, target) -> PackageInfo? in
      guard let product = target.product.first, let productName = product else { return nil }
      guard let sourceControl = dependency.sourceControl.first else { return nil }
      guard let range = sourceControl.requirement.range.first else { return nil }
      return PackageInfo(
        url: sourceControl.location.remote.first ?? "",
        name: sourceControl.identity,
        productName: productName,
        version: range.lowerBound
      )
    }

  } catch {
    return []
  }
}

private func escape(_ s: String) -> String {
  s
    .replacingOccurrences(of: #"\"#, with: #"\\"#)
    .replacingOccurrences(of: #"`"#, with: #"\`"#)
}

private let defaultCodeSnippet = #"""
import Foundation

let hello = "Hello, world!"
let multilineString = """
                  @@@
      @@          @@@@
    @@  @@@         @@@@@
    @@@@@@@@@       @@@@@
      @@@@@@@@@@    @@@@@@
        @@@@@@@@@@  @@@@@@
          @@@@@@@@@@@@@@@@@
@           @@@@@@@@@@@@@@@
@@@@@@        @@@@@@@@@@@@@
  @@@@@@@@@@@@@@@@@@@@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@
        @@@@@@@@@@@@@     @
                      \(hello)
"""

print(multilineString)

"""#
