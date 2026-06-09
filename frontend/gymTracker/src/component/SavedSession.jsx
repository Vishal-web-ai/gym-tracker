import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'

const SavedSession = ({ sessions, onDelete }) => {
    const [expandedId, setExpandedId] = useState(null)

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
                            <div>
                                <h2 className='text-orange-400 font-semibold font-mono text-lg'>
                                    {session.date}
                                </h2>
                                <p className='text-orange-500/50 font-mono text-sm mt-1'>
                                    {session.exercises.map(e => e.name).join(', ')}
                                </p>
                            </div>
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

                    {expandedId === session._id && (
                        <div className='bg-orange-500/5 border border-orange-500/20 mt-1 rounded-xl p-4 space-y-3'>
                            {session.exercises.map((ex, i) => (
                                <div key={i} className='bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/50 p-3 rounded-lg transition-all duration-300'>
                                    <p className='text-orange-400 font-semibold font-mono'>{ex.name}</p>
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
        </>
    )
}

export default SavedSession