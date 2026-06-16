import { useState, useEffect, useRef } from 'react'

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const NumberOfSets = ({ reps, setReps, idx, placeholder = 'R', mode = 'weight' }) => {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  const handleClick = () => {
    if (mode !== 'timer') return

    if (running) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      setRunning(false)
      setReps(idx, formatTime(elapsed))
    } else {
      setElapsed(0)
      setRunning(true)
    }
  }

  if (mode === 'timer') {
    return (
      <div>
        <button
          onClick={handleClick}
          className='w-14 h-7 bg-black text-orange-500 rounded-lg text-center font-bold outline-none cursor-pointer hover:bg-orange-500/10 transition-all'
        >
          {running ? formatTime(elapsed) : (reps || 'T')}
        </button>
      </div>
    )
  }

  return (
    <div>
      <input
        type="text"
        inputMode="numeric"
        value={reps}
        onChange={(e) => {
          const value = e.target.value
          if (value === '' || /^\d+$/.test(value)) {
            setReps(idx, value)
          }
        }}
        placeholder={placeholder}
        className='w-7 h-7 bg-black text-orange-500 rounded-lg text-center font-bold outline-none placeholder-orange-500'
      />
    </div>
  )
}
export default NumberOfSets
