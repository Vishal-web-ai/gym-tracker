const mongoose = require('mongoose')

const sessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        default: ''
    },
    date: {
        type: String,
        required: true
    },
    exercises: [{
        name: { type: String, required: true },
        weight: { type: String, default: '—' },
        sets: [{ type: String }],
        notes: { type: String, default: '' }
    }]
}, { timestamps: true })

module.exports = mongoose.model('Session', sessionSchema)