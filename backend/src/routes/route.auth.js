const express = require('express')
const router = express.Router()
const User = require('../model/model.user')
const Otp = require('../model/model.otp')
const authenticate = require('../middlewares/auth')
const sendEmail = require('../utils/sendEmail')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const rateLimit = require('express-rate-limit')
const { body, validationResult } = require('express-validator')

const sendOtpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.body?.email || req.ip,
    message: { message: 'Too many requests' }
})

const verifyOtpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyGenerator: (req) => req.body?.email || req.ip,
    message: { message: 'Too many requests' }
})

const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: { message: 'Too many requests' }
})

const usernameLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Too many requests' }
})

function validate(req, res, next) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
    }
    next()
}

router.post('/send-otp',
    body('email').isEmail().withMessage('Valid email is required'),
    validate,
    sendOtpLimiter,
    async (req, res) => {
        try {
            const { email } = req.body
            const otp = crypto.randomInt(100000, 999999).toString()
            const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex')
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

            await Otp.deleteMany({ email })
            await Otp.create({ email, otp: hashedOtp, expiresAt })

            await sendEmail(
                email,
                'Your Gym Tracker OTP',
                `Your OTP is: ${otp}. It expires in 5 minutes.`
            )

            res.json({ message: 'OTP sent to your email' })
        } catch (err) {
            console.error(err)
            res.status(500).json({ message: 'Server error' })
        }
    }
)

router.post('/verify-otp',
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').matches(/^\d{6}$/).withMessage('OTP must be 6 digits'),
    validate,
    verifyOtpLimiter,
    async (req, res) => {
        try {
            const { email, otp } = req.body
            const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex')
            const otpRecord = await Otp.findOne({ email, otp: hashedOtp })

            if (!otpRecord) {
                return res.status(400).json({ message: 'Invalid OTP' })
            }

            if (otpRecord.expiresAt < new Date()) {
                await Otp.deleteOne({ _id: otpRecord._id })
                return res.status(400).json({ message: 'OTP has expired' })
            }

            await Otp.deleteOne({ _id: otpRecord._id })

            let user = await User.findOne({ email })
            const isNewUser = !user
            if (!user) {
                user = await User.create({ email })
            }

            const accessToken = jwt.sign(
                { id: user._id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            )

            const refreshToken = jwt.sign(
                { id: user._id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            )

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
            })

            res.json({
                message: isNewUser ? 'Account created' : 'Login successful',
                user: { id: user._id, email: user.email, name: user.name },
                isNewUser,
                accessToken
            })
        } catch (err) {
            console.error(err)
            res.status(500).json({ message: 'Server error' })
        }
    }
)

router.get('/me', generalLimiter, authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-__v')
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        res.json({ user: { id: user._id, email: user.email, name: user.name } })
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Server error' })
    }
})

router.put('/username',
    body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Name must be 1-50 characters'),
    validate,
    authenticate,
    usernameLimiter,
    async (req, res) => {
        try {
            const { name } = req.body
            const user = await User.findByIdAndUpdate(
                req.user.id,
                { name },
                { new: true }
            )
            res.json({ user: { id: user._id, email: user.email, name: user.name } })
        } catch (err) {
            console.error(err)
            res.status(500).json({ message: 'Server error' })
        }
    }
)

router.post('/refresh', (req, res) => {
    const refreshToken = req.cookies.refreshToken
    if (!refreshToken) {
        return res.status(401).json({ message: 'No refresh token' })
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET)
        const accessToken = jwt.sign(
            { id: decoded.id, email: decoded.email },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        )
        res.json({ accessToken })
    } catch (err) {
        return res.status(401).json({ message: 'Invalid refresh token' })
    }
})

router.post('/logout', (req, res) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    })
    res.json({ message: 'Logged out' })
})

module.exports = router
