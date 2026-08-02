import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { useDatabase } from '../context/DatabaseContext';

const API_BASE = 'http://localhost:5000/api';

export default function RegistrationPage() {
    const { isOnline } = useDatabase();
    const navigate = useNavigate();

    const [fullName, setFullName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [govId, setGovId] = useState('');
    const [showGovId, setShowGovId] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [registeredPass, setRegisteredPass] = useState(null);
    const [qrDataUrl, setQrDataUrl] = useState('');

    // Generate PDF Voter Pass document
    const generatePdfPass = async (passData, existingQrUrl) => {
        try {
            let qrUrl = existingQrUrl;
            if (!qrUrl && passData) {
                qrUrl = await QRCode.toDataURL(JSON.stringify(passData), {
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
            doc.setFillColor(99, 102, 241); // Indigo Primary (#6366f1)
            doc.rect(15, 15, 180, 28, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.text('DECENTRALIZED VOTING SYSTEM', 105, 27, { align: 'center' });
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text('OFFICIAL DIGITAL VOTER PASS', 105, 36, { align: 'center' });

            // Outer Card Container
            doc.setDrawColor(99, 102, 241);
            doc.setLineWidth(0.8);
            doc.setFillColor(30, 41, 59); // Slate Dark (#1e293b)
            doc.roundedRect(15, 48, 180, 230, 4, 4, 'FD');

            // Voter Identity Section Header
            doc.setFillColor(51, 65, 85);
            doc.rect(25, 58, 160, 10, 'F');
            doc.setTextColor(129, 140, 248); // Light Accent
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('VOTER IDENTITY DETAILS', 30, 64.5);

            // Voter Identity Information (Name and DOB on Top)
            doc.setTextColor(241, 245, 249);
            doc.setFontSize(11);

            // Full Name
            doc.setFont('helvetica', 'bold');
            doc.text('Full Name:', 30, 78);
            doc.setFont('helvetica', 'normal');
            doc.text(passData.fullName, 75, 78);

            // Date of Birth
            doc.setFont('helvetica', 'bold');
            doc.text('Date of Birth:', 30, 87);
            doc.setFont('helvetica', 'normal');
            doc.text(passData.dateOfBirth, 75, 87);

            // Voter Pass ID
            doc.setFont('helvetica', 'bold');
            doc.text('Voter Pass ID:', 30, 96);
            doc.setFont('helvetica', 'normal');
            doc.text(`#${passData.voterId}`, 75, 96);

            // Issue Timestamp
            doc.setFont('helvetica', 'bold');
            doc.text('Issued Date:', 30, 105);
            doc.setFont('helvetica', 'normal');
            doc.text(new Date(passData.issuedAt).toLocaleString(), 75, 105);

            // Divider Line
            doc.setDrawColor(71, 85, 105);
            doc.setLineWidth(0.4);
            doc.line(25, 115, 185, 115);

            // QR Code Section Header
            doc.setFillColor(51, 65, 85);
            doc.rect(25, 122, 160, 10, 'F');
            doc.setTextColor(129, 140, 248);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('UNIQUE VOTER AUTHENTICATION QR CODE', 105, 128.5, { align: 'center' });

            // Add QR Code Image Below Details
            if (qrUrl) {
                doc.addImage(qrUrl, 'PNG', 65, 137, 80, 80);
            }

            // Token Box
            doc.setFillColor(15, 23, 42);
            doc.roundedRect(25, 220, 160, 20, 2, 2, 'F');
            doc.setFontSize(8);
            doc.setFont('courier', 'bold');
            doc.setTextColor(148, 163, 184);
            doc.text('CRYPTOGRAPHIC TOKEN:', 105, 226, { align: 'center' });
            doc.setFontSize(6.5);
            doc.setFont('courier', 'normal');
            doc.text(passData.token, 105, 233, { align: 'center', maxWidth: 150 });

            // Security Notice Footer
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('SECURITY NOTICE: Keep this pass secure. Upload this PDF pass to unlock your ballot.', 105, 248, { align: 'center', maxWidth: 150 });
            doc.text('Each Voter Pass can only be used once to cast an anonymous encrypted vote.', 105, 255, { align: 'center', maxWidth: 150 });

            // Trigger Download
            doc.save(`voter-pass-${passData.voterId}.pdf`);

        } catch (err) {
            console.error('Failed to generate PDF pass:', err);
            alert('Error generating PDF pass. Please try again.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isOnline) return;

        if (!fullName.trim() || !dateOfBirth.trim()) {
            setErrorMsg('Please enter both Full Name and Date of Birth.');
            return;
        }

        // Client-side 18+ Age Check
        const dobDate = new Date(dateOfBirth);
        const today = new Date();
        let userAge = today.getFullYear() - dobDate.getFullYear();
        const mDiff = today.getMonth() - dobDate.getMonth();
        if (mDiff < 0 || (mDiff === 0 && today.getDate() < dobDate.getDate())) {
            userAge--;
        }

        if (userAge < 18) {
            setErrorMsg('Registration Ineligible: You must be at least 18 years old to vote.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');


        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: fullName.trim(),
                    dateOfBirth: dateOfBirth.trim(),
                    govId: govId.trim() || undefined
                })
            });

            const result = await response.json();

            if (response.ok && result.pass) {
                const pass = result.pass;
                setRegisteredPass(pass);

                // Generate QR Code URL for card preview
                const qrUrl = await QRCode.toDataURL(JSON.stringify(pass), {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#0f172a',
                        light: '#ffffff'
                    }
                });
                setQrDataUrl(qrUrl);
                // Note: Auto-download disabled per user request
            } else {
                setErrorMsg(result.error || 'Registration failed. Please try again.');
            }
        } catch (err) {
            setErrorMsg(err.message || 'Server connection error. Please check backend.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="page-container">
            <div className="glass-card" style={{ maxWidth: '540px', width: '100%' }}>
                {!registeredPass ? (
                    <>
                        <div className="page-header">
                            <span className="page-header__icon">📝</span>
                            <h1 className="page-header__title">Voter Registration</h1>
                            <p className="page-header__subtitle">
                                Register your identity to generate your official, cryptographically verified Voter Pass.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="registration-form">
                            {/* Full Name */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="reg-fullname">
                                    Full Name <span className="required-star">*</span>
                                </label>
                                <div className="input-wrapper">
                                    <span className="input-icon">👤</span>
                                    <input
                                        type="text"
                                        id="reg-fullname"
                                        className="form-input"
                                        placeholder="e.g. Jane Doe"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                        disabled={!isOnline || isSubmitting}
                                    />
                                </div>
                            </div>

                            {/* Date of Birth */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="reg-dob">
                                    Date of Birth <span className="required-star">*</span>
                                </label>
                                <div className="input-wrapper">
                                    <span className="input-icon">📅</span>
                                    <input
                                        type="date"
                                        id="reg-dob"
                                        className="form-input"
                                        value={dateOfBirth}
                                        onChange={(e) => setDateOfBirth(e.target.value)}
                                        max={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                                        required
                                        disabled={!isOnline || isSubmitting}
                                    />
                                </div>
                                <span className="form-hint">🔞 Voters must be at least 18 years old to be eligible for registration.</span>
                            </div>


                            {/* Government ID (Optional) */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="reg-govid">
                                    Government ID <span className="optional-tag">(Optional)</span>
                                </label>
                                <div className="input-wrapper">
                                    <span className="input-icon">🆔</span>
                                    <input
                                        type={showGovId ? 'text' : 'password'}
                                        id="reg-govid"
                                        className="form-input"
                                        placeholder="SSN, Voter ID, or National ID"
                                        value={govId}
                                        onChange={(e) => setGovId(e.target.value)}
                                        disabled={!isOnline || isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        className="toggle-vis-btn"
                                        onClick={() => setShowGovId(!showGovId)}
                                        title={showGovId ? 'Hide ID' : 'Show ID'}
                                        tabIndex="-1"
                                    >
                                        {showGovId ? '👁️' : '🙈'}
                                    </button>
                                </div>
                                <span className="form-hint">
                                    🔒 If provided, raw ID is never stored; only a cryptographic hash is saved.
                                </span>
                            </div>

                            {errorMsg && (
                                <div className="status-bar status-bar--error" style={{ marginBottom: '1.25rem' }}>
                                    ⚠️ {errorMsg}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn--primary btn--lg"
                                style={{ width: '100%' }}
                                disabled={!isOnline || isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner"></span>
                                        Generating Cryptographic Pass...
                                    </>
                                ) : (
                                    <>📝 Complete Registration & Issue Pass</>
                                )}
                            </button>

                            {!isOnline && (
                                <p className="offline-notice">
                                    🔌 Database connection lost. Registration is disabled.
                                </p>
                            )}
                        </form>
                    </>
                ) : (
                    /* Registration Success View */
                    <div className="success-screen">
                        <span className="success-screen__icon">✅</span>
                        <h2 className="success-screen__title">Registration Successful!</h2>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                            Your voter registration is complete. Click below to download your official PDF Voter Pass.
                        </p>

                        {/* Pass Card Preview */}
                        <div className="voter-pass-card-preview">
                            <div className="pass-card-header">
                                <span className="pass-badge">OFFICIAL VOTER PASS</span>
                                <span className="pass-id">#{registeredPass.voterId}</span>
                            </div>

                            <div className="pass-card-body">
                                <div className="pass-details-top">
                                    <p className="pass-detail-row">
                                        <strong>Name:</strong> <span>{registeredPass.fullName}</span>
                                    </p>
                                    <p className="pass-detail-row">
                                        <strong>Date of Birth:</strong> <span>{registeredPass.dateOfBirth}</span>
                                    </p>
                                </div>

                                {qrDataUrl && (
                                    <div className="pass-qr-container">
                                        <img src={qrDataUrl} alt="Voter Pass QR Code" className="pass-qr-img" />
                                        <p className="qr-hint">Scan or upload this QR code on the Vote Portal</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pass-action-buttons">
                            <button
                                type="button"
                                className="btn btn--primary btn--lg"
                                style={{ width: '100%', marginBottom: '0.75rem' }}
                                onClick={() => generatePdfPass(registeredPass, qrDataUrl)}
                            >
                                📄 Download Official PDF Pass
                            </button>
                            <button
                                type="button"
                                className="btn btn--outline"
                                style={{ width: '100%' }}
                                onClick={() => navigate('/')}
                            >
                                🔑 Go to Vote Portal
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
