import React from 'react'
const WeightBar = ({ id, openDropdown, setOpenDropdown, weight, setWeight }) => {
  const weights = ['5kg', '10kg', '15kg', '20kg', '25kg', '30kg', '35kg', '40kg']
  const isOpen = openDropdown === id
  return (
    <div className='relative'>
      <button
        onClick={() => setOpenDropdown(isOpen ? null : id)}
        className='bg-neutral-500 text-white px-3 py-1 rounded-lg font-semibold flex items-center gap-2 hover:bg-neutral-400 transition-all'
      >
        {weight || 'W'}
      </button>
      {isOpen && (
        <div className='scroll absolute top-full left-0 bg-neutral-700 w-40 p-3 rounded-lg overflow-y-auto flex flex-col gap-2 mt-2 max-h-48 z-50 shadow-lg'>
          {weights.map((w) => (
            <button
              key={w}
              onClick={() => {
                setWeight(id, w)
                setOpenDropdown(null)
              }}
              className={`px-3 py-2 rounded-lg font-semibold text-left transition-all ${
                weight === w
                  ? 'bg-white text-black'
                  : 'bg-neutral-600 text-white hover:bg-neutral-500'
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