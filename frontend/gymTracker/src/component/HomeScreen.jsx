import { useState } from 'react'
import { RiMenuLine } from '@remixicon/react'
import { Dumbbell } from 'lucide-react'
import ExercisesList from './ExercisesList'
import SessionTracker from './SessionTracker'
import Humberger from './Humberger'

const HomeScreen = () => {
    const [showSession, setShowSession] = useState(false)
    const [showExercisesList, setShowExercisesList] = useState(false)
    const [selectedExercises, setSelectedExercises] = useState([])
    const [isFromStart, setIsFromStart] = useState(false)
    const [isHamburgerOpen, setIsHamburgerOpen] = useState(false)

    const handleSelectExercise = (exerciseName) => {
        setSelectedExercises([...selectedExercises, { name: exerciseName }])
        setShowExercisesList(false)
        setIsFromStart(false)
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

    const handleSessionSaved = () => {
        setSelectedExercises([])
        setShowSession(false)
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
                <div className='max-sm:mt-2 sm:mt-3 lg:mt-10'>
                    <Dumbbell size={40} className='sm:size-[60]' />
                </div>
            </div>

            {!showSession ? (
                /* Landing view */
                <div className='flex-1 w-full flex flex-col items-center justify-center gap-6 sm:gap-8 px-6 relative z-10 pb-24 sm:pb-0'>
                    <h1 className='border border-orange-500 text-orange-500 tracking-wider text-center text-xl sm:text-3xl px-4 sm:px-6 py-2 rounded-2xl font-bebas'>
                        Gym Tracker
                    </h1>
                    <h1 className='text-4xl sm:text-6xl lg:text-8xl font-inter text-center leading-tight'>
                        What would you<br />like to do{' '}
                        <span className='font-bold text-orange-500'>today?</span>
                    </h1>
                    <button
                        onClick={handleStartClick}
                        className='mt-4 sm:mt-8 px-6 sm:px-7 py-2 sm:py-3 text-2xl sm:text-3xl font-semibold rounded-2xl cursor-pointer border border-transparent hover:border-orange-500 hover:bg-orange-500/10 hover:text-orange-500 transition-all duration-300 flex items-center gap-3 group'
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
                    key={showExercisesList}
                    className='scroll flex-1 w-full flex justify-center items-start sm:items-center p-4 sm:p-5 animate-slideUp overflow-y-auto relative z-10'
                >
                    {showExercisesList ? (
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