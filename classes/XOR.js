//https://nodejs.org/docs/latest/api/buffer.html#buffers-and-character-encodings
//both only work on "binary strings" and "URI-safe B64"
let toB64 = str => Buffer.from(str).toString('base64url')
let fromB64 = str => Buffer.from(str, 'base64').toString()

const defKey = 37526

module.exports = class XOR {
    xor(str, key) {
        key = key.toString()
        return String.fromCodePoint(...str.split('')
            .map((c, i) => c.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
    }
    encrypt(str, key = defKey) { return toB64(this.xor(str, key)) }
    decrypt(str, key = defKey) { return this.xor(fromB64(str), key) }
}