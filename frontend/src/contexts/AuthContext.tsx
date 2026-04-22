import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
    id: number;
    login?: string;
    nome: string;
    role: string;
    isSuperadmin?: boolean;
    superadmin?: string; // 'S' or 'N'
    clientName?: string;
    dbName?: string;
    setor?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (userData: User, token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('sinco_user');
        const storedToken = localStorage.getItem('sinco_token') || localStorage.getItem('superadmin_token');
        if (storedUser && storedToken && storedToken !== 'undefined' && storedToken !== 'null') {
            try {
                setUser(JSON.parse(storedUser));
                setToken(storedToken);
            } catch (e) {
                console.error("Failed to parse user from local storage");
                localStorage.removeItem('sinco_user');
                localStorage.removeItem('sinco_token');
            }
        } else {
            localStorage.removeItem('sinco_user');
            localStorage.removeItem('sinco_token');
        }

        const handleAuthExpired = () => {
            setUser(null);
            setToken(null);
        };

        window.addEventListener('auth-expired', handleAuthExpired);
        return () => {
            window.removeEventListener('auth-expired', handleAuthExpired);
        };
    }, []);

    const login = (userData: User, jwtToken: string) => {
        setUser(userData);
        setToken(jwtToken);
        localStorage.setItem('sinco_user', JSON.stringify(userData));
        localStorage.setItem('sinco_token', jwtToken);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('sinco_user');
        localStorage.removeItem('sinco_token');
        localStorage.removeItem('superadmin_token');
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
