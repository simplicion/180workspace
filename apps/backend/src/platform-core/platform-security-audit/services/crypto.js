'use strict';

const crypto = require('crypto');

const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || 'default_32_char_key_must_change!!').slice(0, 32);
const IV_LENGTH = 16;

function encrypt(text) {
    if (!text) return '';
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!text || !text.includes(':')) return text;
    try {
        const [ivHex, encHex] = text.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const encBuf = Buffer.from(encHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encBuf);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch {
        return '';
    }
}

module.exports = {
    encrypt,
    decrypt
};
