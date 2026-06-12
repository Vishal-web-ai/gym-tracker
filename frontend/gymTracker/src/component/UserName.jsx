import { useState } from 'react'
import { User, Dumbbell } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function UserName({ onComplete }) {
    const { user, login } = useAuth()
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!name.trim()) return
        setLoading(true)
        setError('')
        try {
            const res = await api.put('/auth/username', { name: name.trim() })
            login(res.data.user)
            onComplete()
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save name')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            className='w-screen h-screen flex items-center justify-center'
            style={{ background: 'linear-gradient(-225deg, #111111 45%, #9a3412 86%, #f97316 100%)' }}
        >
            <div className='w-full max-w-md mx-4'>
                <div className='flex justify-center mb-8'>
                    <Dumbbell size={60} className='text-orange-500' />
                </div>
                <h1 className='text-3xl font-bold text-white text-center mb-2'>Welcome!</h1>
                <p className='text-orange-500/70 text-center mb-8 font-mono'>
                    Set your username to get started
                </p>

                {error && (
                    <p className='text-red-400 text-center mb-4 font-mono text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3'>
                        {error}
                    </p>
                )}

                <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                    <div className='relative'>
                        <User className='absolute left-4 top-1/2 -translate-y-1/2 text-orange-500' size={20} />
                        <input
                            type='text'
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder='Your username'
                            required
                            maxLength={30}
                            className='w-full bg-black/50 border border-orange-500/30 rounded-xl px-12 py-4 text-white placeholder-orange-500/50 outline-none focus:border-orange-500 transition-all font-mono'
                        />
                    </div>
                    <button
                        type='submit'
                        disabled={loading || !name.trim()}
                        className='w-full bg-orange-500 hover:bg-orange-400 text-black font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 cursor-pointer'
                    >
                        {loading ? 'Saving...' : 'Continue'}
                    </button>
                </form>
            </div>
        </div>
    )
}