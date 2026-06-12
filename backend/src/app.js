require('dotenv').config()
const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const helmet = require('helmet')

const app = express()

app.use(helmet({
    contentSecurityPolicy: false,
    hsts: process.env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false
}))
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:5173',
            ...(process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean)
        ]
        if (!origin) {
            return callback(null, true)
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true)
        }
        const prodRegex = /^https:\/\/[a-zA-Z0-9-]+\.gym-tracker-7dt\.pages\.dev$/
        if (prodRegex.test(origin)) {
            return callback(null, true)
        }
        callback(null, false)
    },
    credentials: true
}))

app.use(cookieParser())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false }))

app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
})
app.use('/api/auth', require('./routes/route.auth'))
app.use('/api/sessions', require('./routes/route.session'))

app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(err.status || 500).json({
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    })
})

module.exports = app