import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { encryptVote } from '../utils/encryption';
import { useDatabase } from '../context/DatabaseContext';

const API_BASE = 'http://localhost:5000/api';

// Candidate data (matches data/candidates.json) + NOTA
const candidates = [
    { id: 1, name: 'Candidate A', party: 'Progressive Alliance', logo: '/assets/candidate_a.png' },
    { id: 2, name: 'Candidate B', party: 'National Front',       logo: '/assets/candidate_b.png' },
    { id: 3, name: 'Candidate C', party: 'Democratic Union',     logo: '/assets/candidate_c.png' },
    { id: 4, name: 'Candidate D', party: "People's Party",       logo: '/assets/candidate_d.png' },
    { id: 0, name: 'NOTA',        party: 'None of the Above',    logo: null, isNota: true },
];

export default function VotingPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const token = location.state?.token;
    const { isOnline } = useDatabase();

    const [selectedId, setSelectedId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null); // null | { success, voteHash?, error? }
    const [qrDataUrl, setQrDataUrl] = useState('');

    // Guard: if no token was passed (e.g. direct URL access), redirect to upload
    if (!token) {
        return <Navigate to="/" replace />;
    }

    const selectedCandidate = candidates.find(c => c.id === selectedId);

    const handleSelect = (id) => {
        if (submitting || result || !isOnline) return;
        setSelectedId(id);
    };

    const generateVoteReceiptPdf = async (voteHash, existingQrUrl) => {
        try {
            let qrUrl = existingQrUrl;
            if (!qrUrl && voteHash) {
                qrUrl = await QRCode.toDataURL(voteHash, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#0f172a',
                        light: '#ffffff'
                    }
                });
            }

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Background / Theme colors
            doc.setFillColor(15, 23, 42); // Navy Dark (#0f172a)
            doc.rect(0, 0, 210, 297, 'F');

            // Header Banner
            doc.setFillColor(16, 185, 129); // Emerald Success (#10b981)
            doc.rect(15, 15, 180, 28, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.text('DECENTRALIZED VOTING SYSTEM', 105, 27, { align: 'center' });
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text('OFFICIAL ANONYMOUS VOTE RECEIPT', 105, 36, { align: 'center' });

            // Outer Card Container
            doc.setDrawColor(16, 185, 129);
            doc.setLineWidth(0.8);
            doc.setFillColor(30, 41, 59); // Slate Dark (#1e293b)
            doc.roundedRect(15, 48, 180, 230, 4, 4, 'FD');

            // Receipt Header Section
            doc.setFillColor(51, 65, 85);
            doc.rect(25, 58, 160, 10, 'F');
            doc.setTextColor(52, 211, 153); // Light Emerald
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('CRYPTOGRAPHIC PROOF OF BALLOT CASTING', 105, 64.5, { align: 'center' });

            // Details (No personal identity details)
            doc.setTextColor(241, 245, 249);
            doc.setFontSize(10);

            doc.setFont('helvetica', 'bold');
            doc.text('Ledger Status:', 30, 78);
            doc.setFont('helvetica', 'normal');
            doc.text('VERIFIED & CHAINED (TAMPER-EVIDENT)', 75, 78);

            doc.setFont('helvetica', 'bold');
            doc.text('Timestamp:', 30, 87);
            doc.setFont('helvetica', 'normal');
            doc.text(new Date().toLocaleString(), 75, 87);

            // Divider Line
            doc.setDrawColor(71, 85, 105);
            doc.setLineWidth(0.4);
            doc.line(25, 96, 185, 96);

            // QR Code Section Header
            doc.setFillColor(51, 65, 85);
            doc.rect(25, 103, 160, 10, 'F');
            doc.setTextColor(52, 211, 153);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('SCAN QR TO AUDIT RECEIPT ON PUBLIC LEDGER', 105, 109.5, { align: 'center' });

            // QR Code
            if (qrUrl) {
                doc.addImage(qrUrl, 'PNG', 65, 118, 80, 80);
            }

            // Vote Hash Box
            doc.setFillColor(15, 23, 42);
            doc.roundedRect(25, 204, 160, 22, 2, 2, 'F');
            doc.setFontSize(8);
            doc.setFont('courier', 'bold');
            doc.setTextColor(148, 163, 184);
            doc.text('VOTE RECEIPT HASH:', 105, 210, { align: 'center' });
            doc.setFontSize(6.5);
            doc.setFont('courier', 'normal');
            doc.text(voteHash, 105, 218, { align: 'center', maxWidth: 150 });

            // Security & Anonymity Disclaimer Footer
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('ZERO-KNOWLEDGE ANONYMITY GUARANTEE:', 105, 238, { align: 'center', maxWidth: 150 });
            doc.setFontSize(7.5);
            doc.text('This receipt contains zero personal identity information and cannot be traced back to your identity or ballot choices.', 105, 244, { align: 'center', maxWidth: 150 });
            doc.text('You can verify this receipt on the Public Audit Dashboard at any time.', 105, 252, { align: 'center', maxWidth: 150 });

            doc.save(`vote-receipt-${voteHash.slice(0, 8)}.pdf`);
        } catch (err) {
            console.error('Failed to generate vote receipt PDF:', err);
            alert('Error generating PDF receipt. Please try again.');
        }
    };

    const handleConfirm = async () => {
        if (selectedId === null || !isOnline) return;
        setSubmitting(true);

        try {
            // 1. Encrypt the vote client-side
            const encryptedPayload = await encryptVote(selectedId);

            // 2. Send to backend with the token
            const response = await fetch(`${API_BASE}/votes/cast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ encryptedPayload, token })
            });

            const data = await response.json();

            if (response.ok) {
                setResult({ success: true, voteHash: data.voteHash });
                const qrUrl = await QRCode.toDataURL(data.voteHash, {
                    width: 300,
                    margin: 2,
                    color: { dark: '#0f172a', light: '#ffffff' }
                });
                setQrDataUrl(qrUrl);
            } else {
                setResult({ success: false, error: data.error || 'Vote casting failed.' });
            }
        } catch (err) {
            setResult({ success: false, error: err.message || 'Network error. Please try again.' });
        } finally {
            setSubmitting(false);
            setShowModal(false);
        }
    };

    // ── Success Screen ──
    if (result?.success) {
        return (
            <div className="page-container">
                <div className="success-screen" style={{ maxWidth: '520px', width: '100%' }}>
                    <span className="success-screen__icon">✅</span>
                    <h1 className="success-screen__title">Vote Cast Successfully</h1>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                        Your vote has been encrypted, recorded, and chained to the tamper-evident ledger.
                    </p>
                    <p className="success-screen__hash-label">Vote Hash (Receipt)</p>
                    <div className="success-screen__hash">{result.voteHash}</div>

                    {qrDataUrl && (
                        <div className="pass-qr-container" style={{ margin: '1rem auto 1.5rem', maxWidth: '240px' }}>
                            <img src={qrDataUrl} alt="Vote Receipt QR Code" className="pass-qr-img" style={{ width: '120px', height: '120px' }} />
                            <p className="qr-hint">Scan to audit this vote receipt</p>
                        </div>
                    )}

                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', maxWidth: '380px', margin: '0 auto 1.5rem' }}>
                        🔒 This hash is your cryptographic receipt. No one — not even the system — can trace it back to your identity.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button
                            className="btn btn--success btn--lg"
                            onClick={() => generateVoteReceiptPdf(result.voteHash, qrDataUrl)}
                        >
                            📄 Download Anonymous Vote Receipt (PDF)
                        </button>
                        <button
                            className="btn btn--outline"
                            onClick={() => navigate('/', { replace: true })}
                            id="back-home-btn"
                        >
                            ← Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    // ── Error Screen ──
    if (result && !result.success) {
        return (
            <div className="page-container">
                <div className="glass-card" style={{ maxWidth: '480px', textAlign: 'center' }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>❌</span>
                    <h2 style={{ marginBottom: '0.75rem' }}>Vote Failed</h2>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>{result.error}</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button
                            className="btn btn--outline"
                            onClick={() => navigate('/', { replace: true })}
                        >
                            ← Back to Home
                        </button>
                        <button
                            className="btn btn--primary"
                            onClick={() => { setResult(null); setSelectedId(null); }}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Ballot Screen ──
    return (
        <div className="page-container">
            <div className="page-header">
                <span className="page-header__icon">🗳️</span>
                <h1 className="page-header__title">Cast Your Vote</h1>
                <p className="page-header__subtitle">
                    Select your preferred candidate below. Your vote will be encrypted before leaving your device.
                </p>
            </div>

            <div className="candidates-grid" style={{ opacity: isOnline ? 1 : 0.5, pointerEvents: isOnline ? 'auto' : 'none' }}>
                {candidates.map((candidate) => (
                    <div
                        key={candidate.id}
                        className={`candidate-card${selectedId === candidate.id ? ' candidate-card--selected' : ''}${candidate.isNota ? ' candidate-card--nota' : ''}`}
                        onClick={() => handleSelect(candidate.id)}
                        id={`candidate-${candidate.id}`}
                    >
                        {selectedId === candidate.id && (
                            <span className="candidate-card__check">✓</span>
                        )}
                        {candidate.isNota ? (
                            <span className="candidate-card__nota-icon">🚫</span>
                        ) : (
                            <img
                                src={candidate.logo}
                                alt={`${candidate.name} logo`}
                                className="candidate-card__logo"
                            />
                        )}
                        <h3 className="candidate-card__name">{candidate.name}</h3>
                        <p className="candidate-card__party">{candidate.party}</p>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button
                    className="btn btn--success btn--lg"
                    disabled={selectedId === null || !isOnline}
                    onClick={() => setShowModal(true)}
                    id="cast-vote-btn"
                >
                    🔐 Cast My Vote
                </button>
                {!isOnline ? (
                    <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--color-accent-danger)', fontWeight: 'bold' }}>
                        Voting is currently disabled because the database is offline.
                    </p>
                ) : selectedId === null && (
                    <p style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                        Select a candidate to enable voting
                    </p>
                )}
            </div>

            {/* Confirmation Modal */}
            {showModal && selectedCandidate && (
                <div className="modal-overlay" onClick={() => !submitting && setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal__title">Confirm Your Vote</h2>
                        <div className="modal__body">
                            <p>You are about to vote for:</p>
                            <p style={{ margin: '0.75rem 0' }}>
                                <span className="modal__candidate">{selectedCandidate.name}</span>
                                <br />
                                <span style={{ fontSize: '0.85rem' }}>{selectedCandidate.party}</span>
                            </p>
                            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                This action is irreversible. Your vote will be encrypted and permanently recorded.
                            </p>
                        </div>
                        <div className="modal__actions">
                            <button
                                className="btn btn--outline"
                                onClick={() => setShowModal(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn--success"
                                onClick={handleConfirm}
                                disabled={submitting}
                                id="confirm-vote-btn"
                            >
                                {submitting ? <span className="spinner"></span> : '✅ Confirm Vote'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
