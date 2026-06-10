import { useState } from 'react'
import { Mail, KeyRound, Dumbbell } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [step, setStep] = useState('email') // 'email' | 'otp'
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSendOtp = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            await api.post('/auth/send-otp', { email })
            setStep('otp')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP')
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyOtp = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await api.post('/auth/verify-otp', { email, otp })
            login(res.data.user, res.data.token)
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP')
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
                <h1 className='text-3xl font-bold text-white text-center mb-2'>Gym Tracker</h1>
                <p className='text-orange-500/70 text-center mb-8 font-mono'>
                    {step === 'email' ? 'Enter your email to receive an OTP' : 'Enter the OTP sent to your email'}
                </p>

                {error && (
                    <p className='text-red-400 text-center mb-4 font-mono text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3'>
                        {error}
                    </p>
                )}

                {step === 'email' ? (
                    <form onSubmit={handleSendOtp} className='flex flex-col gap-4'>
                        <div className='relative'>
                            <Mail className='absolute left-4 top-1/2 -translate-y-1/2 text-orange-500' size={20} />
                            <input
                                type='email'
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder='your@email.com'
                                required
                                className='w-full bg-black/50 border border-orange-500/30 rounded-xl px-12 py-4 text-white placeholder-orange-500/50 outline-none focus:border-orange-500 transition-all font-mono'
                            />
                        </div>
                        <button
                            type='submit'
                            disabled={loading}
                            className='w-full bg-orange-500 hover:bg-orange-400 text-black font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 cursor-pointer'
                        >
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className='flex flex-col gap-4'>
                        <p className='text-orange-500/50 text-center font-mono text-sm'>
                            OTP sent to <span className='text-orange-400'>{email}</span>
                        </p>
                        <button
                            type='button'
                            onClick={() => setStep('email')}
                            className='text-orange-500/50 hover:text-orange-400 text-sm font-mono transition-all cursor-pointer'
                        >
                            ← Change email
                        </button>
                        <div className='relative'>
                            <KeyRound className='absolute left-4 top-1/2 -translate-y-1/2 text-orange-500' size={20} />
                            <input
                                type='text'
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder='Enter 6-digit OTP'
                                required
                                maxLength={6}
                                className='w-full bg-black/50 border border-orange-500/30 rounded-xl px-12 py-4 text-white placeholder-orange-500/50 outline-none focus:border-orange-500 transition-all font-mono text-center text-2xl tracking-[.5em]'
                            />
                        </div>
                        <button
                            type='submit'
                            disabled={loading || otp.length !== 6}
                            className='w-full bg-orange-500 hover:bg-orange-400 text-black font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 cursor-pointer'
                        >
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
