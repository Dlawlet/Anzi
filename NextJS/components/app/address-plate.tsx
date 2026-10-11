// The orange address plate: house number, then the street word over the street name ("12 | RUE MANGUIER").
// Text only (names are user input, never HTML). `number` null means the number is still waiting.
export default function AddressPlate(props: { number: string | null; word: string; name: string; pending: string; wordAfter?: boolean }) {
  const { number, word, name, pending, wordAfter = false } = props
  return (
    <div className="plate" role="img" aria-label={`${number ?? pending} ${word} ${name}`.trim()}>
      <i className="plate-screw left-2.5 top-2.5" />
      <i className="plate-screw right-2.5 top-2.5" />
      <i className="plate-screw bottom-3.5 left-2.5" />
      <i className="plate-screw bottom-3.5 right-2.5" />
      <span aria-hidden="true" className="text-[48px] font-extrabold leading-none" style={{ fontFeatureSettings: "'tnum'" }}>
        {number ?? '–'}
      </span>
      <span aria-hidden="true" className="h-12 w-[2px] shrink-0 rounded-full bg-night-900/30" />
      <span aria-hidden="true" className="min-w-0 flex-1">
        {(() => {
          const wordEl = <span className="block text-[15px] font-extrabold uppercase leading-none tracking-[0.18em]">{word}</span>
          const nameEl = <span className={`block break-words text-[24px] font-extrabold uppercase leading-[1.05] sm:text-[27px] ${wordAfter ? 'mb-1' : 'mt-1'}`}>{name}</span>
          return wordAfter ? <>{nameEl}{wordEl}</> : <>{wordEl}{nameEl}</>
        })()}
      </span>
    </div>
  )
}
