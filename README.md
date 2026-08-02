# Decentralized Voting System (DCVS)

A secure, end-to-end encrypted electronic voting platform featuring client-side RSA ballot encryption, voter registration, pass-based authentication, and a tamper-evident SHA-256 cryptographic ledger stored in MongoDB.

---

## 🚀 Features

- **Client-Side Vote Encryption**: Votes are encrypted on the voter's device using 2048-bit RSA-OAEP public key encryption before reaching the server. Plaintext choices are never transmitted or stored in the database.
- **Voter Registration Portal**: Only registered users can cast votes. Voters register via the portal (`/register`) to receive an official, cryptographic voter pass `.json` file.
- **Pass-Based Voter Authentication**: Authenticate using the official `.json` voter pass generated upon registration.
- **Single-Use Pass Enforcement**: Consumed pass tokens are registered in a dedicated `UsedToken` collection to strictly enforce the "one person, one vote" rule.
- **Tamper-Evident Ledger**: Every cast ballot is linked to the previous vote using SHA-256 cryptographic hashes (blockchain-inspired hash chaining).
- **Real-Time Ledger Auditing**: Real-time chain validation recalculates hash links across all blocks to detect any unauthorized database tampering immediately.
- **Audit Dashboard**: View live block-by-block hash chains, block indices, and chain integrity status.
- **Admin Dashboard**: Manage election states and system administration.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, React Router v7, Tailwind CSS / Custom Styling
- **Backend**: Node.js, Express.js (REST API)
- **Database**: MongoDB (via Mongoose)
- **Cryptography**: Node Native `crypto` module, `tweetnacl`, RSA-OAEP (2048-bit), SHA-256

---

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **npm** (v8 or higher)
3. **MongoDB** (running locally on `mongodb://localhost:27017`)

---

## ⚙️ Installation & Setup

### 1. Clone & Install Dependencies

**Backend (Root Directory):**
```bash
npm install
```

**Frontend Directory:**
```bash
cd frontend
npm install
cd ..
```

---

### 2. Environment Configuration

Create a `.env` file in the root directory:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/dcvs
```

---

### 3. Generate RSA Keypair

Run this script to generate the 2048-bit RSA keypair used for ballot encryption:
```bash
node scripts/generateKeys.js
```
*(Creates `keys/private.pem` and `keys/public.pem`)*

---

## 🚦 Running the Application

Start the backend and frontend in separate terminal windows:

### Terminal 1: Start Backend Server
In the root directory:
```bash
npm run dev
```
*(Server active on `http://localhost:5000`)*

### Terminal 2: Start Frontend Application
In the `frontend` directory:
```bash
cd frontend
npm run dev
```
*(Vite React app active on `http://localhost:5173`)*

---

## 🗺️ Application Routes

| Route | Description |
|-------|-------------|
| `/register` | Voter Registration & Pass Generation |
| `/` | Voter Pass Upload & Verification |
| `/vote` | Encrypted Interactive Ballot |
| `/audit` | Public Audit & Ledger Verification Dashboard |
| `/admin` | Admin Dashboard |

---

## 🔌 API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register voter identity & generate voter pass
- `POST /api/auth/verify-pass` — Validate registered voter pass token

### Voting & Ledger (`/api/votes`)
- `GET /api/votes/public-key` — Fetch RSA public key for client encryption
- `POST /api/votes/cast` — Cast an encrypted ballot & chain to ledger
- `GET /api/votes/verify-chain` — Perform real-time cryptographic audit on the ledger

### Admin (`/api/admin`)
- `GET /api/admin/state` — Get election status
- `POST /api/admin/toggle` — Update election state

---

## 🧪 Testing Workflow

1. Open `http://localhost:5173/register` in your web browser.
2. Register as a new voter to generate and download your official voter pass `.json` file.
3. Go to the login/pass upload page (`http://localhost:5173/`), upload your registered voter pass `.json` file.
4. Select your candidate on the ballot page and click **Cast Encrypted Vote**.
5. Visit the **Audit Dashboard** (`/audit`) to view the stored blocks, cryptographic hash linkages, and real-time chain verification status.
