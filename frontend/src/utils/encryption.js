/**
 * encryption.js
 *
 * Client-side vote encryption using the Web Crypto API (RSA-OAEP).
 * The server's public key is fetched once and cached.
 */

const API_BASE = 'http://localhost:5000/api';

let cachedPublicKey = null;

/**
 * Fetches the RSA public key from the backend and imports it
 * into the Web Crypto API for use with RSA-OAEP encryption.
 */
async function getPublicKey() {
    if (cachedPublicKey) return cachedPublicKey;

    const response = await fetch(`${API_BASE}/votes/public-key`);
    if (!response.ok) {
        throw new Error('Failed to fetch public key from server.');
    }

    const { publicKey: pemString } = await response.json();

    // Strip PEM headers and decode base64
    const pemBody = pemString
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\s/g, '');

    const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

    // Import as a CryptoKey
    cachedPublicKey = await window.crypto.subtle.importKey(
        'spki',
        binaryDer.buffer,
        {
            name: 'RSA-OAEP',
            hash: 'SHA-256'
        },
        false,
        ['encrypt']
    );

    return cachedPublicKey;
}

/**
 * Encrypts a vote payload (candidate ID) using the server's RSA public key.
 * Returns a base64-encoded string of the ciphertext.
 *
 * @param {string|number} candidateId - The selected candidate's ID.
 * @returns {Promise<string>} Base64 encoded encrypted payload.
 */
export async function encryptVote(candidateId) {
    const publicKey = await getPublicKey();

    const payload = JSON.stringify({
        candidateId: String(candidateId),
        timestamp: new Date().toISOString(),
        nonce: crypto.randomUUID()
    });

    const encoded = new TextEncoder().encode(payload);

    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        encoded
    );

    // Convert ArrayBuffer to base64 string
    const bytes = new Uint8Array(encrypted);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
