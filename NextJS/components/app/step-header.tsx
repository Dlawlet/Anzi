// "Étape 3 sur 5" + the current step name + a 5-segment orange bar.
export default function StepHeader(props: { step: number; labels: readonly string[]; text: string }) {
  const { step, labels, text } = props
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-base font-bold text-night-900">{text}</p>
        <p className="text-base font-semibold text-muted">{labels[step - 1]}</p>
      </div>
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {labels.map((label, i) => (
          <span key={label} className={`h-2 flex-1 rounded-full ${i < step ? 'bg-sun' : 'bg-line'}`} />
        ))}
      </div>
    </div>
  )
}
