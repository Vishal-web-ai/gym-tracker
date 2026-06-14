import axios from 'axios'

let token = null

export function setToken(t) { token = t }
export function getToken() { return token }
export function clearToken() { token = null }

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    withCredentials: true
})

api.interceptors.request.use((config) => {
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export default api