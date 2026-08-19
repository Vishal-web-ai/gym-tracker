import { useState, useEffect, useRef } from 'react'

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const NumberOfSets = ({ reps, setReps, idx, placeholder = 'R', mode = 'weight', className = '' }) => {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef(null)
  const lastClickRef = useRef(0)
  const elapsedRef = useRef(0)

  useEffect(() => {
    elapsedRef.current = elapsed
  }, [elapsed])

  useEffect(() => {
    if (running && !paused) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [running, paused])

  const handleClick = () => {
    if (mode !== 'timer') return

    const now = Date.now()
    const isDoubleClick = now - lastClickRef.current < 300
    lastClickRef.current = now

    if (isDoubleClick) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      setRunning(false)
      setPaused(false)
      setElapsed(0)
      setReps(idx, '')
      return
    }

    if (running && !paused) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      setPaused(true)
      setReps(idx, formatTime(elapsedRef.current))
    } else if (paused) {
      setPaused(false)
    } else {
      setRunning(true)
      setPaused(false)
    }
  }

  if (mode === 'timer') {
    return (
      <div className={className}>
        <button
          onClick={handleClick}
          className='w-full h-full bg-black/30 text-orange-400 rounded-xl text-center text-lg font-bebas outline-none cursor-pointer hover:bg-orange-500/10 transition-all'
        >
          {running ? formatTime(elapsed) : (reps || 'T')}
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
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
        className='w-full h-full bg-black/30 text-orange-400 rounded-xl text-center text-lg font-bebas outline-none placeholder-orange-400/40'
      />
    </div>
  )
}
export default NumberOfSets
