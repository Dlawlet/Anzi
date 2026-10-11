import { getI18n } from '@/i18n/server'
import { SearchIcon } from './icons'

// One box, a plain GET form to /find: no client JS. "Manguier 12", street and number, or the backup code.
export default async function AddressSearchBox({ defaultValue }: { defaultValue?: string }) {
  const { t } = await getI18n()
  return (
    <form action="/find" method="get" className="px-3.5 pb-4 pt-3.5">
      <label htmlFor="home-q" className="mb-2 flex items-center gap-2 text-base font-bold">
        <SearchIcon className="h-5 w-5" />
        {t.home.searchLabel}
      </label>
      <div className="field-box">
        <input
          id="home-q"
          name="q"
          type="text"
          required
          maxLength={80}
          defaultValue={defaultValue}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={t.home.searchPlaceholder}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[17px] text-night-900 placeholder:text-muted focus:ring-0"
        />
        <button type="submit" className="flex h-12 flex-none items-center gap-1.5 rounded-[10px] bg-night-900 px-4 text-base font-bold text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-sun">
          {t.home.searchButton}
        </button>
      </div>
      <p className="mt-1.5 text-[15px] text-muted">{t.home.searchHelp}</p>
    </form>
  )
}
