<p>
<a href="https://github.com/kishikawakatsumi/swift-playground/actions">
<img src="https://github.com/kishikawakatsumi/swift-playground/workflows/CI/badge.svg">
</a>
<img src="https://img.shields.io/badge/os-macOS/Linux-green.svg?style=flat" alt="macOS/Linux">
<a href="http://swift.org">
<img src="https://img.shields.io/badge/swift-5.3-orange.svg?style=flat" alt="Swift 5.3 Compatible">
</a>
<a href="https://github.com/kishikawakatsumi/swift-playground/blob/master/LICENSE">
<img src="https://img.shields.io/badge/license-MIT-yellow.svg?style=flat" alt="MIT">
</a>
</p>

# SwiftFiddle (Swift Online Playground)

SwiftFiddle is an online playground for creating, sharing and embedding Swift fiddles (little Swift programs that run directly in your browser).

<a href="https://swiftfiddle.com"><img width="1280" alt="Screen Shot" src="https://user-images.githubusercontent.com/40610/114289126-6dae6780-9ab0-11eb-877d-ac29614dc053.png"></a>

https://swiftfiddle.com

## Running Locally

```shell
$ docker compose up
```

Then access `127.0.0.0` on your web browser.

## Development

```shell
$ docker compose pull
$ swift run
```

Then access `127.0.0.0:8080` on your web browser.

### Related Projects

- [SwiftFiddle LSP](https://github.com/kishikawakatsumi/swiftfiddle-lsp) (Provide Code Completion powered by [SourceKit-LSP](https://github.com/apple/sourcekit-lsp))
