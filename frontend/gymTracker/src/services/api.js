import axios from 'axios'

let accessToken = null

export function setAccessToken(token) {
    accessToken = token
}

export function getAccessToken() {
    return accessToken
}

export function clearAccessToken() {
    accessToken = null
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true
})

api.interceptors.request.use(config => {
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
})

api.interceptors.response.use(
    res => res,
    async err => {
        const original = err.config
        if (err.response?.status === 401 && !original._retry) {
            original._retry = true
            try {
                const { data } = await axios.post(
                    `${api.defaults.baseURL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                )
                setAccessToken(data.accessToken)
                original.headers.Authorization = `Bearer ${data.accessToken}`
                return api(original)
            } catch {
                clearAccessToken()
            }
        }
        return Promise.reject(err)
    }
)

export default api
