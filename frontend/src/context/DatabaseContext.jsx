import { createContext, useContext, useState, useEffect } from 'react';

const DatabaseContext = createContext({ isOnline: true });

export function DatabaseProvider({ children }) {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/health');
                setIsOnline(res.ok);
            } catch (err) {
                setIsOnline(false);
            }
        };

        // Check immediately
        checkHealth();

        // Then poll every 3 seconds
        const interval = setInterval(checkHealth, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <DatabaseContext.Provider value={{ isOnline }}>
            {children}
            <div className={`db-indicator ${isOnline ? 'db-indicator--online' : 'db-indicator--offline'}`}>
                <span className="db-indicator__dot"></span>
                {isOnline ? 'Database Connected' : 'Database Offline'}
            </div>
        </DatabaseContext.Provider>
    );
}

export function useDatabase() {
    return useContext(DatabaseContext);
}
