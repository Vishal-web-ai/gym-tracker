import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, User, ChevronLeft, ChevronRight } from 'lucide-react'
import FloatingDumbbell from './FloatingDumbbell'
import ScheduleEditor from './ScheduleEditor'
import ChallengePicker from './ChallengePicker'
import { setName, saveUserProfile, saveSchedule } from '../services/storage'
import { imageFileToDataUrl } from '../services/photo'
import { saveStartRank, saveProgressionState, saveChallengePicks, DEFAULT_CHALLENGE_PICKS } from '../services/progression'

const inputClass =
    'bg-black/50 border border-orange-500/30 rounded-xl text-white font-mono text-center outline-none focus:border-orange-500 placeholder-neutral-600'

const cardClass =
    'relative rounded-2xl w-full max-w-lg px-5 py-8 flex flex-col h-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,107,26,0.2)] backdrop-blur-md'

const STEP_TITLES = [
    'WELCOME',
    'YOUR AGE',
    'YOUR WEIGHT',
    'YOUR HEIGHT',
    'YOUR EXPERIENCE',
    'YOUR PROFILE',
    'YOUR WEEK',
    'YOUR CHALLENGES'
]

const EXPERIENCE_LEVELS = [
    { level: 1, label: 'BEGINNER', desc: 'New to training (< 6 months)' },
    { level: 4, label: 'INTERMEDIATE', desc: 'Trained 6 months – 2 years' },
    { level: 6, label: 'ADVANCED', desc: 'Years of consistent lifting' }
]

