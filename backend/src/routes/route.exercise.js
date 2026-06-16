const express = require('express')
const router = express.Router()
const Exercise = require('../model/model.exercise')
const authenticate = require('../middlewares/auth')
const rateLimit = require('express-rate-limit')
const { body, validationResult } = require('express-validator')

const exerciseLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { message: 'Too many requests' }
})

function validate(req, res, next) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
    }
    next()
}

router.get('/', authenticate, exerciseLimiter, async (req, res) => {
    try {
        const exercises = await Exercise.find({ user: req.user.id }).sort({ createdAt: -1 })
        res.json({ exercises })
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Server error' })
    }
})

router.post('/',
    authenticate,
    exerciseLimiter,
    body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Name must be 1-50 characters'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    validate,
    async (req, res) => {
        try {
            const { name, category, muscle } = req.body
            const exercise = await Exercise.create({
                user: req.user.id,
                name,
                category,
                muscle: muscle || ''
            })
            res.status(201).json({ exercise })
        } catch (err) {
            console.error(err)
            res.status(500).json({ message: 'Server error' })
        }
    }
)

router.put('/:id',
    authenticate,
    exerciseLimiter,
    body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Name must be 1-50 characters'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    validate,
    async (req, res) => {
        try {
            const { name, category, muscle } = req.body
            const exercise = await Exercise.findOneAndUpdate(
                { _id: req.params.id, user: req.user.id },
                { name, category, muscle: muscle || '' },
                { new: true }
            )
            if (!exercise) {
                return res.status(404).json({ message: 'Exercise not found' })
            }
            res.json({ exercise })
        } catch (err) {
            console.error(err)
            res.status(500).json({ message: 'Server error' })
        }
    }
)

router.delete('/:id', authenticate, exerciseLimiter, async (req, res) => {
    try {
        const exercise = await Exercise.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        })
        if (!exercise) {
            return res.status(404).json({ message: 'Exercise not found' })
        }
        res.json({ message: 'Exercise deleted' })
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Server error' })
    }
})

module.exports = router
