//converts input base64 into its URL-safe variant
//let toURLsafe = str => str.replace(/./gs, c => ({'/': '_', '+': '-'}[c] || c))
//https://nodejs.org/docs/latest/api/buffer.html#buffers-and-character-encodings
module.exports = class XOR {
    xor(str, key) { return String.fromCodePoint(...str.split('').map((c, i) => c.charCodeAt(0) ^ key.toString().charCodeAt(i % key.toString().length))) }
    encrypt(str, key = 37526) { return Buffer.from(this.xor(str, key)).toString('base64url') }
    decrypt(str, key = 37526) { return this.xor(Buffer.from(str, 'base64').toString(), key) }
}