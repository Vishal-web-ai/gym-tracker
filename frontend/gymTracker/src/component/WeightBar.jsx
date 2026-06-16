import { useRef } from 'react'

const weights = [
  '2.5kg', '5kg', '7.5kg', '10kg', '12.5kg', '15kg', '17.5kg', '20kg',
  '22.5kg', '25kg', '27.5kg', '30kg', '35kg', '40kg', '45kg', '50kg',
  '55kg', '60kg', '70kg', '80kg', '90kg', '100kg', '110kg', '120kg',
  '140kg', '160kg', '180kg', '200kg'
]

const WeightBar = ({ id, openDropdown, setOpenDropdown, weight, setWeight, mode, onModeChange }) => {
  const isOpen = openDropdown === id
  const lastClick = useRef(0)

  const handleClick = () => {
    if (mode === 'timer') {
      const now = Date.now()
      if (now - lastClick.current < 300) {
        lastClick.current = 0
        onModeChange?.('weight')
        setOpenDropdown(null)
      } else {
        lastClick.current = now
      }
      return
    }

    const now = Date.now()
    if (now - lastClick.current < 300) {
      lastClick.current = 0
      onModeChange?.('timer')
      setOpenDropdown(null)
    } else {
      lastClick.current = now
      setOpenDropdown(prev => prev === id ? null : id)
    }
  }

  return (
    <div className='relative'>
      <button
        onClick={handleClick}
        className='text-white border border-amber-800 px-3 py-1 rounded-lg font-semibold hover:bg-orange-600 transition-all'
      >
        {mode === 'timer' ? 'Timer' : (weight || 'Weight')}
      </button>
      {isOpen && mode !== 'timer' && (
        <div className='scroll absolute top-full left-0 bg-orange-900 w-44 p-3 rounded-lg overflow-y-auto flex flex-col gap-2 mt-2 max-h-56 z-50 shadow-lg'>
          <input
            type='text'
            inputMode='numeric'
            placeholder='Custom weight...'
            className='w-full bg-orange-700 text-white px-3 py-2 rounded-lg font-semibold outline-none placeholder-orange-300/50'
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value) {
                setWeight(id, e.target.value + 'kg')
                setOpenDropdown(null)
              }
            }}
            onBlur={(e) => {
              if (e.target.value) {
                setWeight(id, e.target.value + 'kg')
                setOpenDropdown(null)
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <div className='border-t border-orange-700 my-1' />
          {weights.map((w) => (
            <button
              key={w}
              onClick={(e) => {
                e.stopPropagation()
                setWeight(id, w)
                setOpenDropdown(null)
              }}
              className={`px-3 py-2 rounded-lg font-semibold text-left transition-all ${weight === w
                  ? 'bg-white text-black'
                  : 'bg-orange-600 text-black hover:bg-amber-500'
                }`}
            >
              {w}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
export default WeightBar
