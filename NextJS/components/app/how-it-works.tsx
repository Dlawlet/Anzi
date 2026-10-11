import { getI18n } from '@/i18n/server'
import { ChatIcon, CrosshairIcon, RoadIcon } from './icons'

// Three one-line steps for people who have no address on this phone yet.
export default async function HowItWorks() {
  const { t } = await getI18n()
  const steps = [
    { Icon: CrosshairIcon, title: t.home.how1Title, text: t.home.how1Text },
    { Icon: RoadIcon, title: t.home.how2Title, text: t.home.how2Text },
    { Icon: ChatIcon, title: t.home.how3Title, text: t.home.how3Text },
  ]
  return (
    <section aria-labelledby="home-how" className="px-4 pb-1 pt-7">
      <h2 id="home-how" className="text-xl font-extrabold leading-[1.3] tracking-[-0.015em]">{t.home.howTitle}</h2>
      <ol className="mt-3.5">
        {steps.map(({ Icon, title, text }, i) => (
          <li key={title} className={`relative flex gap-3.5 ${i < steps.length - 1 ? 'pb-5 before:absolute before:bottom-0.5 before:left-[23px] before:top-[52px] before:border-l-2 before:border-dashed before:border-sun before:content-[\'\']' : ''}`}>
            <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-sun-50 text-clay-700 shadow-[inset_0_0_0_2px_#FF8506]">
              <Icon className="h-[22px] w-[22px]" />
            </span>
            <div>
              <b className="mt-0.5 block text-[17px] leading-[1.3]">{title}</b>
              <p className="text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
