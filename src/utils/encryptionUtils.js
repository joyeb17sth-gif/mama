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
const LEGACY_SECRET_KEY = 'payscleep-dev-key-not-for-production';

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
        // Fallback for migration (trying legacy decryption key or unencrypted JSON)
        try {
            const legacyBytes = CryptoJS.AES.decrypt(ciphertext, LEGACY_SECRET_KEY);
            const legacyDecrypted = JSON.parse(legacyBytes.toString(CryptoJS.enc.Utf8));
            return legacyDecrypted;
        } catch (e2) {
            try {
                return JSON.parse(ciphertext);
            } catch (e3) {
                return null;
            }
        }
    }
};

export const hashPassword = (password) => {
    return CryptoJS.SHA256(password).toString();
};
