import Foundation

struct SharedLinkRequestParameter: Decodable {
    let toolchain_version: String
    let code: String
}
