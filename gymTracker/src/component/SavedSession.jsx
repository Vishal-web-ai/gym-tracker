import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
const SavedSession = ({ sessions, onDelete }) => {
    const [expandedId, setExpandedId] = useState(null)
    if (sessions.length === 0) {
        return (
            <p className='text-neutral-400 text-center mt-10'>
                No saved sessions yet. Start a workout and hit Save!
            </p>
        )
    }
    return (
        <>
            {sessions.map((session) => (
                <div key={session.id} className='mb-3'>
                    <div
                        onClick={() =>
                            setExpandedId(expandedId === session.id ? null : session.id)
                        }
                        className='bg-neutral-700 p-4 rounded-xl cursor-pointer hover:bg-neutral-600 transition-colors'
                    >
                        <div className='flex items-center justify-between'>
                            <div>
                                <h2 className='text-white font-semibold text-lg'>
                                    {session.date}
                                </h2>
                                <p className='text-neutral-400 text-sm mt-1'>
                                    {session.exercises.map(e => e.name).join(', ')}
                                </p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDelete(session.id)
                                }}
                                className='text-red-400 hover:text-red-300 transition-colors p-1'
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                    {expandedId === session.id && (
                        <div className='bg-neutral-700/50 mt-1 rounded-xl p-4 space-y-3'>
                            {session.exercises.map((ex, i) => (
                                <div key={i} className='bg-neutral-600 p-3 rounded-lg'>
                                    <p className='text-white font-semibold'>{ex.name}</p>
                                    <p className='text-neutral-300 text-sm'>
                                        Weight: {ex.weight}
                                    </p>
                                    <p className='text-neutral-300 text-sm'>
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