module.exports = class XOR {
    xor(str, key) { return String.fromCodePoint(...str.split('').map((char, i) => char.charCodeAt(0) ^ key.toString().charCodeAt(i % key.toString().length))) }
    encrypt(str, key = 37526) { return Buffer.from(this.xor(str, key)).toString('base64').replace(/\//g, '_').replace(/\+/g, '-'); }
    decrypt(str, key = 37526) { return this.xor(Buffer.from(str.replace(/\//g, '_').replace(/\+/g, '-'), 'base64').toString(), key) }
}