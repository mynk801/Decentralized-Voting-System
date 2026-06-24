# Decentralized Voting System (Midterm Evaluation)

This repository contains the Midterm Evaluation deliverable for the Decentralized Voting System. It features a fully functional, end-to-end encrypted ballot casting system with a tamper-evident cryptographic ledger.

## Features Completed
- **Client-Side Encryption:** Votes are encrypted on the voter's device using RSA-OAEP before transmission.
- **Tamper-Evident Ledger:** Votes are chained in MongoDB using SHA-256 hashes (similar to a blockchain).
- **Ledger Integrity Verification:** Real-time chain validation to detect tampering.
- **Voter Authentication:** Pass-based authentication (using mock `.json` passes for the midterm).

## Prerequisites
1. **Node.js** (v16 or higher)
2. **MongoDB** (running locally on port 27017)

## Setup Instructions

### 1. Install Dependencies
Open a terminal in the root directory:
```bash
npm install
```

Open another terminal in the `frontend` directory:
```bash
cd frontend
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/dcvs
```

### 3. Generate Encryption Keys
Generate the RSA keypair used for vote encryption. Run this in the root directory:
```bash
node scripts/generateKeys.js
```
*(This will create `keys/private.pem` and `keys/public.pem`)*

### 4. Generate Mock Voter Passes
Generate a few mock voter passes to test the system:
```bash
node scripts/generateMockPass.js
```
*(Run this multiple times to generate multiple `.json` pass files in the `mock-passes/` folder)*

---

## Running the Application

**Start the Backend Server (Terminal 1):**
```bash
# In the root directory
npm run dev
```
*(Runs on `http://localhost:5000`)*

**Start the Frontend Server (Terminal 2):**
```bash
# In the frontend directory
npm run dev
```
*(Runs on `http://localhost:5173`)*

---

## How to Test
1. Open `http://localhost:5173` in your browser.
2. Upload one of the generated `.json` files from the `mock-passes/` folder.
3. Once verified, you will be redirected to the ballot.
4. Select a candidate and cast your vote.
5. Your vote will be encrypted, stored in MongoDB, and linked to the cryptographic chain.
6. The Home page will show a "Ledger Integrity" badge indicating the chain is intact.
