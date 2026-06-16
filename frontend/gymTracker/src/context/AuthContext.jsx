import { createContext, useState, useContext, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showWelcome, setShowWelcome] = useState(false)

    useEffect(() => {
        api.get('/auth/me')
            .then(res => setUser(res.data.user))
            .catch(() => setUser(null))
            .finally(() => setLoading(false))
    }, [])

    function login(userData, isNewUser) {
        setUser(userData)
        if (isNewUser === false) {
            setShowWelcome(true)
        }
    }

    function clearWelcome() {
        setShowWelcome(false)
    }

    async function logout() {
        try {
            await api.post('/auth/logout')
        } catch (err) {
            // ignore
        }
        setUser(null)
    }

    function updateUser(updates) {
        setUser(prev => ({ ...prev, ...updates }))
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, updateUser, showWelcome, clearWelcome }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}