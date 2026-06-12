import { useState, useEffect } from 'react'
import { RiCloseLine, RiLogoutCircleLine, RiEditLine } from '@remixicon/react'
import SavedSession from './SavedSession'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const Humberger = ({ isOpen, onClose }) => {
    const { user, logout, updateUser } = useAuth()
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(false)
    const [showNameModal, setShowNameModal] = useState(false)
    const [newName, setNewName] = useState('')
    const [saving, setSaving] = useState(false)

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

    const handleOpenNameModal = () => {
        setNewName(user?.name || '')
        setShowNameModal(true)
    }

    const handleSaveName = async () => {
        if (!newName.trim()) return
        setSaving(true)
        try {
            const res = await api.put('/auth/username', { name: newName.trim() })
            updateUser(res.data.user)
            setShowNameModal(false)
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to save name'
            alert(msg)
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            {isOpen && (
                <div onClick={onClose} className='fixed inset-0 bg-black/50 z-40' />
            )}
            <div
                className={`fixed top-0 left-0 h-full w-full max-w-sm bg-neutral-800 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
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
                        <SavedSession
                            sessions={sessions}
                            onDelete={handleDelete}
                            onUpdate={(updated) => {
                                setSessions(prev => prev.map(s => s._id === updated._id ? updated : s))
                            }}
                        />
                    )}
                </div>
                <div className='border-t border-neutral-600 p-4 flex flex-col gap-3'>
                    <button
                        onClick={handleOpenNameModal}
                        className='w-full flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-mono font-bold py-3 px-4 rounded-xl transition-all cursor-pointer'
                    >
                        <RiEditLine size={20} />
                        Change Username
                    </button>
                    <button
                        onClick={logout}
                        className='w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-mono font-bold py-3 px-4 rounded-xl transition-all cursor-pointer'
                    >
                        <RiLogoutCircleLine size={20} />
                        Logout
                    </button>
                </div>
            </div>

            {/* Name edit modal */}
            {showNameModal && (
                <div className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4'>
                    <div className='bg-neutral-800 border border-orange-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-popIn'>
                        <h2 className='text-white text-xl font-bold font-mono mb-4'>Change Username</h2>
                        <input
                            type='text'
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder='Enter your name'
                            className='w-full bg-neutral-900 text-white border border-orange-500/30 rounded-xl px-4 py-3 font-mono outline-none focus:border-orange-500 placeholder-neutral-500'
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveName()
                            }}
                        />
                        <div className='flex gap-3 mt-6'>
                            <button
                                onClick={() => setShowNameModal(false)}
                                className='flex-1 border border-neutral-600 text-white font-semibold py-3 rounded-xl hover:bg-neutral-700 transition-all duration-300 cursor-pointer font-mono'
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveName}
                                disabled={saving || !newName.trim()}
                                className='flex-1 bg-orange-500 text-black font-bold py-3 rounded-xl hover:bg-orange-400 transition-all duration-300 cursor-pointer font-mono disabled:opacity-50'
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Humberger