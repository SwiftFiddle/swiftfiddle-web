import XCTest
@testable import All

final class AllTests: XCTestCase {
    func testExample() {
        // This is an example of a functional test case.
        // Use XCTAssert and related functions to verify your tests produce the correct
        // results.
        XCTAssertEqual(All().text, "Hello, World!")
    }


    static var allTests = [
        ("testExample", testExample),
    ]
}
