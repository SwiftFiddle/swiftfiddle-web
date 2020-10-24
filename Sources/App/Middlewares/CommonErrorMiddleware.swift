import Vapor

final class CommonErrorMiddleware: Middleware {
    func respond(to request: Request, chainingTo next: Responder) -> EventLoopFuture<Response> {
        return next.respond(to: request).flatMapError { (error) in
            let headers: HTTPHeaders
            let status: HTTPResponseStatus
            let reason: String
            let title: String
            switch error {
            case let abort as AbortError:
                headers = abort.headers
                status = abort.status
                title = abort.reason
            default:
                headers = [:]
                status = .internalServerError
                title = "Internal Server Error"
            }

            return request.view.render("error", [
                "title": title,
                "status": "\(status.code)",
            ])
            .encodeResponse(status: status, headers: headers, for: request)
        }
    }
}
