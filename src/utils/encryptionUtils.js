import CryptoJS from 'crypto-js';

const SECRET_KEY = 'payscleep-secure-key-v1'; // In a real app, this might come from env or user input

export const encryptData = (data) => {
    try {
        return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
    } catch (e) {
        console.error('Encryption failed', e);
        return null;
    }
};

export const decryptData = (ciphertext) => {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        return decryptedData;
    } catch (e) {
        // Fallback: mostly for migration if data was previously unencrypted
        // If JSON.parse fails on the raw string, it might be the old plain JSON
        try {
            return JSON.parse(ciphertext);
        } catch (e2) {
            return null;
        }
    }
};

export const hashPassword = (password) => {
    return CryptoJS.SHA256(password).toString();
};
