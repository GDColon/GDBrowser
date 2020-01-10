const crypto = require('crypto');

// Must be 32 characters
let key = process.env.KEY || 
  console.warn('Warning: insecure password encryption key being used. PLEASE set process.env.KEY in production!') || 
  'u-should-use-a-secure-key-but-ok';

// STOLEN from StackOverflow
const encrypt = text => {
  let iv = crypto.randomBytes(16);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(text);

  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

const decrypt = text => {
  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);

  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}

module.exports = {
  savePass(req, res, next) {
    if (req.body.accountID && req.body.password) {
      // Authorization
      const encryptedPass = encrypt(req.body.password);
      res.cookie('accountID', req.body.accountID);
      res.cookie('password', encryptedPass, {
        httpOnly: true
      });
    }
    next();
  },
  getPass(req, res, next) {
    if (req.cookies.accountID && req.cookies.password) {
      if (!req.body.accountID && !req.body.password) {
        req.body.password = decrypt(req.cookies.password);
        req.body.accountID = req.cookies.accountID;
      }
    }
    else if (req.cookies.username || req.cookies.password) {
      res.clearCookie('username');
      res.clearCookie('password');
    }
    next();
  }
}