import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DatabaseProvider } from './context/DatabaseContext';
import Navbar from './components/Navbar';
import RegistrationPage from './pages/RegistrationPage';
import PassUploadPage from './pages/PassUploadPage';
import VotingPage from './pages/VotingPage';
import AuditDashboardPage from './pages/AuditDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

function App() {
    return (
        <DatabaseProvider>
            <Router>
                <Navbar />
                <Routes>
                    <Route path="/register" element={<RegistrationPage />} />
                    <Route path="/" element={<PassUploadPage />} />
                    <Route path="/vote" element={<VotingPage />} />
                    <Route path="/audit" element={<AuditDashboardPage />} />
                    <Route path="/admin" element={<AdminDashboardPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>

            </Router>
        </DatabaseProvider>
    );
}

export default App;
