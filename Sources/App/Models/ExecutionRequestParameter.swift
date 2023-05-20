import Foundation

struct ExecutionRequestParameter: Decodable {
  let toolchain_version: String?
  let command: String?
  let options: String?
  let code: String?
  let timeout: Int?
  let _color: Bool?
  let _nonce: String?
}
