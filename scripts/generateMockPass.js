/**
 * generateMockPass.js
 * 
 * Generates a mock "Voter Pass" token file that mimics
 * what the Registration module would produce.
 * 
 * Usage:  node scripts/generateMockPass.js
 * Output: mock-passes/voter-pass-<id>.txt
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PASSES_DIR = path.join(__dirname, '..', 'mock-passes');

// Ensure the output directory exists
if (!fs.existsSync(PASSES_DIR)) {
    fs.mkdirSync(PASSES_DIR, { recursive: true });
}

// Generate a unique voter pass
const voterId = crypto.randomBytes(4).toString('hex').toUpperCase();
const token = `MOCK-VOTER-PASS-${voterId}-${crypto.randomBytes(16).toString('hex')}`;

const passContent = JSON.stringify({
    type: 'VOTER_PASS',
    voterId,
    token,
    issuedAt: new Date().toISOString(),
    note: 'This is a MOCK voter pass for midterm testing only.'
}, null, 2);

const filename = `voter-pass-${voterId}.json`;
const filepath = path.join(PASSES_DIR, filename);

fs.writeFileSync(filepath, passContent);

console.log('✅ Mock Voter Pass generated!');
console.log(`   File: ${filepath}`);
console.log(`   Token: ${token}`);
console.log('\nUpload this file on the Pass Upload page to access the ballot.');
