import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PassUploadPage from './pages/PassUploadPage';
import VotingPage from './pages/VotingPage';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<PassUploadPage />} />
                <Route path="/vote" element={<VotingPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
