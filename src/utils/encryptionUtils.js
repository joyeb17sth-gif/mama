import CryptoJS from 'crypto-js';

// Get encryption key from environment variable, with fallback for development
const getSecretKey = () => {
    const envKey = import.meta.env.VITE_ENCRYPTION_KEY;
    if (!envKey) {
        throw new Error('CRITICAL: VITE_ENCRYPTION_KEY is not set in environment variables!');
    }
    return envKey;
};

const SECRET_KEY = getSecretKey();

export const encryptData = (data) => {
    try {
        return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
    } catch (e) {
        if (import.meta.env.DEV) console.error('Encryption failed', e);
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
        // Fallback for migration: try parsing as unencrypted JSON
        try {
            return JSON.parse(ciphertext);
        } catch (e2) {
            return null;
        }
    }
};
