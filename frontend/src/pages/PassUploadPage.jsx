import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { useDatabase } from '../context/DatabaseContext';

const API_BASE = 'http://localhost:5000/api';

export default function PassUploadPage() {
    const { isOnline } = useDatabase();
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState('');
    const [status, setStatus] = useState(null); // null | 'verifying' | 'success' | 'error'
    const [errorMsg, setErrorMsg] = useState('');
    const [chainStatus, setChainStatus] = useState(null); // null | { intact, totalVotes, message }
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    // Fetch chain integrity status on mount
    useEffect(() => {
        fetch(`${API_BASE}/votes/verify-chain`)
            .then(res => res.json())
            .then(data => setChainStatus(data))
            .catch(() => setChainStatus(null));
    }, []);

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
                        reject(new Error('No readable QR code found in uploaded image.'));
                    }
                };
                img.onerror = () => reject(new Error('Failed to load image file.'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsDataURL(file);
        });
    };

    const handleFile = async (file) => {
        if (!file || !isOnline) return;

        setFileName(file.name);
        setStatus('verifying');
        setErrorMsg('');

        try {
            let passToken = null;

            // 1. Image formats (.png, .jpg, .jpeg, .webp) -> Decode QR
            if (file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)) {
                const qrText = await decodeQrFromImage(file);
                try {
                    const parsed = JSON.parse(qrText);
                    passToken = parsed.token || qrText;
                } catch {
                    passToken = qrText;
                }
            } else {
                // 2. JSON or Text format
                const text = await file.text();
                try {
                    const passData = JSON.parse(text);
                    passToken = passData.token;
                } catch (e) {
                    // Try looking for DCVS-TOKEN in raw text (e.g. from PDF text extraction or raw string)
                    const tokenMatch = text.match(/(DCVS-TOKEN-[A-Z0-9]+-[a-f0-9]+)/i);
                    if (tokenMatch) {
                        passToken = tokenMatch[0];
                    }

                }
            }

            if (!passToken) {
                throw new Error('Invalid Voter Pass: Could not extract valid token or QR code.');
            }

            const response = await fetch(`${API_BASE}/votes/verify-pass`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: passToken })
            });

            const result = await response.json();

            if (response.ok && result.authorized) {
                setStatus('success');
                setTimeout(() => {
                    navigate('/vote', { state: { token: result.token } });
                }, 1200);
            } else {
                setStatus('error');
                setErrorMsg(result.error || 'Voter pass verification failed.');
            }
        } catch (err) {
            setStatus('error');
            setErrorMsg(err.message || 'Failed to read voter pass file.');
        }
    };


    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!isOnline) return;
        const file = e.dataTransfer.files[0];
        handleFile(file);
    };

    const onDragOver = (e) => {
        e.preventDefault();
        if (!isOnline) return;
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    const onFileChange = (e) => {
        const file = e.target.files[0];
        handleFile(file);
    };

    const dropZoneClass = [
        'drop-zone',
        isDragging && 'drop-zone--active',
        status === 'success' && 'drop-zone--success',
        !isOnline && 'drop-zone--disabled'
    ].filter(Boolean).join(' ');

    return (
        <div className="page-container">
            <div className="glass-card" style={{ maxWidth: '520px', width: '100%' }}>
                <div className="page-header">
                    <span className="page-header__icon">🗳️</span>
                    <h1 className="page-header__title">Voter Authentication</h1>
                    <p className="page-header__subtitle">
                        Upload your Voter Pass to unlock the digital ballot. Your identity remains anonymous throughout the process.
                    </p>
                </div>

                <div
                    className={dropZoneClass}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onClick={() => isOnline && fileInputRef.current?.click()}
                    id="voter-pass-drop-zone"
                    style={{ cursor: isOnline ? 'pointer' : 'not-allowed', opacity: isOnline ? 1 : 0.6 }}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={onFileChange}
                        accept=".json,.pdf,.png,.jpg,.jpeg,.webp"
                        style={{ display: 'none' }}
                        disabled={!isOnline}
                        id="voter-pass-file-input"
                    />

                    {!isOnline ? (
                        <>
                            <span className="drop-zone__icon" style={{ filter: 'grayscale(1)' }}>🔌</span>
                            <p className="drop-zone__text">Upload Disabled</p>
                            <p className="drop-zone__hint">System is currently offline. Waiting for database...</p>
                        </>
                    ) : status === 'verifying' ? (
                        <>
                            <span className="drop-zone__icon">
                                <span className="spinner"></span>
                            </span>
                            <p className="drop-zone__text">Verifying your Voter Pass...</p>
                        </>
                    ) : status === 'success' ? (
                        <>
                            <span className="drop-zone__icon">✅</span>
                            <p className="drop-zone__text">Verified! Redirecting to ballot...</p>
                        </>
                    ) : (
                        <>
                            <span className="drop-zone__icon">📄</span>
                            <p className="drop-zone__text">
                                {fileName || 'Drag & drop your Voter Pass (PDF / QR Image / JSON)'}
                            </p>
                            <p className="drop-zone__hint">or click to browse • accepts PDF, QR Image, or JSON</p>
                        </>
                    )}

                </div>

                {status === 'error' && (
                    <div className="status-bar status-bar--error" style={{ marginTop: '1rem' }}>
                        ⚠️ {errorMsg}
                    </div>
                )}

                {/* Chain Integrity Indicator */}
                {chainStatus && (
                    <div className={`chain-status ${chainStatus.intact ? 'chain-status--intact' : 'chain-status--broken'}`}>
                        <div className="chain-status__header">
                            <span className="chain-status__icon">
                                {chainStatus.intact ? '🔗' : '💥'}
                            </span>
                            <span className="chain-status__label">Ledger Integrity</span>
                            <span className={`chain-status__badge ${chainStatus.intact ? 'chain-status__badge--ok' : 'chain-status__badge--fail'}`}>
                                {chainStatus.intact ? '✓ Verified' : '✗ Compromised'}
                            </span>
                        </div>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        🔒 End-to-end encrypted • Your vote is private and tamper-proof
                    </p>
                </div>
            </div>
        </div>
    );
}
