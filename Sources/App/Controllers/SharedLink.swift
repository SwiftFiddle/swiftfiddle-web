import Vapor

struct SharedLink {
    static func id(from path: String) throws -> String? {
        guard let pattern = try? NSRegularExpression(pattern: #"^\/([A-Z2-7]{26}(|.png))$"#, options: [.caseInsensitive]) else {
            throw Abort(.internalServerError)
        }

        let matches = pattern.matches(in: path, options: [], range: NSRange(location: 0, length: path.utf16.count))
        guard matches.count == 1 && matches[0].numberOfRanges == 3 else {
            return nil
        }

        return NSString(string: path).substring(with: matches[0].range(at: 1))
    }

    static func content(client: Client, id: String) throws -> EventLoopFuture<Document?> {
        return try Firestore.documentsGet(client: client, id: id)
    }
}
