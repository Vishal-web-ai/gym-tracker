import { useState } from 'react'
import { RiMenuLine, RiCheckLine } from '@remixicon/react'
import { Dumbbell } from 'lucide-react'
import ExercisesList from './ExercisesList'
import SessionTracker from './SessionTracker'
import Humberger from './Humberger'
import ExerciseDetail from './ExerciseDetail'
import GreetingUser from './GreetingUser'

const HomeScreen = () => {
    const [showSession, setShowSession] = useState(false)
    const [showExercisesList, setShowExercisesList] = useState(false)
    const [selectedExercises, setSelectedExercises] = useState([])
    const [previewExercise, setPreviewExercise] = useState(null)
    const [isFromStart, setIsFromStart] = useState(false)
    const [isHamburgerOpen, setIsHamburgerOpen] = useState(false)
    const [exerciseWeights, setExerciseWeights] = useState({})
    const [exerciseSets, setExerciseSets] = useState({})
    const [showSuccess, setShowSuccess] = useState(false)
    const [savedWorkoutName, setSavedWorkoutName] = useState('')

    const setWeight = (idx, weight) => {
        setExerciseWeights(prev => ({ ...prev, [idx]: weight }))
    }

    const setReps = (exerciseIdx, setIdx, value) => {
        setExerciseSets(prev => ({
            ...prev,
            [exerciseIdx]: {
                ...prev[exerciseIdx],
                [setIdx]: value
            }
        }))
    }

    const handleSelectExercise = (exercise) => {
        setPreviewExercise(exercise)
    }

    const handleConfirmExercise = (exercise) => {
        setSelectedExercises([...selectedExercises, { name: exercise.name }])
        setPreviewExercise(null)
        setShowExercisesList(false)
        setIsFromStart(false)
    }

    const handleCancelPreview = () => {
        setPreviewExercise(null)
    }

    const handleRemoveExercise = (idx) => {
        setSelectedExercises(selectedExercises.filter((_, i) => i !== idx))
    }

    const handleStartClick = () => {
        setShowSession(true)
        setShowExercisesList(true)
        setIsFromStart(true)
    }

    const handleAddExercises = () => {
        setShowExercisesList(true)
        setIsFromStart(false)
    }

    const handleCloseExercises = () => {
        setShowExercisesList(false)
        if (isFromStart) {
            setShowSession(false)
            setSelectedExercises([])
        }
    }

    const handleSessionSaved = (name) => {
        setSelectedExercises([])
        setExerciseWeights({})
        setExerciseSets({})
        setSavedWorkoutName(name)
        setShowSuccess(true)
        setTimeout(() => {
            setShowSuccess(false)
            setShowSession(false)
            setSavedWorkoutName('')
        }, 1800)
    }

    return (
        <div
            className='w-screen h-screen text-white flex flex-col overflow-hidden relative'
            style={{ background: 'linear-gradient(-225deg, #111111 45%, #9a3412 86%, #f97316 100%)' }}
        >
            {/* Header */}
            <div className='w-full flex items-center justify-between px-4 sm:px-5 h-16 sm:h-20 relative z-10 shrink-0'>
                <div className='cursor-pointer' onClick={() => setIsHamburgerOpen(true)}>
                    <RiMenuLine color="white" size={36} className='sm:size-[50]' />
                </div>
                <div className='flex items-center mt-0'>
                    <Dumbbell size={40} className='sm:size-[60]' />
                </div>
            </div>

            {showSuccess ? (
                /* Success overlay */
                <div className='flex-1 w-full flex flex-col items-center justify-center gap-6 px-6 relative z-10 animate-fadeIn'>
                    <div className='bg-orange-500 rounded-full p-5 animate-popIn'>
                        <RiCheckLine color="black" size={48} />
                    </div>
                    <div className='animate-popIn text-center'>
                        <p className='text-orange-500 text-4xl sm:text-5xl font-bold font-cursive'>
                            {savedWorkoutName}
                        </p>
                    </div>
                    <p className='text-white/70 text-xl font-mono tracking-wide'>
                        Workout Saved!
                    </p>
                </div>
            ) : !showSession ? (
                /* Landing view */
                <div className='flex-1 w-full flex flex-col items-center justify-center gap-6 sm:gap-8 px-6 relative z-10 pb-16 sm:pb-0 animate-slideUp'>
                    <GreetingUser />
                    <h1 className='border border-orange-500 text-orange-500 tracking-wider text-center text-xl sm:text-3xl px-4 sm:px-6 py-2 rounded-2xl font-bebas'>
                        Gym Tracker
                    </h1>
                    <h1 className='text-4xl sm:text-6xl lg:text-7xl font-inter text-center leading-tight'>
                        What would you<br />like to do{' '}
                        <span className='font-bold text-orange-500'>today?</span>
                    </h1>
                    <button
                        onClick={handleStartClick}
                        className='mt-4 sm:mt-8 px-6 sm:px-7 py-2 sm:py-3 text-2xl sm:text-3xl font-semibold rounded-2xl cursor-pointer border border-orange-500 text-orange-500 transition-all duration-300 flex items-center gap-3 group'
                    >
                        Start Session
                        <span className='text-3xl sm:text-4xl font-semibold text-orange-500 tracking-[.4em] group-hover:translate-x-2 transition-transform duration-300'>
                            →
                        </span>
                    </button>
                </div>
            ) : (
                /* Session view */
                <div
                    key={showExercisesList || previewExercise}
                    className='scroll flex-1 w-full flex justify-center items-center p-4 sm:p-5 animate-slideUp overflow-y-auto relative z-10'
                >
                    {previewExercise ? (
                        <ExerciseDetail
                            exercise={previewExercise}
                            onSelect={handleConfirmExercise}
                            onBack={handleCancelPreview}
                        />
                    ) : showExercisesList ? (
                        <ExercisesList
                            onSelectExercise={handleSelectExercise}
                            onClose={handleCloseExercises}
                        />
                    ) : (
                        <SessionTracker
                            exercises={selectedExercises}
                            onRemove={handleRemoveExercise}
                            onAddExercises={handleAddExercises}
                            onSessionSaved={handleSessionSaved}
                            exerciseWeights={exerciseWeights}
                            exerciseSets={exerciseSets}
                            setWeight={setWeight}
                            setReps={setReps}
                        />
                    )}
                </div>
            )}

            <Humberger
                isOpen={isHamburgerOpen}
                onClose={() => setIsHamburgerOpen(false)}
            />
        </div>
    )
}

export default HomeScreen