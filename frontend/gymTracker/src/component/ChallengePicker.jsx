import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { CHALLENGE_GROUPS, DEFAULT_CHALLENGE_PICKS } from '../services/progression'
import { defaultExercises, exerciseMetaByName } from '../services/exercises'

const normName = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const categoryMatches = (category, categories) =>
    categories.some((c) => normName(c) === normName(category))

// Builds the selectable list for one muscle group: scheduled exercises in that
// group come first, then the built-in library, then custom exercises.
function optionsForGroup(group, schedule, customExercises) {
    const seen = new Set()
    const list = []
    const push = (name) => {
        const key = normName(name)
        if (!name || seen.has(key)) return
        seen.add(key)
        list.push(name)
    }
    const customByName = new Map(customExercises.map((e) => [normName(e.name), e]))
    const categoryOf = (name) => {
        const meta = exerciseMetaByName(name)
        if (meta) return meta.category
        return customByName.get(normName(name))?.category
    }

    for (const day of Object.values(schedule || {})) {
        for (const item of day || []) {
            if (categoryMatches(categoryOf(item?.name), group.categories)) push(item?.name)
        }
    }
    for (const cat of defaultExercises) {
        if (!categoryMatches(cat.category, group.categories)) continue
        for (const ex of cat.items) push(ex.name)
    }
    for (const ex of customExercises) {
        if (categoryMatches(ex.category, group.categories)) push(ex.name)
    }
    return list
}

const ChallengePicker = ({ schedule = {}, customExercises = [], picks = {}, onChange }) => {
    const options = useMemo(() => {
        const map = {}
        for (const g of CHALLENGE_GROUPS) map[g.key] = optionsForGroup(g, schedule, customExercises)
        return map
    }, [schedule, customExercises])

    const select = (key, name) => {
        const next = { ...picks, [key]: name }
        onChange?.(next)
    }

    return (
        <div className='flex flex-col gap-4 w-full'>
            <p className='font-mono text-white/50 text-center' style={{ fontSize: 11 }}>
                Pick ONE exercise per muscle group — these become your rank challenges. Cardio is optional.
            </p>
            {CHALLENGE_GROUPS.map((g) => {
                const list = options[g.key] || []
                const selected = picks[g.key]
                const skipped = selected === null
                return (
                    <div key={g.key} className={skipped ? 'opacity-40' : ''}>
                        <div className='flex items-center justify-between mb-1.5'>
                            <p className='font-bebas text-orange-400 tracking-[2px]' style={{ fontSize: 16 }}>
                                {g.label.toUpperCase()}
                            </p>
                            {g.key === 'cardio' && (
                                <button
                                    onClick={() => select('cardio', skipped ? DEFAULT_CHALLENGE_PICKS.cardio : null)}
                                    className={`font-mono rounded-lg px-2 py-1 border transition-all cursor-pointer ${
                                        skipped
                                            ? 'border-white/20 text-white/40'
                                            : 'border-orange-500/40 text-orange-400'
                                    }`}
                                    style={{ fontSize: 10 }}
                                >
                                    {skipped ? 'SKIPPED' : 'INCLUDED'}
                                </button>
                            )}
                        </div>
                        <div className={`flex gap-2 overflow-x-auto scroll pb-1 -mx-1 px-1 ${skipped ? 'pointer-events-none' : ''}`}>
                            {list.map((name) => {
                                const active = selected === name
                                return (
                                    <button
                                        key={name}
                                        onClick={() => select(g.key, name)}
                                        className={`shrink-0 rounded-xl px-3 py-2 font-mono transition-all cursor-pointer border ${
                                            active
                                                ? 'bg-orange-500 text-black border-orange-500 shadow-[0_0_16px_rgba(255,107,26,0.5)]'
                                                : 'bg-black/40 text-white/70 border-orange-500/20 hover:border-orange-500/60'
                                        }`}
                                        style={{ fontSize: 11 }}
                                    >
                                        <span className='flex items-center gap-1'>
                                            {active && <Check size={12} />}
                                            {name}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default ChallengePicker