const Onboarding = ({ onDone }) => {
    const [step, setStep] = useState(0)
    const [name, setNameState] = useState('')
    const [age, setAge] = useState('')
    const [weight, setWeight] = useState('')
    const [feet, setFeet] = useState('')
    const [inch, setInch] = useState('')
    const [photoUri, setPhotoUri] = useState(null)
    const [schedule, setSchedule] = useState({})
    const [challengePicks, setChallengePicks] = useState(() => ({ ...DEFAULT_CHALLENGE_PICKS, cardio: null }))
    const [experience, setExperience] = useState(null)
    const photoInputRef = useRef(null)

    const nameReady = name.trim().length > 0
    const hasSchedule = Object.values(schedule).some(list => Array.isArray(list) && list.length > 0)
    const canProceed = () => {
        switch (step) {
            case 0: return nameReady
            case 1: return age.trim().length > 0
            case 2: return weight.trim().length > 0
            case 3: return feet.trim().length > 0
            case 4: return experience != null
            case 5: return Boolean(photoUri)
            case 6: return hasSchedule
            case 7: return true
            default: return false
        }
    }

    const getHeightCm = () => {
        const ft = parseInt(feet, 10) || 0
        const inc = parseInt(inch, 10) || 0
        return String(Math.round(ft * 30.48 + inc * 2.54))
    }

    const handleStart = () => {
        if (nameReady) setStep(1)
    }

    const handleNext = () => {
        if (canProceed()) setStep(s => s + 1)
    }

    const handleBack = () => {
        setStep(s => (s > 1 ? s - 1 : 0))
    }

    const handlePhotoFile = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        try {
            const data = await imageFileToDataUrl(file)
            if (data) setPhotoUri(data)
        } catch {
            // ignore unreadable/unsupported image
        }
    }

    const persistProfile = async () => {
        await setName(name.trim() || 'Athlete')
        const profile = {
            age,
            weight,
            height: getHeightCm(),
            joinedAt: new Date().toISOString()
        }
        if (photoUri) profile.photoData = photoUri
        await saveUserProfile(profile)
        await saveSchedule(schedule)
        await saveChallengePicks(challengePicks)
        await saveStartRank(experience || 1)
        await saveProgressionState({ lastLevel: experience || 1 })
        onDone()
    }

    const progress = (current) => (
        <div className='flex items-center justify-center gap-1.5'>
            {STEP_TITLES.map((_, i) => (
                <div
                    key={i}
                    className='rounded-full transition-colors duration-300'
                    style={{
                        width: 32,
                        height: 4,
                        backgroundColor: i === current ? '#FF8C42' : 'rgba(255,255,255,0.3)'
                    }}
                />
            ))}
        </div>
    )

    const renderStep = () => {
        if (step === 0) {
            return (
                <div className='flex flex-col items-center gap-6 w-full'>
                    <div className='text-center'>
                        <motion.h1
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            className='font-bebas text-white tracking-[4px] leading-none'
                            style={{ fontSize: 'clamp(52px, 16vw, 96px)' }}
                        >
                            WELCOME
                        </motion.h1>
                        <motion.h2
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            className='font-bebas text-[#FF6B1A] tracking-[4px] leading-none'
                            style={{ fontSize: 'clamp(48px, 15vw, 88px)' }}
                        >
                            GYM TRACKER
                        </motion.h2>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.9 }}
                            className='mx-auto my-5'
                            style={{
                                width: 64,
                                height: 1,
                                backgroundColor: 'rgba(255,107,26,0.5)',
                                boxShadow: '0 0 8px rgba(255,107,26,0.3)'
                            }}
                        />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1.1 }}
                        className={cardClass}
                    >
                        <p className='text-center font-bebas tracking-[3px] mb-1 text-[#FF6B1A]' style={{ fontSize: 22 }}>
                            STEP INTO GREATNESS
                        </p>
                        <p className='text-center text-white font-mono mb-4' style={{ fontSize: 13 }}>
                            What should we call you?
                        </p>
                        <div className='border border-orange-500/40 rounded-2xl mb-5'>
                            <input
                                value={name}
                                onChange={(e) => setNameState(e.target.value)}
                                placeholder='Your name'
                                autoFocus
                                className='w-full text-white font-mono text-center bg-transparent outline-none'
                                style={{ padding: '12px 16px', fontSize: 16 }}
                            />
                        </div>
                        <button
                            onClick={handleStart}
                            disabled={!nameReady}
                            className='w-full rounded-2xl font-bebas tracking-[3px] text-center cursor-pointer transition-all duration-300 disabled:cursor-not-allowed'
                            style={{
                                padding: 14,
                                fontSize: 26,
                                backgroundColor: nameReady ? '#FF6B1A' : '#8B3A00',
                                color: nameReady ? '#000' : '#FF9A4A',
                                boxShadow: nameReady ? '0 0 24px rgba(255,107,26,0.5)' : 'none'
                            }}
                        >
                            BEGIN YOUR JOURNEY
                        </button>
                    </motion.div>
                </div>
            )
        }

        return (
            <div className='flex flex-col items-center gap-6 w-full h-full'>
                <motion.div
                    key={`card-${step}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={cardClass}
                >
                    <p className='text-center font-bebas text-[#FF6B1A] tracking-[3px] mb-1' style={{ fontSize: 26 }}>
                        {STEP_TITLES[step]}
                    </p>
                    <div className='mb-6'>
                        {progress(step)}
                    </div>

                    <div className='flex-1 min-h-0 w-full overflow-y-auto scroll flex flex-col'>
                        {step === 1 && (
                        <input
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            placeholder='Your age'
                            inputMode='numeric'
                            autoFocus
                            className={`${inputClass} w-full`}
                            style={{ padding: '12px 16px', fontSize: 18 }}
                        />
                    )}

                    {step === 2 && (
                        <input
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder='Weight (kg)'
                            inputMode='decimal'
                            autoFocus
                            className={`${inputClass} w-full`}
                            style={{ padding: '12px 16px', fontSize: 18 }}
                        />
                    )}

                    {step === 3 && (
                        <div className='flex items-center justify-center gap-3'>
                            <input
                                value={feet}
                                onChange={(e) => setFeet(e.target.value)}
                                placeholder='ft'
                                inputMode='numeric'
                                autoFocus
                                className={`${inputClass} w-24`}
                                style={{ padding: '12px 16px', fontSize: 18 }}
                            />
                            <input
                                value={inch}
                                onChange={(e) => setInch(e.target.value)}
                                placeholder='in'
                                inputMode='numeric'
                                className={`${inputClass} w-24`}
                                style={{ padding: '12px 16px', fontSize: 18 }}
                            />
                        </div>
                    )}

                    {step === 4 && (
                        <div className='flex flex-col gap-3 w-full'>
                            {EXPERIENCE_LEVELS.map(lvl => (
                                <button
                                    key={lvl.level}
                                    onClick={() => setExperience(lvl.level)}
                                    className={`w-full rounded-xl flex flex-col items-center gap-0.5 px-4 py-3 transition-all cursor-pointer ${
                                        experience === lvl.level
                                            ? 'bg-orange-500 text-black shadow-[0_0_24px_rgba(255,107,26,0.5)]'
                                            : 'bg-black/40 text-white/80 border border-orange-500/20 hover:border-orange-500/60'
                                    }`}
                                >
                                    <span className='font-bebas tracking-[2px] text-lg'>{lvl.label}</span>
                                    <span className={`font-mono text-[10px] ${experience === lvl.level ? 'text-black/70' : 'text-white/40'}`}>
                                        {lvl.desc}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 5 && (
                        <div className='flex flex-col items-center gap-6'>
                            <div className='relative'>
                                {photoUri ? (
                                    <img
                                        src={photoUri}
                                        alt='Profile'
                                        className='rounded-full border-2 border-orange-500 object-cover'
                                        style={{ width: 128, height: 128 }}
                                    />
                                ) : (
                                    <div
                                        className='rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center'
                                        style={{ width: 128, height: 128 }}
                                    >
                                        <User size={48} color='#f97316' />
                                    </div>
                                )}
                                <button
                                    onClick={() => photoInputRef.current?.click()}
                                    className='absolute -top-1 -right-1 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer'
                                    style={{ width: 32, height: 32 }}
                                    title='Add profile photo'
                                >
                                    <Camera size={18} color='black' />
                                </button>
                            </div>
                            <input
                                ref={photoInputRef}
                                type='file'
                                accept='image/*'
                                onChange={handlePhotoFile}
                                className='hidden'
                            />
                            {photoUri && (
                                <button
                                    onClick={() => setPhotoUri(null)}
                                    className='font-mono text-orange-500/70 text-sm cursor-pointer hover:text-orange-500 transition-colors'
                                >
                                    Remove photo
                                </button>
                            )}
                            <button
                                onClick={() => setStep(6)}
                                className='font-mono text-orange-500/70 text-sm cursor-pointer hover:text-orange-500 transition-colors'
                            >
                                Skip for now
                            </button>
                        </div>
                    )}

                    {step === 6 && (
                        <ScheduleEditor schedule={schedule} onChange={setSchedule} />
                    )}

                    {step === 7 && (
                        <ChallengePicker
                            schedule={schedule}
                            customExercises={[]}
                            picks={challengePicks}
                            onChange={setChallengePicks}
                        />
                    )}
                    </div>

                    <div className='flex gap-4 mt-6 pt-3' style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                        {step < STEP_TITLES.length - 1 ? (
                            <>
                                <button
                                    onClick={handleBack}
                                    className='flex-1 border border-orange-500/50 rounded-xl flex items-center justify-center gap-1 font-mono font-bold text-orange-500 cursor-pointer'
                                    style={{ padding: 12, fontSize: 16 }}
                                >
                                    <ChevronLeft size={20} />
                                    Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={!canProceed()}
                                    className='flex-1 rounded-xl flex items-center justify-center gap-1 font-mono font-bold transition-colors cursor-pointer disabled:cursor-not-allowed'
                                    style={{
                                        padding: 12,
                                        fontSize: 16,
                                        backgroundColor: canProceed() ? '#f97316' : 'rgba(249,115,22,0.3)',
                                        color: canProceed() ? '#000' : 'rgba(249,115,22,0.5)'
                                    }}
                                >
                                    Next
                                    <ChevronRight size={20} color={canProceed() ? 'black' : '#f97316'} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleBack}
                                    className='flex-1 border border-orange-500/50 rounded-xl flex items-center justify-center gap-1 font-mono font-bold text-orange-500 cursor-pointer'
                                    style={{ padding: 12, fontSize: 16 }}
                                >
                                    <ChevronLeft size={20} />
                                    Back
                                </button>
                                <button
                                    onClick={persistProfile}
                                    disabled={!hasSchedule}
                                    className='flex-1 rounded-xl font-mono font-bold transition-colors cursor-pointer disabled:cursor-not-allowed'
                                    style={{
                                        padding: 12,
                                        fontSize: 16,
                                        backgroundColor: hasSchedule ? '#f97316' : 'rgba(249,115,22,0.3)',
                                        color: hasSchedule ? '#000' : 'rgba(249,115,22,0.5)'
                                    }}
                                >
                                    Done
                                </button>
                            </>
                        )}
                    </div>

                    <p className='font-mono text-white text-center mt-3' style={{ fontSize: 11 }}>
                        {step + 1} of {STEP_TITLES.length}
                    </p>
                </motion.div>
            </div>
        )
    }

    return (
        <div
            className='w-full h-full text-white flex flex-col overflow-hidden relative'
            style={{ background: 'linear-gradient(-225deg, #050505 45%, #7c2d12 86%, #f97316 100%)' }}
        >
            <div className='absolute inset-0 pointer-events-none'>
                <FloatingDumbbell size={150} initialX={'-5%'} initialY={'5%'} travel={40} duration={9} rotate={35} />
                <FloatingDumbbell size={40} initialX={'82%'} initialY={'18%'} travel={60} duration={6} direction={-1} />
                <FloatingDumbbell size={28} initialX={'10%'} initialY={'78%'} travel={50} duration={7} delay={1.5} rotate={50} direction={-1} />
                <FloatingDumbbell size={64} initialX={'75%'} initialY={'70%'} travel={35} duration={8} delay={2.5} />
            </div>

            <div className='relative z-10 flex-1 overflow-y-auto scroll'>
                <div className='min-h-full flex flex-col px-4 py-6'>
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={step}
                            className='w-full flex flex-col items-center h-full'
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderStep()}
                        </motion.div>
                    </AnimatePresence>

                    {step === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.5, duration: 0.6 }}
                            className='mt-8 flex flex-col items-center gap-5'
                        >
                            {progress(0)}
                            <p className='font-mono text-white/40 tracking-[2px] text-[9px] text-center'>
                                DISCIPLINE • CONSISTENCY • STRENGTH
                            </p>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Onboarding
