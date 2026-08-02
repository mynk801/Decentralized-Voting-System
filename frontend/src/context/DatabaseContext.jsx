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
        </DatabaseContext.Provider>
    );
}

export function useDatabase() {
    return useContext(DatabaseContext);
}
