import { createContext, useState, useContext, useEffect } from 'react'
import api, { setAccessToken, clearAccessToken } from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showWelcome, setShowWelcome] = useState(false)

    useEffect(() => {
        async function restore() {
            try {
                const { data } = await api.post('/auth/refresh')
                setAccessToken(data.accessToken)
                const me = await api.get('/auth/me')
                setUser(me.data.user)
            } catch {
                setUser(null)
            } finally {
                setLoading(false)
            }
        }
        restore()
    }, [])

    function login(userData, token, isNewUser) {
        if (token) setAccessToken(token)
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
        } catch {
            // ignore
        }
        clearAccessToken()
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
