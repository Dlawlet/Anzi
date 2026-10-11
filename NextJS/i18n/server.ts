import { cookies, headers } from 'next/headers'
import { dictionaries, type Dict } from './dictionary'
import { LANG_COOKIE, resolveLang, type Lang } from './lang'

// Server components only. Reading cookies makes the calling route dynamic, which is fine for the app routes.
export async function getI18n(): Promise<{ lang: Lang; t: Dict }> {
  const [jar, h] = await Promise.all([cookies(), headers()])
  const lang = resolveLang(jar.get(LANG_COOKIE)?.value, h.get('accept-language'))
  return { lang, t: dictionaries[lang] }
}
