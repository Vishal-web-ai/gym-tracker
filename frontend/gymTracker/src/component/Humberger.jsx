import { useState, useEffect } from 'react'
import { RiCloseLine } from '@remixicon/react'
import SavedSession from './SavedSession'
import api from '../services/api'

const Humberger = ({ isOpen, onClose }) => {
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetchSessions()
        }
    }, [isOpen])

    const fetchSessions = async () => {
        setLoading(true)
        try {
            const res = await api.get('/sessions')
            setSessions(res.data.sessions)
        } catch (err) {
            console.error('Failed to fetch sessions', err)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        try {
            await api.delete(`/sessions/${id}`)
            setSessions(prev => prev.filter(s => s._id !== id))
        } catch (err) {
            console.error('Failed to delete session', err)
        }
    }

    return (
        <>
            {isOpen && (
                <div onClick={onClose} className='fixed inset-0 bg-black/50 z-40' />
            )}
            <div
                className={`fixed top-0 left-0 h-full w-full max-w-sm bg-neutral-800 z-50 transform transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                } flex flex-col`}
            >
                <div className='flex items-center justify-between px-5 h-20 border-b border-neutral-600'>
                    <h1 className='text-white text-2xl font-bold'>Previous Sessions</h1>
                    <RiCloseLine
                        color="white"
                        size={36}
                        className='cursor-pointer hover:opacity-70'
                        onClick={onClose}
                    />
                </div>
                <div className='flex-1 overflow-y-auto p-4 scroll'>
                    {loading ? (
                        <p className='text-orange-500/50 text-center font-mono'>Loading...</p>
                    ) : (
                        <SavedSession sessions={sessions} onDelete={handleDelete} />
                    )}
                </div>
            </div>
        </>
    )
}

export default Humberger