import Vapor

private let projectId = Environment.get("GCP_PROJECT")!
private let apiKey = Environment.get("FIREBASE_API_KEY")!
private let refreshToken = Environment.get("FIREBASE_REFRESH_TOKEN")!

struct Firestore {
    static func documentsGet(client: Client, id: String) async throws -> Document {
        let token = try await refreshAccessToken(client: client)
        let request = ClientRequest(
            method: .GET,
            url: "https://firestore.googleapis.com/v1/projects/\(projectId)/databases/(default)/documents/code_snippets/\(id)?key=\(apiKey)",
            headers: [
                "Authorization": "Bearer \(token.access_token)",
                "Accept": "application/json",
            ]
        )
        let response = try await client.send(request)
        guard let body = response.body else { throw Abort(.notFound) }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .formatted(Document.dateFormatter)
        let document = try body.getJSONDecodable(Document.self, decoder: decoder, at: 0, length: body.readableBytes)

        guard let document = document else { throw Abort(.internalServerError) }
        return document
    }

    static func createDocument(client: Client, id: String, type: String = "plain_text", code: String, swiftVersion: String) async throws -> Document {
        let token = try await refreshAccessToken(client: client)
        let url = URI(
            string: "https://firestore.googleapis.com/v1/projects/\(projectId)/databases/(default)/documents/code_snippets/?documentId=\(id)&key=\(apiKey)"
        )
        var request = ClientRequest(
            method: .POST,
            url: url,
            headers: [
                "Authorization": "Bearer \(token.access_token)",
                "Accept": "application/json",
                "Content-Type": "application/json",
            ]
        )
        let fields = DocumentFields(
            type: DocumentField(stringValue: type),
            id: DocumentField(stringValue: id),
            shared_link: DocumentSharedLink(
                mapValue: DocumentSharedLinkMapValue(
                    fields: DocumentSharedLinkMapValueFields(
                        content: DocumentField(stringValue: code),
                        swift_version: DocumentField(stringValue: swiftVersion),
                        url: DocumentField(stringValue: "https://swiftfiddle.com/\(id)")
                    )
                )
            )
        )
        try request.content.encode(
            ["fields": fields],
            as: .json
        )
        let response = try await client.send(request)
        guard let body = response.body else { throw Abort(.notFound) }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .formatted(Document.dateFormatter)
        let document = try body.getJSONDecodable(Document.self, decoder: decoder, at: 0, length: body.readableBytes)

        guard let document = document else { throw Abort(.internalServerError) }
        return document
    }

    private static func refreshAccessToken(client: Client) async throws -> Token {
        var request = ClientRequest(
            method: .POST,
            url: "https://securetoken.googleapis.com/v1/token?key=\(apiKey)",
            headers: ["Content-Type": "application/x-www-form-urlencoded"]
        )
        try request.content.encode(
            ["grant_type": "refresh_token", "refresh_token": refreshToken],
            as: .urlEncodedForm
        )
        let response = try await client.send(request)

        guard let body = response.body else { throw Abort(.internalServerError) }
        guard let token = try body.getJSONDecodable(Token.self, at: 0, length: body.readableBytes) else { throw Abort(.internalServerError) }

        return token
    }
}

struct Document: Codable {
    let name: String
    let fields: DocumentFields
    let createTime: Date
    let updateTime: Date

    static var dateFormatter: DateFormatter = {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SZ"
        return dateFormatter
    }()
}

struct DocumentFields: Codable {
    let type: DocumentField
    let id: DocumentField
    let shared_link: DocumentSharedLink
}

struct DocumentSharedLink: Codable {
    let mapValue: DocumentSharedLinkMapValue
}

struct DocumentSharedLinkMapValue: Codable {
    let fields: DocumentSharedLinkMapValueFields
}

struct DocumentSharedLinkMapValueFields: Codable {
    let content: DocumentField
    let swift_version: DocumentField
    let url: DocumentField
}

struct DocumentField: Codable {
    let stringValue: String
}

private struct Token: Codable {
    let access_token: String
    let expires_in: String
    let token_type: String
    let refresh_token: String
    let id_token: String
    let user_id: String
    let project_id: String
}
