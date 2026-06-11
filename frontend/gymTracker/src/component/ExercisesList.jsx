import React from 'react'

const ExercisesList = ({ onSelectExercise, onClose }) => {
    const exercisesData = [
        {
            category: 'Chest',
            items: [
                { name: 'Flat Bench Press', muscle: 'Chest (Middle)', image: '/exercises/flat-bench-press.jpg' },
                { name: 'Incline Bench Press', muscle: 'Chest (Upper)', image: '/exercises/incline-bench-press.png' },
                { name: 'Decline Bench Press', muscle: 'Chest (Lower)', image: '/exercises/decline-bench-press.png' },
                { name: 'Machine Chest Press', muscle: 'Chest', image: '/exercises/machine-chest-press.png' },
                { name: 'Pec Fly', muscle: 'Chest (Inner)', image: '/exercises/pec-fly.png' },
                { name: 'Cable Crossover', muscle: 'Chest', image: '/exercises/cable-crossover.png' },
                { name: 'Push-Up', muscle: 'Chest', image: '/exercises/push-up.png' },
                { name: 'Chest Dip', muscle: 'Chest (Lower)', image: '/exercises/chest-dips.png' },
                { name: 'Low Cable Fly', muscle: 'Chest (Upper)', image: '/exercises/low-cabel-fly.png' },
                { name: 'High Cable Fly', muscle: 'Chest (Lower)', image: '/exercises/high-cable-fly.png' }
            ]
        },
        {
            category: 'Back',
            items: [
                { name: 'Lat Pulldown', muscle: 'Lats', image: '' },
                { name: 'Seated Cable Row', muscle: 'Middle Back', image: '' },
                { name: 'Wide Row', muscle: 'Upper Back', image: '' },
                { name: 'Deadlift', muscle: 'Full Back / Posterior Chain', image: '' },
                { name: 'Barbell Row', muscle: 'Middle Back', image: '' },
                { name: 'T-Bar Row', muscle: 'Middle Back', image: '' },
                { name: 'Pull-Up', muscle: 'Lats', image: '' },
                { name: 'Chin-Up', muscle: 'Lats / Biceps', image: '' },
                { name: 'Single Arm Dumbbell Row', muscle: 'Middle Back', image: '' },
                { name: 'Straight Arm Pulldown', muscle: 'Lats', image: '' }
            ]
        },
        {
            category: 'Biceps',
            items: [
                { name: 'Barbell Curl', muscle: 'Biceps (Long Head)', image: '' },
                { name: 'Dumbbell Curl', muscle: 'Biceps', image: '' },
                { name: 'Hammer Curl', muscle: 'Brachialis / Brachioradialis', image: '' },
                { name: 'Concentration Curl', muscle: 'Biceps (Short Head)', image: '' },
                { name: 'Preacher Curl', muscle: 'Biceps (Lower)', image: '' },
                { name: 'Cable Curl', muscle: 'Biceps', image: '' },
                { name: 'Incline Dumbbell Curl', muscle: 'Biceps (Long Head)', image: '' },
                { name: 'Spider Curl', muscle: 'Biceps', image: '' },
                { name: 'Reverse Curl', muscle: 'Brachioradialis', image: '' }
            ]
        },
        {
            category: 'Triceps',
            items: [
                { name: 'Tricep Pushdown', muscle: 'Triceps (Lateral Head)', image: '' },
                { name: 'Skull Crusher', muscle: 'Triceps (Long Head)', image: '' },
                { name: 'Overhead Tricep Extension', muscle: 'Triceps (Long Head)', image: '' },
                { name: 'Close Grip Bench Press', muscle: 'Triceps', image: '' },
                { name: 'Tricep Dips', muscle: 'Triceps (Lower)', image: '' },
                { name: 'Cable Overhead Extension', muscle: 'Triceps (Long Head)', image: '' },
                { name: 'Single Arm Pushdown', muscle: 'Triceps', image: '' },
                { name: 'Tricep Kickback', muscle: 'Triceps', image: '' },
                { name: 'JM Press', muscle: 'Triceps', image: '' }
            ]
        },
        {
            category: 'Arms',
            items: [
                { name: 'Wrist Curl', muscle: 'Forearm Flexors', image: '' },
                { name: 'Reverse Wrist Curl', muscle: 'Forearm Extensors', image: '' }
            ]
        },
        {
            category: 'Shoulders',
            items: [
                { name: 'Overhead Press', muscle: 'Front / Side Delts', image: '' },
                { name: 'Lateral Raises', muscle: 'Side Delts', image: '' },
                { name: 'Rear Delt Fly', muscle: 'Rear Delts', image: '' },
                { name: 'Arnold Press', muscle: 'All Delts', image: '' },
                { name: 'Front Raise', muscle: 'Front Delts', image: '' },
                { name: 'Upright Row', muscle: 'Side Delts / Traps', image: '' },
                { name: 'Cable Lateral Raise', muscle: 'Side Delts', image: '' },
                { name: 'Face Pull', muscle: 'Rear Delts', image: '' },
                { name: 'Shrugs', muscle: 'Traps', image: '' },
                { name: 'Machine Shoulder Press', muscle: 'Front / Side Delts', image: '' },
                { name: 'Reverse Pec Deck', muscle: 'Rear Delts', image: '' }
            ]
        },
        {
            category: 'Legs',
            items: [
                { name: 'Leg Press', muscle: 'Quads / Glutes', image: '' },
                { name: 'Squat', muscle: 'Quads / Glutes / Core', image: '' },
                { name: 'Romanian Deadlift', muscle: 'Hamstrings / Glutes', image: '' },
                { name: 'Hamstring Curl', muscle: 'Hamstrings', image: '' },
                { name: 'Barbell Back Squat', muscle: 'Quads / Glutes', image: '' },
                { name: 'Front Squat', muscle: 'Quads', image: '' },
                { name: 'Bulgarian Split Squat', muscle: 'Quads / Glutes', image: '' },
                { name: 'Leg Extension', muscle: 'Quads', image: '' },
                { name: 'Calf Raise', muscle: 'Calves', image: '' },
                { name: 'Hip Thrust', muscle: 'Glutes', image: '' },
                { name: 'Sumo Squat', muscle: 'Adductors / Glutes', image: '' },
                { name: 'Hack Squat', muscle: 'Quads', image: '' },
                { name: 'Walking Lunges', muscle: 'Quads / Glutes', image: '' },
                { name: 'Step-Up', muscle: 'Quads / Glutes', image: '' },
                { name: 'Glute Kickback', muscle: 'Glutes', image: '' }
            ]
        },
        {
            category: 'Core',
            items: [
                { name: 'Plank', muscle: 'Core (Overall)', image: '' },
                { name: 'Crunch', muscle: 'Upper Abs', image: '' },
                { name: 'Hanging Leg Raise', muscle: 'Lower Abs', image: '' },
                { name: 'Cable Crunch', muscle: 'Upper Abs', image: '' },
                { name: 'Ab Wheel Rollout', muscle: 'Full Core', image: '' },
                { name: 'Russian Twist', muscle: 'Obliques', image: '' },
                { name: 'Bicycle Crunch', muscle: 'Obliques / Abs', image: '' },
                { name: 'Side Plank', muscle: 'Obliques', image: '' },
                { name: 'Decline Sit-Up', muscle: 'Upper Abs', image: '' },
                { name: 'Wood Chop', muscle: 'Obliques / Core', image: '' },
                { name: 'Dead Bug', muscle: 'Deep Core', image: '' }
            ]
        }
    ]

    return (
        <div className='h-full w-full md:w-3/4 flex justify-center'>
            <div className='scroll h-full w-full border border-orange-500 rounded-2xl overflow-y-auto overflow-x-hidden p-5 relative'>
                <button
                    onClick={onClose}
                    className='fixed right-10 md:right-33 lg:top-7 lg:right-60 text-white px-3 py-1 text-2xl hover:text-orange-500 transition-all duration-300 font-semibold cursor-pointer rounded z-10'
                >
                    X
                </button>
                <div className='py-7 pr-5'>
                    {exercisesData.map((group, idx) => (
                        <div key={idx} className='flex flex-col font-mono mb-5'>
                            <h1 className='font-bold text-3xl text-orange-600'>{group.category}</h1>
                            <div className='pt-3 font-bold text-lg cursor-pointer'>
                                {group.items.map((exercise, idx2) => (
                                    <h3
                                        key={idx2}
                                        onClick={() => onSelectExercise(exercise)}
                                        className='hover:bg-orange-500/10 hover:text-orange-400 hover:border-l-2 hover:border-orange-500 hover:pl-4 transition-all duration-200 px-3 py-2 rounded-lg whitespace-nowrap cursor-pointer'
                                    >
                                        {exercise.name}
                                    </h3>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default ExercisesList