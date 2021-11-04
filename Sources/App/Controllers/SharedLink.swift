import Vapor

struct SharedLink {
    static func id(from path: String) throws -> String? {
        guard let pattern = try? NSRegularExpression(pattern: #"^([A-Z2-7]{26}(|.png))$"#, options: [.caseInsensitive]) else {
            throw Abort(.internalServerError)
        }

        let matches = pattern.matches(in: path, options: [], range: NSRange(location: 0, length: path.utf16.count))
        guard matches.count == 1 && matches[0].numberOfRanges == 3 else {
            return nil
        }

        return path
    }

    static func content(client: Client, id: String) async throws -> Document {
        return try await Firestore.documentsGet(client: client, id: id)
    }
}
