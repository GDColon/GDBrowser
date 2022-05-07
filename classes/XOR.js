module.exports = class XOR {
    xor(str, key) { return String.fromCodePoint(...str.split('').map((char, i) => char.charCodeAt(0) ^ key.toString().charCodeAt(i % key.toString().length))) }
    encrypt(str, key = 37526) { return Buffer.from(this.xor(str, key)).toString('base64').replace(/./gs, c => ({'/': '_', '+': '-'}[c] || c)); }
    decrypt(str, key = 37526) { return this.xor(Buffer.from(str.replace(/./gs, c => ({'/': '_', '+': '-'}[c] || c)), 'base64').toString(), key) }
}
