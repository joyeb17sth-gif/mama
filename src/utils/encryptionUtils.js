// =============================================================================
// ⚠️  THIS IS NOT A SECURITY CONTROL.  (See audit §3.2)
// -----------------------------------------------------------------------------
// This module AES-encrypts data blobs with a key read from VITE_ENCRYPTION_KEY.
// Vite INLINES every VITE_* variable into the client bundle at build time, so the
// key is shipped to every browser. Anyone who can fetch a blob can also read the
// bundled key and decrypt it — therefore this provides NO confidentiality against
// an authenticated user or anyone who inspects the shipped JS.
//
// The REAL confidentiality boundary is Postgres Row-Level Security (see
// DATABASE_MASTER_SETUP.sql + FIX_RLS_SELECT_POLICIES.sql, audit §3.1). RLS decides
// who can read which rows; this encryption does not.
//
// What this DOES buy us (and the only reason it's kept):
//   * light at-rest obfuscation of the local IndexedDB / localforage cache so the
//     data isn't sitting in plain text in the browser's storage inspector.
//
// Do NOT add features that rely on this for secrecy. Genuine at-rest encryption
// would require server-side key custody, which a browser-only app cannot provide.
// =============================================================================
import CryptoJS from 'crypto-js';

// Encryption key, inlined into the client bundle by Vite (see banner above — this
// is obfuscation, not a secret). Throws loudly if the build-time env var is missing.
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
