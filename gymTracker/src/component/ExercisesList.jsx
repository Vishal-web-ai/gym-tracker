import React from 'react'

const ExercisesList = ({ onSelectExercise, onClose }) => {
    const exercisesData = [
        {
            category: 'Chest',
            items: [
                'Flat Bench Press', 'Incline Bench Press', 'Decline Bench Press',
                'Machine Chest Press', 'Pec Fly', 'Cable Crossover', 'Push-Up',
                'Chest Dip', 'Dumbbell Pullover', 'Low Cable Fly', 'High Cable Fly'
            ]
        },
        {
            category: 'Back',
            items: [
                'Lat Pulldown', 'Seated Cable Row', 'Wide Row', 'Deadlift',
                'Barbell Row', 'T-Bar Row', 'Pull-Up', 'Chin-Up',
                'Single Arm Dumbbell Row', 'Face Pull', 'Straight Arm Pulldown'
            ]
        },
        {
            category: 'Biceps',
            items: [
                'Barbell Curl', 'Dumbbell Curl', 'Hammer Curl',
                'Concentration Curl', 'Preacher Curl', 'Cable Curl',
                'Incline Dumbbell Curl', 'Spider Curl', 'Reverse Curl'
            ]
        },
        {
            category: 'Triceps',
            items: [
                'Tricep Pushdown', 'Skull Crusher', 'Overhead Tricep Extension',
                'Close Grip Bench Press', 'Tricep Dips', 'Cable Overhead Extension',
                'Single Arm Pushdown', 'Tricep Kickback', 'JM Press'
            ]
        },
        {
            category: 'Arms',
            items: [
                'Wrist Curl', 'Reverse Wrist Curl'
            ]
        },
        {
            category: 'Shoulders',
            items: [
                'Overhead Press', 'Lateral Raises', 'Rear Delt Fly',
                'Arnold Press', 'Front Raise', 'Upright Row',
                'Cable Lateral Raise', 'Face Pull', 'Shrugs',
                'Machine Shoulder Press', 'Reverse Pec Deck'
            ]
        },
        {
            category: 'Legs',
            items: [
                'Leg Press', 'Squat', 'Romanian Deadlift', 'Hamstring Curl',
                'Barbell Back Squat', 'Front Squat', 'Bulgarian Split Squat',
                'Leg Extension', 'Calf Raise', 'Hip Thrust', 'Sumo Squat',
                'Hack Squat', 'Walking Lunges', 'Step-Up', 'Glute Kickback'
            ]
        },
        {
            category: 'Core',
            items: [
                'Plank', 'Crunch', 'Hanging Leg Raise', 'Cable Crunch',
                'Ab Wheel Rollout', 'Russian Twist', 'Bicycle Crunch',
                'Side Plank', 'Decline Sit-Up', 'Wood Chop', 'Dead Bug'
            ]
        }
    ]
    return (
        <div className='h-full w-full md:w-3/4 flex justify-center'>
            <div className='scroll h-full w-full border border-orange-500 rounded-2xl overflow-y-auto overflow-x-hidden p-5 relative'>
                <button
                    onClick={onClose}
                    className='fixed right-10 md:right-33 lg:top-7 lg:right-60 text-white px-3 py-1 text-2xl  hover:text-orange-500 transition-all duration-300 font-semibold cursor-pointer rounded z-10'
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
                                        {exercise}
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