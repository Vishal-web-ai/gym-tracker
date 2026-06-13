import React, { useState } from 'react'
import { Trash2, Pencil, StickyNote, X } from 'lucide-react'
import api from '../services/api'

const SavedSession = ({ sessions, onDelete, onUpdate }) => {
    const [expandedId, setExpandedId] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const [editName, setEditName] = useState('')
    const [saving, setSaving] = useState(false)
    const [notesPopup, setNotesPopup] = useState({ open: false, text: '' })

    const getDay = (dateStr) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return days[new Date(dateStr).getDay()]
    }

    const startEditing = (session) => {
        setEditingId(session._id)
        setEditName(session.name || 'Workout')
    }

    const cancelEditing = () => {
        setEditingId(null)
        setEditName('')
    }

    const saveName = async () => {
        if (!editName.trim() || saving) return
        setSaving(true)
        try {
            const res = await api.put(`/sessions/${editingId}`, { name: editName.trim() })
            if (onUpdate) onUpdate(res.data.session)
            setEditingId(null)
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to update name'
            alert(msg)
        } finally {
            setSaving(false)
        }
    }

    if (sessions.length === 0) {
        return (
            <p className='text-orange-500/50 text-center mt-10 font-mono tracking-wide'>
                No saved sessions yet. Start a workout and hit Save!
            </p>
        )
    }

    return (
        <>
            {sessions.map((session) => (
                <div key={session._id} className='mb-3'>
                    <div
                        onClick={() =>
                            setExpandedId(expandedId === session._id ? null : session._id)
                        }
                        className='bg-orange-500/10 border border-orange-500/30 hover:border-orange-500/70 hover:bg-orange-500/15 p-4 rounded-xl cursor-pointer transition-all duration-300'
                    >
                        <div className='flex items-center justify-between'>
                            <div className='flex-1 min-w-0'>
                                {editingId === session._id ? (
                                    <input
                                        type='text'
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={saveName}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveName()
                                            if (e.key === 'Escape') cancelEditing()
                                        }}
                                        className='w-full bg-neutral-700 text-orange-400 font-bold font-mono text-lg px-2 py-1 rounded border border-orange-500/50 outline-none focus:border-orange-500'
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <h2 className='text-orange-400 font-bold font-mono text-lg truncate'>
                                        {session.name || 'Workout'}
                                    </h2>
                                )}
                                <p className='text-orange-500/50 font-mono text-sm mt-0.5'>
                                    {session.date}, {getDay(session.date)}
                                </p>
                            </div>
                            <div className='flex items-center gap-2 shrink-0 ml-3'>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        startEditing(session)
                                    }}
                                    className='border border-orange-500/40 text-orange-400 hover:bg-orange-500 hover:text-black p-2 rounded-lg transition-all duration-300'
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDelete(session._id)
                                    }}
                                    className='border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-black p-2 rounded-lg transition-all duration-300'
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {expandedId === session._id && (
                        <div className='bg-orange-500/5 border border-orange-500/20 mt-1 rounded-xl p-4 space-y-3'>
                            {session.exercises.map((ex, i) => (
                                <div key={i} className='bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/50 p-3 rounded-lg transition-all duration-300'>
                                    <div className='flex items-center justify-between'>
                                        <p className='text-orange-400 font-semibold font-mono'>{ex.name}</p>
                                        {ex.notes && (
                                            <button
                                                onClick={() => setNotesPopup({ open: true, text: ex.notes })}
                                                className='text-neutral-400 hover:text-orange-500 p-1 rounded-lg transition-all duration-300 cursor-pointer'
                                            >
                                                <StickyNote size={18} />
                                            </button>
                                        )}
                                    </div>
                                    <p className='text-orange-500/60 font-mono text-sm mt-1'>
                                        Weight: {ex.weight}
                                    </p>
                                    <p className='text-orange-500/60 font-mono text-sm'>
                                        Sets: {ex.sets.filter(s => s !== '—').join(' × ') || '—'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            {notesPopup.open && (
                <div
                    className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4'
                    onClick={() => setNotesPopup({ open: false, text: '' })}
                >
                    <div
                        className='bg-neutral-800 border border-orange-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-popIn'
                        onClick={e => e.stopPropagation()}
                    >
                        <div className='flex justify-between items-center mb-4'>
                            <h2 className='text-orange-400 font-bold font-mono text-lg'>Notes</h2>
                            <button
                                onClick={() => setNotesPopup({ open: false, text: '' })}
                                className='text-neutral-400 hover:text-white transition-all duration-300 cursor-pointer'
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <p className='text-white font-mono text-sm whitespace-pre-wrap'>{notesPopup.text}</p>
                    </div>
                </div>
            )}
        </>
    )
}

export default SavedSession