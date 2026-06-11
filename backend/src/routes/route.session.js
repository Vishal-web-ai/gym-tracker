const express = require('express')
const router = express.Router()
const Session = require('../model/model.session')
const authenticate = require('../middlewares/auth')

router.post('/', authenticate, async (req, res) => {
    try {
        const { date, name, exercises } = req.body
        if (!date || !exercises || !exercises.length) {
            return res.status(400).json({ message: 'Date and exercises are required' })
        }

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
})

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

router.delete('/:id', authenticate, async (req, res) => {
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