import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { useDatabase } from '../context/DatabaseContext';

const API_BASE = 'http://localhost:5000/api';

const candidateMeta = [
    { id: 1, name: 'Candidate A', party: 'Progressive Alliance', logo: '/assets/candidate_a.png' },
    { id: 2, name: 'Candidate B', party: 'National Front', logo: '/assets/candidate_b.png' },
    { id: 3, name: 'Candidate C', party: 'Democratic Union', logo: '/assets/candidate_c.png' },
    { id: 4, name: 'Candidate D', party: "People's Party", logo: '/assets/candidate_d.png' },
    { id: 0, name: 'NOTA', party: 'None of the Above', logo: null, isNota: true },
];

export default function AuditDashboardPage() {
    const { isOnline } = useDatabase();

    const [loading, setLoading] = useState(true);
    const [tallyData, setTallyData] = useState(null);
    const [chainData, setChainData] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

    // Receipt verification state
    const [searchHash, setSearchHash] = useState('');
    const [verifyingHash, setVerifyingHash] = useState(false);
    const [receiptResult, setReceiptResult] = useState(null);

    // PDF / Image file upload state
    const [isDragging, setIsDragging] = useState(false);
    const [receiptFileName, setReceiptFileName] = useState('');
    const fileInputRef = useRef(null);

    const fetchAuditData = async (showLoading = true) => {
        if (!isOnline) {
            setLoading(false);
            return;
        }

        if (showLoading) setLoading(true);
        setErrorMsg('');

        try {
            const [tallyRes, chainRes] = await Promise.all([
                fetch(`${API_BASE}/votes/tally`),
                fetch(`${API_BASE}/votes/verify-chain`)
            ]);

            if (!tallyRes.ok) throw new Error('Failed to fetch vote tally.');
            if (!chainRes.ok) throw new Error('Failed to verify chain integrity.');

            const tallyJson = await tallyRes.json();
            const chainJson = await chainRes.json();

            setTallyData(tallyJson);
            setChainData(chainJson);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Audit fetch error:', err);
            setErrorMsg(err.message || 'Error loading audit dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-polling live update every 5 seconds
    useEffect(() => {
        fetchAuditData(true);
        const interval = setInterval(() => {
            fetchAuditData(false);
        }, 5000);
        return () => clearInterval(interval);
    }, [isOnline]);

    const runReceiptVerification = async (hashToVerify) => {
        if (!hashToVerify || !hashToVerify.trim()) return;

        const cleanHash = hashToVerify.trim();
        setVerifyingHash(true);
        setReceiptResult(null);

        try {
            const res = await fetch(`${API_BASE}/votes/receipt/${encodeURIComponent(cleanHash)}`);
            const data = await res.json();

            if (res.ok) {
                setReceiptResult({ success: true, ...data.receipt });
            } else {
                setReceiptResult({ success: false, message: data.message || 'Receipt hash not found in ledger.' });
            }
        } catch (err) {
            setReceiptResult({ success: false, message: 'Network error verifying receipt.' });
        } finally {
            setVerifyingHash(false);
        }
    };

    const handleReceiptSearch = (e) => {
        e.preventDefault();
        runReceiptVerification(searchHash);
    };

    // Helper to decode QR code from an image file using jsQR
    const decodeQrFromImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    if (code && code.data) {
                        resolve(code.data);
                    } else {
                        reject(new Error('No readable QR code found in uploaded file.'));
                    }
                };
                img.onerror = () => reject(new Error('Failed to load image file.'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsDataURL(file);
        });
    };

    // Handle receipt PDF or QR Image file upload
    const handleReceiptFileUpload = async (file) => {
        if (!file || !isOnline) return;

        setReceiptFileName(file.name);
        setVerifyingHash(true);
        setReceiptResult(null);

        try {
            let extractedHash = null;

            // 1. Image formats (.png, .jpg, .jpeg, .webp) -> Decode QR
            if (file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)) {
                const qrText = await decodeQrFromImage(file);
                // QR text is either raw 64-char hash or JSON payload
                const hashMatch = qrText.match(/[a-f0-9]{64}/i);
                extractedHash = hashMatch ? hashMatch[0] : qrText.trim();
            } else {
                // 2. PDF or text file format -> extract 64-char SHA-256 hash
                const text = await file.text();
                const hashMatch = text.match(/[a-f0-9]{64}/i);
                if (hashMatch) {
                    extractedHash = hashMatch[0];
                }
            }

            if (!extractedHash) {
                throw new Error('Could not extract a valid 64-character Vote Hash or QR code from the uploaded file.');
            }

            setSearchHash(extractedHash);
            await runReceiptVerification(extractedHash);
        } catch (err) {
            setReceiptResult({ success: false, message: err.message || 'Failed to read receipt file.' });
            setVerifyingHash(false);
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!isOnline) return;
        const file = e.dataTransfer.files[0];
        handleReceiptFileUpload(file);
    };

    const totalVotes = tallyData?.totalVotes || 0;

    // Calculate candidate percentages & find top leader(s)
    const candidateStats = candidateMeta.map(c => {
        const votes = tallyData?.tally?.[String(c.id)] || 0;
        const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0.0';
        return { ...c, votes, percentage: parseFloat(percentage) };
    });

    const maxVotes = totalVotes > 0 ? Math.max(...candidateStats.map(c => c.votes)) : 0;
    const topCandidates = maxVotes > 0 ? candidateStats.filter(c => c.votes === maxVotes) : [];
    const isTie = topCandidates.length > 1;
    const leaderDisplay = maxVotes === 0 ? 'N/A' : (isTie ? 'Tied' : topCandidates[0].name);

    return (
        <div className="page-container audit-page-container">
            {/* Top Right Refresh Bar */}
            <div className="audit-header-actions">
                <button
                    className="btn btn--outline audit-refresh-btn"
                    onClick={() => fetchAuditData(true)}
                    disabled={loading || !isOnline}
                    id="refresh-audit-btn"
                >
                    {loading ? <span className="spinner"></span> : '🔄 Refresh'}
                </button>
            </div>

            {/* Centered Header */}
            <div className="page-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <span className="page-header__icon" style={{ margin: '0 auto 0.75rem' }}>📊</span>
                <h1 className="page-header__title">Public Audit & Tally Dashboard</h1>
                <p className="page-header__subtitle" style={{ margin: '0 auto', maxWidth: '660px' }}>
                    Real-time cryptographic audit log and decrypted vote distribution. Anyone can independently verify the tamper-evident ledger integrity.
                </p>
            </div>

            {/* Offline & Error Notifications */}
            {!isOnline && (
                <div className="status-bar status-bar--error" style={{ marginBottom: '1.5rem', textAlign: 'center', width: '100%', maxWidth: '980px' }}>
                    🔌 System is currently offline. Audit data may be outdated.
                </div>
            )}

            {errorMsg && (
                <div className="status-bar status-bar--error" style={{ marginBottom: '1.5rem', textAlign: 'center', width: '100%', maxWidth: '980px' }}>
                    ⚠️ {errorMsg}
                </div>
            )}

            {/* Side-by-Side Main Section: Metrics (Left) + Vote Distribution (Right) */}
            <div className="audit-dashboard-grid">
                {/* Left Column: Live Status + Metrics Stack */}
                <div className="audit-left-col">
                    <div className="live-status-pill" style={{ marginBottom: '1rem' }}>
                        <span className="live-status-pill__dot"></span>
                        <span>Live Dashboard</span>
                        {lastUpdated && <span style={{ opacity: 0.65, fontSize: '0.75rem' }}>• {lastUpdated}</span>}
                    </div>

                    <div className="metrics-stack">
                        <div className="metric-card">
                            <span className="metric-card__icon">📥</span>
                            <div>
                                <div className="metric-card__value">{totalVotes}</div>
                                <div className="metric-card__label">Total Ballots Cast</div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <span className="metric-card__icon">🔗</span>
                            <div>
                                <div className="metric-card__value" style={{ color: chainData?.intact ? 'var(--color-accent-success)' : 'var(--color-accent-danger)' }}>
                                    {chainData?.intact ? 'VERIFIED' : 'UNVERIFIED'}
                                </div>
                                <div className="metric-card__label">Ledger Chain Integrity</div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <span className="metric-card__icon">🏆</span>
                            <div>
                                <div className="metric-card__value" style={{ fontSize: '1.2rem' }}>
                                    {leaderDisplay}
                                </div>
                                <div className="metric-card__label">Current Leader</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Decrypted Vote Distribution Card */}
                <div className="glass-card audit-right-col" style={{ margin: 0 }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🗳️ Decrypted Vote Distribution
                    </h2>

                    <div className="tally-list">
                        {candidateStats.map((c) => {
                            const isTop = maxVotes > 0 && c.votes === maxVotes;
                            return (
                                <div key={c.id} className="tally-item">
                                    <div className="tally-item__info">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            {c.isNota ? (
                                                <span style={{ fontSize: '1.4rem' }}>🚫</span>
                                            ) : (
                                                <img src={c.logo} alt={c.name} className="tally-item__logo" />
                                            )}
                                            <div>
                                                <div className="tally-item__name">
                                                    {c.name} {isTop && (
                                                        <span className={`tally-item__badge ${isTie ? 'tally-item__badge--tie' : ''}`}>
                                                            {isTie ? 'Tied' : 'Leading'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="tally-item__party">{c.party}</div>
                                            </div>
                                        </div>
                                        <div className="tally-item__count">
                                            <strong>{c.votes}</strong> votes ({c.percentage}%)
                                        </div>
                                    </div>

                                    <div className="tally-item__bar-bg">
                                        <div
                                            className={`tally-item__bar-fill ${c.isNota ? 'tally-item__bar-fill--nota' : ''}`}
                                            style={{ width: `${Math.max(c.percentage, totalVotes > 0 ? 3 : 0)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Voter Receipt Verifier */}
            <div className="glass-card audit-verifier-card" style={{ marginTop: '2.5rem', width: '100%', maxWidth: '980px' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🔎 Voter Receipt Verifier
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                    Verify that your vote is registered on the ledger by uploading your <strong>PDF Vote Receipt</strong> (or QR Code image) or by entering your 64-character SHA-256 vote hash.
                </p>

                {/* PDF / File Upload Verification Dropzone */}
                <div
                    className={`drop-zone ${isDragging ? 'drop-zone--active' : ''}`}
                    style={{ padding: '1.5rem', marginBottom: '1.25rem', borderRadius: 'var(--radius-md)', borderStyle: 'dashed' }}
                    onDrop={onDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onClick={() => isOnline && fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => handleReceiptFileUpload(e.target.files[0])}
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                        style={{ display: 'none' }}
                        disabled={!isOnline}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.8rem' }}>📄</span>
                        <div style={{ textAlign: 'left' }}>
                            <p style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                                {receiptFileName ? `Uploaded: ${receiptFileName}` : 'Upload or Drag & Drop PDF Vote Receipt / QR Image'}
                            </p>
                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                Accepts .pdf, .png, .jpg files • Automatically decodes QR code or hash
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', margin: '0.75rem 0', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>
                    — OR PASTE HASH MANUALLY —
                </div>

                {/* Manual Hash Search Form */}
                <form onSubmit={handleReceiptSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        className="receipt-input"
                        placeholder="Paste your 64-character vote hash receipt here..."
                        value={searchHash}
                        onChange={(e) => setSearchHash(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="btn btn--primary"
                        disabled={verifyingHash || !searchHash.trim()}
                    >
                        {verifyingHash ? <span className="spinner"></span> : 'Verify Receipt'}
                    </button>
                </form>

                {receiptResult && (
                    <div style={{ marginTop: '1.25rem' }}>
                        {receiptResult.success ? (
                            <div className="receipt-box receipt-box--success" style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontWeight: '700', color: 'var(--color-accent-success)', fontSize: '1.1rem' }}>
                                    <span style={{ fontSize: '1.5rem' }}>✅</span>
                                    <span>Receipt Verified — Vote is Successfully Registered</span>
                                </div>
                            </div>
                        ) : (
                            <div className="receipt-box receipt-box--error" style={{ textAlign: 'center' }}>
                                ❌ {receiptResult.message}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

