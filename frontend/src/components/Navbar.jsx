import { NavLink } from 'react-router-dom';
import { useDatabase } from '../context/DatabaseContext';

export default function Navbar() {
    const { isOnline } = useDatabase();

    return (
        <header className="app-navbar">
            <div className="app-navbar__brand">
                <span className="app-navbar__logo">🗳️</span>
                <span className="app-navbar__title">Decentralized Voting System</span>
            </div>

            <div className="app-navbar__right">
                <nav className="app-navbar__nav">
                    <NavLink
                        to="/register"
                        className={({ isActive }) => `app-navbar__link ${isActive ? 'app-navbar__link--active' : ''}`}
                    >
                        📝 Register
                    </NavLink>
                    <NavLink
                        to="/"
                        className={({ isActive }) => `app-navbar__link ${isActive ? 'app-navbar__link--active' : ''}`}
                    >
                        🔑 Vote Portal
                    </NavLink>
                    <NavLink
                        to="/audit"
                        className={({ isActive }) => `app-navbar__link ${isActive ? 'app-navbar__link--active' : ''}`}
                    >
                        📊 Public Audit Dashboard
                    </NavLink>
                    <NavLink
                        to="/admin"
                        className={({ isActive }) => `app-navbar__link ${isActive ? 'app-navbar__link--active' : ''}`}
                    >
                        ⚙️ Admin
                    </NavLink>

                </nav>
                <div className={`db-indicator ${isOnline ? 'db-indicator--online' : 'db-indicator--offline'}`}>
                    <span className="db-indicator__dot"></span>
                    {isOnline ? 'Database Connected' : 'Database Offline'}
                </div>
            </div>
        </header>
    );
}
