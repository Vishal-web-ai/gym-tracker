import React from 'react'
const NumberOfSets = ({ reps, setReps, idx }) => {
    const handleChange = (e) => {
        const value = e.target.value
        if (value === '' || /^\d+$/.test(value)) {
            setReps(idx, value)
        }
    }
    return (
        <div>
            <input
                type='text'
                value={reps}
                onChange={handleChange}
                placeholder='R'
                className='w-7 h-7 bg-green-500 text-black rounded-lg text-center font-bold outline-none placeholder-neutral-500'
            />
        </div>
    )
}
export default NumberOfSets