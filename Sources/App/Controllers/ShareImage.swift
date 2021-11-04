import Vapor

struct ShareImage {
    @available(macOS 12.0.0, *)
    static func generate(client: Client, from code: String) async throws -> Data? {
        let code = code
            .replacingOccurrences(of: #"\"#, with: #"\\"#)
            .replacingOccurrences(of: #"""#, with: #"\""#)
            .split(separator: "\n", omittingEmptySubsequences: false)
            .prefix(30)
            .joined(separator: #"\n"#)
        let state = #"""
                {
                    "paddingVertical": "0px",
                    "paddingHorizontal": "0px",
                    "backgroundImage": null,
                    "backgroundImageSelection": null,
                    "backgroundMode": "color",
                    "backgroundColor": "rgba(255, 255, 255, 0)",
                    "dropShadow": false,
                    "dropShadowOffsetY": "20px",
                    "dropShadowBlurRadius": "68px",
                    "theme": "one-light",
                    "windowTheme": "none",
                    "language": "swift",
                    "fontFamily": "Hack",
                    "fontSize": "14px",
                    "lineHeight": "133%",
                    "windowControls": true,
                    "widthAdjustment": true,
                    "lineNumbers": false,
                    "firstLineNumber": 1,
                    "exportSize": "2x",
                    "watermark": false,
                    "squaredImage": false,
                    "hiddenCharacters": false,
                    "name": "",
                    "width": 680,
                    "code": "\#(code)"
                }
                """#
            .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)?
            .data(using: .utf8)?
            .base64EncodedString()

        var request = ClientRequest(
            method: .POST,
            url: "https://carbon.now.sh/api/image",
            headers: ["Origin": "https://swiftfiddle.com"]
        )
        try request.content.encode(["state": state], as: .json)
        let response = try await client.send(request)

        guard let body = response.body, let string = body.getString(at: 0, length: body.readableBytes, encoding: .utf8) else { return nil }

        let base64Encoded = string.replacingOccurrences( of: "data:image/png;base64,", with: "")
        guard let data = Data(base64Encoded: base64Encoded, options: []) else { return nil }

        return data
    }
}
