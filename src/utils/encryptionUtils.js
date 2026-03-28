import CryptoJS from 'crypto-js';

// Get encryption key from environment variable, with fallback for development
const getSecretKey = () => {
    const envKey = import.meta.env.VITE_ENCRYPTION_KEY;
    if (!envKey && import.meta.env.PROD) {
        console.error('CRITICAL: VITE_ENCRYPTION_KEY is not set in production!');
    }
    return envKey || 'sitalpayslip-dev-key-not-for-production';
};

const SECRET_KEY = getSecretKey();

export const encryptData = (data) => {
    try {
        return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
    } catch (e) {
        console.error('Encryption failed', e);
        return null;
    }
};

export const decryptData = (ciphertext) => {
    if (!ciphertext) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        return decryptedData;
    } catch (e) {
        // Fallback: mostly for migration if data was previously unencrypted
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
