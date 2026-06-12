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

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.body.email || req.ip,
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
    otpLimiter,
    async (req, res) => {
        try {
            const { email } = req.body
            const otp = crypto.randomInt(100000, 999999).toString()
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

            await Otp.deleteMany({ email })
            await Otp.create({ email, otp, expiresAt })

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
    otpLimiter,
    async (req, res) => {
        try {
            const { email, otp, mode } = req.body
            const otpRecord = await Otp.findOne({ email, otp })

            if (!otpRecord) {
                return res.status(400).json({ message: 'Invalid OTP' })
            }

            if (otpRecord.expiresAt < new Date()) {
                await Otp.deleteOne({ _id: otpRecord._id })
                return res.status(400).json({ message: 'OTP has expired' })
            }

            await Otp.deleteOne({ _id: otpRecord._id })

            let user = await User.findOne({ email })
            if (mode === 'login' && !user) {
                return res.status(400).json({ message: 'No account found with this email' })
            }
            if (mode === 'signup' && user) {
                return res.status(400).json({ message: 'An account with this email already exists' })
            }
            if (!user) {
                user = await User.create({ email })
            }

            const token = jwt.sign(
                { id: user._id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            )

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
            })

            res.json({
                message: 'Login successful',
                user: { id: user._id, email: user.email, name: user.name }
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
    usernameLimiter,
    authenticate,
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

router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    })
    res.json({ message: 'Logged out' })
})

module.exports = router