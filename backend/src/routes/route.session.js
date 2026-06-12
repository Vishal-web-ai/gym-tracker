const express = require('express')
const router = express.Router()
const Session = require('../model/model.session')
const authenticate = require('../middlewares/auth')
const rateLimit = require('express-rate-limit')
const { body, validationResult } = require('express-validator')

const sessionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many requests' }
})

const deleteLimiter = rateLimit({
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

router.post('/',
    authenticate,
    body('date').notEmpty().withMessage('Date is required'),
    body('exercises').isArray({ min: 1 }).withMessage('At least one exercise is required'),
    body('exercises.*.name').notEmpty().withMessage('Each exercise must have a name'),
    validate,
    sessionLimiter,
    async (req, res) => {
        try {
            const { date, name, exercises } = req.body
            const session = await Session.create({
                user: req.user.id,
                date,
                name: name || 'Workout',
                exercises
            })
            res.status(201).json({ session })
        } catch (err) {
            console.error(err)
            res.status(500).json({ message: 'Server error' })
        }
    }
)

router.get('/', authenticate, async (req, res) => {
    try {
        const sessions = await Session.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select('-__v')
        res.json({ sessions })
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Server error' })
    }
})

router.put('/:id',
    authenticate,
    body('name').trim().notEmpty().withMessage('Name is required'),
    validate,
    sessionLimiter,
    async (req, res) => {
        try {
            const { name } = req.body
            const session = await Session.findOneAndUpdate(
                { _id: req.params.id, user: req.user.id },
                { name },
                { new: true }
            ).select('-__v')
            if (!session) {
                return res.status(404).json({ message: 'Session not found' })
            }
            res.json({ session })
        } catch (err) {
            console.error(err)
            res.status(500).json({ message: 'Server error' })
        }
    }
)

router.delete('/:id', deleteLimiter, authenticate, async (req, res) => {
    try {
        const session = await Session.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        })
        if (!session) {
            return res.status(404).json({ message: 'Session not found' })
        }
        res.json({ message: 'Session deleted' })
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Server error' })
    }
})

module.exports = router