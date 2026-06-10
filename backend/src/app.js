require('dotenv').config()
const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')

const app = express()

app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:5173',
            ...(process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean)
        ]
        if (!origin || allowedOrigins.some(o => origin === o || origin.endsWith('.gym-tracker-7dt.pages.dev'))) {
            callback(null, true)
        } else {
            callback(null, false)
        }
    },
    credentials: true
}))

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
})
app.use('/api/auth', require('./routes/route.auth'))
app.use('/api/sessions', require('./routes/route.session'))

module.exports = app