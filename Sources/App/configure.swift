import Vapor
import Leaf
import Bugsnag

private let bugsnagApiKey = Environment.get("BUGSNAG_API_KEY")

public func configure(_ app: Application) throws {
    app.middleware = Middlewares()
    app.middleware.use(CommonErrorMiddleware())
    app.middleware.use(CustomHeaderMiddleware())
    let publicDirectory = "\(app.directory.publicDirectory)/dist"
    app.middleware.use(FileMiddleware(publicDirectory: publicDirectory))

    if let bugsnagApiKey = bugsnagApiKey {
        app.bugsnag.configuration = BugsnagConfiguration(
            apiKey: bugsnagApiKey,
            releaseStage: app.environment.name,
            shouldReport: app.environment.name != "local"
        )
        app.middleware.use(BugsnagMiddleware())
    }

    app.http.server.configuration.supportPipelining = true
    app.http.server.configuration.requestDecompression = .enabled
    app.http.server.configuration.responseCompression = .enabled

    app.caches.use(.memory)

    app.views.use(.leaf)
    app.leaf.configuration.rootDirectory = publicDirectory
    app.leaf.cache.isEnabled = app.environment.isRelease

    try routes(app)
}
