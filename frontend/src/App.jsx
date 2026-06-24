import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DatabaseProvider } from './context/DatabaseContext';
import PassUploadPage from './pages/PassUploadPage';
import VotingPage from './pages/VotingPage';

function App() {
    return (
        <DatabaseProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<PassUploadPage />} />
                    <Route path="/vote" element={<VotingPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </DatabaseProvider>
    );
}

export default App;
