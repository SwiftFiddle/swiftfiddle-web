import Foundation
import Vapor

struct ExecutionResponse: Content {
    let output: String
    let errors: String
    let version: String
}
