import All
import SwiftyMath
import SwiftyTopology

let S = SimplicialComplex.sphere(dim:3)
let H = Homology(S, Int.self)

print(H.detailDescription)

let all = All()
print(all.text)

import Foundation
import RxSwift

_ = Observable<String>.create { observerOfString in
    print("Observable created")
    observerOfString.on(.next("😉"))
    observerOfString.on(.completed)
    return Disposables.create()
    }
    .subscribe { event in
        print(event)
}

import CryptoSwift

let data = Data(bytes: [0x01, 0x02, 0x03])
let bytes = data.bytes
print(bytes)

print(Array<UInt8>(hex: "0x010203"))
print(bytes.toHexString())

print("123".md5())
