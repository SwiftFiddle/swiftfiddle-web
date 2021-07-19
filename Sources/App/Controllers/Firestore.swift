import Vapor

private let projectId = Environment.get("GCP_PROJECT")!
private let apiKey = Environment.get("FIREBASE_API_KEY")!
private let refreshToken = Environment.get("FIREBASE_REFRESH_TOKEN")!

struct Firestore {
    static func documentsGet(client: Client, id: String) throws -> EventLoopFuture<Document?> {
        return try refreshAccessToken(client: client)
            .map { $0?.access_token }
            .optionalFlatMap { (token) -> EventLoopFuture<Document?> in
                return client.get(
                    "https://firestore.googleapis.com/v1/projects/\(projectId)/databases/(default)/documents/code_snippets/\(id)?key=\(apiKey)",
                    headers: [
                        "Authorization": "Bearer \(token)",
                        "Accept": "application/json",
                    ]
                )
                .map { $0.body }
                .optionalFlatMapThrowing {
                    let decoder = JSONDecoder()
                    decoder.dateDecodingStrategy = .formatted(Document.dateFormatter)
                    return try $0.getJSONDecodable(Document.self, decoder: decoder, at: 0, length: $0.readableBytes)
                }
            }
    }
    
    static func createDocument(client: Client, id: String, type: String = "plain_text", code: String, swiftVersion: String) throws -> EventLoopFuture<Document?> {
        return try refreshAccessToken(client: client)
            .map { $0?.access_token }
            .optionalFlatMap { (token) -> EventLoopFuture<Document?> in
                return client.post(
                    "https://firestore.googleapis.com/v1/projects/\(projectId)/databases/(default)/documents/code_snippets/?documentId=\(id)&key=\(apiKey)",
                    headers: [
                        "Authorization": "Bearer \(token)",
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                    ]
                ) {
                    try $0.content.encode(
                        ["fields": DocumentFields(
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
                        )],
                        as: .json
                    )
                }
                .map { $0.body }
                .optionalFlatMapThrowing {
                    let decoder = JSONDecoder()
                    decoder.dateDecodingStrategy = .formatted(Document.dateFormatter)
                    return try $0.getJSONDecodable(Document.self, decoder: decoder, at: 0, length: $0.readableBytes)
                }
            }
    }

    private static func refreshAccessToken(client: Client) throws -> EventLoopFuture<Token?> {
        return client.post("https://securetoken.googleapis.com/v1/token?key=\(apiKey)", headers: ["Content-Type": "application/x-www-form-urlencoded"]) {
            try $0.content.encode(
                ["grant_type": "refresh_token",
                 "refresh_token": refreshToken,
                ],
                as: .urlEncodedForm
            )
        }
        .map { $0.body }
        .optionalFlatMapThrowing { try $0.getJSONDecodable(Token.self, at: 0, length: $0.readableBytes) }
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
