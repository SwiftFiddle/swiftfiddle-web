import Foundation

private let chars: [UInt8] = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".utf8)

struct Base32 {
  static func encoode(bytes: [UInt8]) -> String? {
    let length = bytes.count
    var result = [UInt8](repeating: 0, count: 26);

    var count = 0
    var buffer = Int(bytes[0])
    var next = 1
    var bitsLeft: Int8 = 8
    while bitsLeft > 0 || next < length {
      if bitsLeft < 5 {
        if next < length {
          buffer <<= 8;
          buffer |= Int(bytes[next] & 0xFF);
          next += 1
          bitsLeft += 8;
        } else {
          let pad = Int8(5 - bitsLeft);
          buffer <<= pad;
          bitsLeft += pad;
        }
      }
      let index = Int(0x1F & (buffer >> Int8(bitsLeft - 5)))
      bitsLeft -= 5;
      result[count] = chars[index]
      count += 1
    }

    return String(bytes: result, encoding: .ascii)
  }
}

func convertHexToBytes(_ str: String) -> [UInt8] {
  let values = str.compactMap { $0.hexDigitValue } // map char to value of 0-15 or nil
  var bytes = [UInt8]()
  for x in stride(from: 0, to: values.count, by: 2) {
    let byte = (values[x] << 4) + values[x+1] // concat high and low bits
    bytes.append(UInt8(byte))
  }
  return bytes
}
