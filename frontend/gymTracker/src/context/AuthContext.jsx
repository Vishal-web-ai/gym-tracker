import { createContext, useState, useContext, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (token) {
            api.get('/auth/me')
                .then(res => setUser(res.data.user))
                .catch(() => {
                    localStorage.removeItem('token')
                    setUser(null)
                })
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [])

    function login(userData, token) {
        localStorage.setItem('token', token)
        setUser(userData)
    }

    async function logout() {
        localStorage.removeItem('token')
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
        <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}