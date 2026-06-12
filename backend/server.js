const dns = require('dns')
dns.setDefaultResultOrder('ipv4first')

const app = require('./src/app')
const connectDB = require('./src/db/db')

const requiredEnv = ['JWT_SECRET', 'MONGO_URI', 'SENDGRID_API_KEY']
for (const key of requiredEnv) {
    if (!process.env[key]) {
        console.error(`Missing required env: ${key}`)
        process.exit(1)
    }
}

connectDB()

const PORT = process.env.PORT || 3000
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...')
    server.close(() => process.exit(0))
})