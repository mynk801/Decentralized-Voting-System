/**
 * generateKeys.js
 * 
 * Generates an RSA key pair for the voting system.
 * - The PUBLIC key is served to the frontend so it can encrypt votes.
 * - The PRIVATE key stays on the server to decrypt votes (for tallying later).
 * 
 * Usage:  node scripts/generateKeys.js
 * Output: keys/public.pem  &  keys/private.pem
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KEYS_DIR = path.join(__dirname, '..', 'keys');

// Ensure the keys directory exists
if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
}

console.log('Generating RSA-2048 key pair...');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});

fs.writeFileSync(path.join(KEYS_DIR, 'public.pem'), publicKey);
fs.writeFileSync(path.join(KEYS_DIR, 'private.pem'), privateKey);

console.log('✅ Keys generated successfully!');
console.log(`   Public key:  ${path.join(KEYS_DIR, 'public.pem')}`);
console.log(`   Private key: ${path.join(KEYS_DIR, 'private.pem')}`);
console.log('\n⚠️  Keep private.pem SECRET. Never commit it to version control.');
