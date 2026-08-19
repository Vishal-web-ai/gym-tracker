import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import SavedSession from './SavedSession'
import { getSessions, deleteSession, removeExerciseMedia } from '../services/storage'
import { deleteMedia } from '../services/media'
import { getErrorMessage } from '../services/errors'

const WorkoutHistory = ({ onClose, onDeleted }) => {
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')

    useEffect(() => {
        let cancelled = false
        getSessions()
            .then(list => {
                if (!cancelled) {
                    setSessions(list)
                    setLoading(false)
                }
            })
            .catch(err => {
                if (!cancelled) {
                    setLoadError(getErrorMessage(err))
                    setLoading(false)
                }
            })
        return () => { cancelled = true }
    }, [])

    const handleDelete = async (id) => {
        try {
            await deleteSession(id)
            setSessions(prev => prev.filter(s => s.id !== id))
            if (onDeleted) onDeleted()
        } catch (err) {
            alert(getErrorMessage(err))
        }
    }

    const handleDeleteMedia = async (sessionId, exerciseIndex, mediaId) => {
        try {
            await deleteMedia(mediaId)
            const updated = await removeExerciseMedia(sessionId, exerciseIndex, mediaId)
            if (updated) {
                setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
            }
        } catch (err) {
            alert(getErrorMessage(err))
        }
    }

    return (
        <div className='fixed inset-0 bg-neutral-900 z-50 flex flex-col'>
            <div className='flex items-center justify-between px-5 h-16 border-b border-neutral-700 shrink-0'>
                <h1 className='text-white text-xl font-bold font-mono'>Workout History</h1>
                <X
                    onClick={onClose}
                    className='text-white cursor-pointer hover:opacity-70'
                    size={28}
                />
            </div>

            <div className='flex-1 overflow-y-auto p-4 scroll'>
                {loading ? (
                    <p className='text-orange-500/50 text-center font-mono py-10'>Loading...</p>
                ) : loadError ? (
                    <p className='text-red-400 text-center font-mono text-sm py-10'>{loadError}</p>
                ) : (
                    <SavedSession
                        sessions={sessions}
                        onDelete={handleDelete}
                        onDeleteMedia={handleDeleteMedia}
                        onUpdate={(updated) => {
                            setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
                        }}
                    />
                )}
            </div>
        </div>
    )
}

export default WorkoutHistory
