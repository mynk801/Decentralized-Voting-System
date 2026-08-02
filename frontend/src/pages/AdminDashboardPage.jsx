import { useState, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';

const API_BASE = 'http://localhost:5000/api';

export default function AdminDashboardPage() {
    const { isOnline } = useDatabase();

    // Admin Auth State
    const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('adminToken') || '');
    const [usernameInput, setUsernameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Dashboard Data State
    const [statusData, setStatusData] = useState(null);
    const [voterData, setVoterData] = useState({ totalRegistered: 0, totalVoted: 0, pendingVoters: 0, voters: [] });
    const [loadingData, setLoadingData] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Roster Filter & Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTab, setFilterTab] = useState('ALL'); // 'ALL', 'VOTED', 'NOT_VOTED'

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!usernameInput.trim() || !passwordInput.trim()) return;

        setIsLoggingIn(true);
        setLoginError('');

        try {
            const res = await fetch(`${API_BASE}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usernameInput.trim(),
                    password: passwordInput.trim()
                })
            });

            const data = await res.json();

            if (res.ok && data.token) {
                setAdminToken(data.token);
                sessionStorage.setItem('adminToken', data.token);
                setUsernameInput('');
                setPasswordInput('');
            } else {
                setLoginError(data.error || 'Authentication failed.');
            }
        } catch (err) {
            setLoginError('Network error during admin authentication.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = () => {
        setAdminToken('');
        sessionStorage.removeItem('adminToken');
    };

    const fetchAdminDashboardData = async (showLoading = true) => {
        if (!adminToken || !isOnline) return;

        if (showLoading) setLoadingData(true);
        setErrorMsg('');

        try {
            const [statusRes, votersRes] = await Promise.all([
                fetch(`${API_BASE}/admin/status`),
                fetch(`${API_BASE}/admin/voters`)
            ]);

            if (!statusRes.ok) throw new Error('Failed to fetch election status.');
            if (!votersRes.ok) throw new Error('Failed to fetch voters roster.');

            const statusJson = await statusRes.json();
            const votersJson = await votersRes.json();

            setStatusData(statusJson);
            setVoterData(votersJson);
        } catch (err) {
            console.error('Admin data fetch error:', err);
            setErrorMsg(err.message || 'Error fetching admin dashboard data.');
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        if (adminToken) {
            fetchAdminDashboardData(true);
            const interval = setInterval(() => fetchAdminDashboardData(false), 5000);
            return () => clearInterval(interval);
        }
    }, [adminToken, isOnline]);

    const handleUpdateStatus = async (newStatus) => {
        if (!adminToken || !isOnline) return;

        setUpdatingStatus(true);
        try {
            const res = await fetch(`${API_BASE}/admin/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await res.json();
            if (res.ok) {
                await fetchAdminDashboardData(false);
            } else {
                alert(data.error || 'Failed to update election status.');
            }
        } catch (err) {
            alert('Error communicating with election administration service.');
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Filter voters list based on search query & active category tab
    const filteredVoters = voterData.voters.filter((voter) => {
        const matchesTab =
            filterTab === 'ALL' ? true :
            filterTab === 'VOTED' ? voter.hasVoted :
            !voter.hasVoted;

        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
            !query ||
            voter.fullName.toLowerCase().includes(query) ||
            voter.dateOfBirth.includes(query) ||
            voter.voterId.toLowerCase().includes(query);

        return matchesTab && matchesSearch;
    });

    const turnoutPercentage = voterData.totalRegistered > 0
        ? ((voterData.totalVoted / voterData.totalRegistered) * 100).toFixed(1)
        : '0.0';

    // -------------------------------------------------------------
    // RENDER: LOGIN FORM (UNAUTHENTICATED ADMIN)
    // -------------------------------------------------------------
    if (!adminToken) {
        return (
            <div className="page-container" style={{ maxWidth: '480px', margin: '3rem auto' }}>
                <div className="glass-card" style={{ padding: '2.5rem 2rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>🔐</span>
                        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>Administrator Login</h1>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>
                            Authorized Election Commissioners only. Please enter your credentials to access system controls.
                        </p>
                    </div>

                    {loginError && (
                        <div className="status-bar status-bar--error" style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                            ⚠️ {loginError}
                        </div>
                    )}

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="admin-username">Admin Username</label>
                            <div className="input-wrapper">
                                <span className="input-icon">👤</span>
                                <input
                                    type="text"
                                    id="admin-username"
                                    className="form-input"
                                    placeholder="Enter admin username"
                                    value={usernameInput}
                                    onChange={(e) => setUsernameInput(e.target.value)}
                                    required
                                    disabled={isLoggingIn}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="admin-password">Password</label>
                            <div className="input-wrapper">
                                <span className="input-icon">🔑</span>
                                <input
                                    type="password"
                                    id="admin-password"
                                    className="form-input"
                                    placeholder="••••••••"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    required
                                    disabled={isLoggingIn}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn--primary btn--full"
                            style={{ padding: '0.85rem', marginTop: '0.5rem' }}
                            disabled={isLoggingIn}
                        >
                            {isLoggingIn ? <span className="spinner"></span> : '🔐 Authenticate as Administrator'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: ADMIN CONTROL DASHBOARD (AUTHENTICATED)
    // -------------------------------------------------------------
    const currentStatus = statusData?.status || 'LIVE';

    return (
        <div className="page-container audit-page-container">
            {/* Top Bar: Admin Identity & Logout */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '2rem' }}>🔑</span>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Election Administration Dashboard</h1>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                            Authenticated as <strong style={{ color: 'var(--color-accent-emerald)' }}>mynk801</strong> (Chief Commissioner)
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button className="btn btn--outline" onClick={() => fetchAdminDashboardData(true)} disabled={loadingData}>
                        🔄 Refresh
                    </button>
                    <button className="btn btn--outline" onClick={handleLogout} style={{ borderColor: 'var(--color-accent-danger)', color: '#f87171' }}>
                        🚪 Logout
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="status-bar status-bar--error" style={{ marginBottom: '1.5rem' }}>
                    ⚠️ {errorMsg}
                </div>
            )}

            {/* 1. Election Control Center Card */}
            <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            ⚡ Election Status & Lifecycle Controls
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                            Control whether voters are permitted to cast ballots in real time.
                        </p>
                    </div>

                    {/* Status Pill */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.9rem', borderRadius: '20px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: currentStatus === 'LIVE' ? '#22c55e' : currentStatus === 'ENDED' ? '#ef4444' : '#eab308',
                            boxShadow: `0 0 8px ${currentStatus === 'LIVE' ? '#22c55e' : currentStatus === 'ENDED' ? '#ef4444' : '#eab308'}`
                        }}></span>
                        <span style={{ fontWeight: '700', fontSize: '0.88rem', letterSpacing: '0.5px' }}>
                            {currentStatus === 'LIVE' ? '🟢 LIVE (VOTING OPEN)' : currentStatus === 'ENDED' ? '🔴 ENDED (VOTING CLOSED)' : '🟡 UPCOMING / PAUSED'}
                        </span>
                    </div>
                </div>

                {/* Status Toggle Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                    <button
                        className="btn btn--primary"
                        onClick={() => handleUpdateStatus('LIVE')}
                        disabled={updatingStatus || currentStatus === 'LIVE'}
                        style={{
                            background: currentStatus === 'LIVE' ? 'rgba(34, 197, 94, 0.2)' : 'linear-gradient(135deg, #059669, #10b981)',
                            borderColor: '#10b981',
                            flex: 1,
                            minWidth: '200px'
                        }}
                    >
                        {updatingStatus ? <span className="spinner"></span> : '▶️ Start / Resume Voting'}
                    </button>

                    <button
                        className="btn btn--outline"
                        onClick={() => handleUpdateStatus('ENDED')}
                        disabled={updatingStatus || currentStatus === 'ENDED'}
                        style={{
                            borderColor: '#ef4444',
                            color: '#f87171',
                            background: currentStatus === 'ENDED' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                            flex: 1,
                            minWidth: '200px'
                        }}
                    >
                        {updatingStatus ? <span className="spinner"></span> : '⏹️ End / Close Voting'}
                    </button>
                </div>
            </div>

            {/* 2. Turnout Metrics Summary Cards */}
            <div className="audit-dashboard-grid" style={{ marginBottom: '2.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div className="metric-card">
                    <span className="metric-card__icon">👥</span>
                    <div>
                        <div className="metric-card__value">{voterData.totalRegistered}</div>
                        <div className="metric-card__label">Total Registered Voters</div>
                    </div>
                </div>

                <div className="metric-card">
                    <span className="metric-card__icon">📥</span>
                    <div>
                        <div className="metric-card__value" style={{ color: 'var(--color-accent-emerald)' }}>
                            {voterData.totalVoted}
                        </div>
                        <div className="metric-card__label">Ballots Cast (Voted)</div>
                    </div>
                </div>

                <div className="metric-card">
                    <span className="metric-card__icon">⏳</span>
                    <div>
                        <div className="metric-card__value" style={{ color: '#eab308' }}>
                            {voterData.pendingVoters}
                        </div>
                        <div className="metric-card__label">Pending (Not Voted)</div>
                    </div>
                </div>

                <div className="metric-card">
                    <span className="metric-card__icon">📊</span>
                    <div>
                        <div className="metric-card__value" style={{ color: '#38bdf8' }}>
                            {turnoutPercentage}%
                        </div>
                        <div className="metric-card__label">Voter Turnout Rate</div>
                    </div>
                </div>
            </div>

            {/* 3. Registered Voters Roster & Status Tracker Table */}
            <div className="glass-card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            📜 Registered Voters & Turnout Roster
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                            Monitor voter registration records and participation status in real time.
                        </p>
                    </div>

                    {/* Filter Tabs */}
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <button
                            onClick={() => setFilterTab('ALL')}
                            style={{
                                padding: '0.4rem 0.85rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: filterTab === 'ALL' ? 'var(--color-accent-emerald)' : 'transparent',
                                color: filterTab === 'ALL' ? '#0f172a' : 'var(--color-text-secondary)',
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}
                        >
                            All ({voterData.totalRegistered})
                        </button>
                        <button
                            onClick={() => setFilterTab('VOTED')}
                            style={{
                                padding: '0.4rem 0.85rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: filterTab === 'VOTED' ? 'var(--color-accent-emerald)' : 'transparent',
                                color: filterTab === 'VOTED' ? '#0f172a' : 'var(--color-text-secondary)',
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}
                        >
                            🟢 Voted ({voterData.totalVoted})
                        </button>
                        <button
                            onClick={() => setFilterTab('NOT_VOTED')}
                            style={{
                                padding: '0.4rem 0.85rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: filterTab === 'NOT_VOTED' ? 'var(--color-accent-emerald)' : 'transparent',
                                color: filterTab === 'NOT_VOTED' ? '#0f172a' : 'var(--color-text-secondary)',
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}
                        >
                            🟡 Pending ({voterData.pendingVoters})
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div style={{ marginBottom: '1.25rem' }}>
                    <div className="input-wrapper">
                        <span className="input-icon">🔍</span>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search registered voters by Full Name, Date of Birth, or Voter ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Voters Roster Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                                <th style={{ padding: '0.75rem 1rem' }}>#</th>
                                <th style={{ padding: '0.75rem 1rem' }}>VOTER ID</th>
                                <th style={{ padding: '0.75rem 1rem' }}>FULL NAME</th>
                                <th style={{ padding: '0.75rem 1rem' }}>DATE OF BIRTH</th>
                                <th style={{ padding: '0.75rem 1rem' }}>REGISTERED DATE</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>VOTING STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVoters.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                                        No registered voters found matching your search query.
                                    </td>
                                </tr>
                            ) : (
                                filteredVoters.map((voter, index) => (
                                    <tr key={voter.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '0.85rem 1rem', opacity: 0.6 }}>{index + 1}</td>
                                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: '600', color: '#cbd5e1' }}>
                                            #{voter.voterId}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                                            {voter.fullName}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-secondary)' }}>
                                            {voter.dateOfBirth}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                                            {new Date(voter.registeredAt).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                                            {voter.hasVoted ? (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.35rem',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '12px',
                                                    background: 'rgba(34, 197, 94, 0.15)',
                                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                                    color: '#4ade80',
                                                    fontWeight: '700',
                                                    fontSize: '0.78rem'
                                                }}>
                                                    <span>✅</span> Voted
                                                </span>
                                            ) : (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.35rem',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '12px',
                                                    background: 'rgba(234, 179, 8, 0.15)',
                                                    border: '1px solid rgba(234, 179, 8, 0.3)',
                                                    color: '#fde047',
                                                    fontWeight: '700',
                                                    fontSize: '0.78rem'
                                                }}>
                                                    <span>⏳</span> Pending
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Privacy Guarantee Note */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)', fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                    🔒 <strong>Strict Ballot Secrecy Enforced</strong>: The Admin Dashboard displays voter participation (whether a voter has cast a ballot) to prevent double-voting, but candidate selections are encrypted client-side and completely decoupled from voter identity.
                </div>
            </div>
        </div>
    );
}
