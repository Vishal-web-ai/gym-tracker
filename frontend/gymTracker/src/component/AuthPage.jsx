import { useState, useEffect } from 'react'
import { Mail, KeyRound, Dumbbell } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
    const { login } = useAuth()
    const [email, setEmail] = useState(() => sessionStorage.getItem('pendingEmail') || '')
    const [otp, setOtp] = useState('')
    const [step, setStep] = useState(() => sessionStorage.getItem('pendingStep') || 'email')
    const [mode, setMode] = useState(() => sessionStorage.getItem('pendingMode') || 'login')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (step === 'otp') {
            sessionStorage.setItem('pendingEmail', email)
            sessionStorage.setItem('pendingMode', mode)
            sessionStorage.setItem('pendingStep', 'otp')
        } else {
            sessionStorage.removeItem('pendingEmail')
            sessionStorage.removeItem('pendingMode')
            sessionStorage.removeItem('pendingStep')
        }
    }, [step, email, mode])

    const handleSendOtp = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            await api.post('/auth/send-otp', { email, mode })
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
            const res = await api.post('/auth/verify-otp', { email, otp, mode })
            sessionStorage.removeItem('pendingEmail')
            sessionStorage.removeItem('pendingMode')
            sessionStorage.removeItem('pendingStep')
            login(res.data.user)
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP')
        } finally {
            setLoading(false)
        }
    }

    const handleChangeEmail = () => {
        setStep('email')
        sessionStorage.removeItem('pendingEmail')
        sessionStorage.removeItem('pendingMode')
        sessionStorage.removeItem('pendingStep')
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
                    {step === 'email'
                        ? (mode === 'login'
                            ? 'Welcome back! Enter your email to receive an OTP'
                            : 'Create your account. Enter your email to receive an OTP')
                        : 'Enter the OTP sent to your email'}
                </p>

                {step === 'email' && (
                    <div className='flex bg-black/30 rounded-xl p-1 mb-6'>
                        <button
                            type='button'
                            onClick={() => { setMode('login'); setError('') }}
                            className={`flex-1 py-3 rounded-lg font-mono text-sm font-bold transition-all cursor-pointer ${
                                mode === 'login'
                                    ? 'bg-orange-500 text-black'
                                    : 'text-orange-500/50 hover:text-orange-400'
                            }`}
                        >
                            Login
                        </button>
                        <button
                            type='button'
                            onClick={() => { setMode('signup'); setError('') }}
                            className={`flex-1 py-3 rounded-lg font-mono text-sm font-bold transition-all cursor-pointer ${
                                mode === 'signup'
                                    ? 'bg-orange-500 text-black'
                                    : 'text-orange-500/50 hover:text-orange-400'
                            }`}
                        >
                            Create your profile
                        </button>
                    </div>
                )}

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
                            onClick={handleChangeEmail}
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