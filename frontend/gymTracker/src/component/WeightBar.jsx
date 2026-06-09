import React from 'react'
const WeightBar = ({ id, openDropdown, setOpenDropdown, weight, setWeight }) => {
  const weights = [
    '2.5kg', '5kg', '7.5kg', '10kg', '12.5kg', '15kg', '17.5kg', '20kg',
    '22.5kg', '25kg', '27.5kg', '30kg', '35kg', '40kg', '45kg', '50kg',
    '55kg', '60kg', '70kg', '80kg', '90kg', '100kg', '110kg', '120kg',
    '140kg', '160kg', '180kg', '200kg'
  ]
  const isOpen = openDropdown === id
  return (
    <div className='relative'>
      <button
        onClick={() => setOpenDropdown(isOpen ? null : id)}
        className='text-white border border-amber-800 px-3 py-1 rounded-lg font-semibold flex items-center gap-2 hover:bg-orange-600 transition-all'
      >
        {weight || 'W'}
      </button>
      {isOpen && (
        <div className='scroll absolute top-full left-0 bg-orange-900 w-40 p-3 rounded-lg overflow-y-auto flex flex-col gap-2 mt-2 max-h-48 z-50 shadow-lg'>
          {weights.map((w) => (
            <button
              key={w}
              onClick={() => {
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