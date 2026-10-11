'use client'

import { useState } from 'react'
import { useI18n } from '@/i18n/provider'

type Status = 'idle' | 'sending' | 'sent' | 'invalid' | 'network' | 'tooMany'

const field =
  'block w-full min-h-12 rounded-[14px] border-2 border-night-700 bg-night-800 px-3.5 py-3 text-[17px] text-white placeholder:text-night-400 focus:border-sun focus:ring-4 focus:ring-sun/30'

// Contact form of the About page: posts to /api/contact, which stores the message and e-mails it to the owner.
// The address of the owner is never sent to the browser. The hidden "website" field catches bots.
export default function ContactForm() {
  const { t, lang } = useI18n()
  const a = t.about
  const [status, setStatus] = useState<Status>('idle')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'sending') return
    const form = new FormData(event.currentTarget)
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          replyTo: form.get('replyTo'),
          message: form.get('message'),
          website: form.get('website'),
          lang,
        }),
      })
      if (res.status === 201) {
        event.currentTarget.reset()
        setStatus('sent')
      } else {
        setStatus(res.status === 429 ? 'tooMany' : res.status === 400 ? 'invalid' : 'network')
      }
    } catch {
      setStatus('network')
    }
  }

  if (status === 'sent') {
    return (
      <p role="status" className="mt-3 rounded-xl bg-night-800 p-3 text-[17px] font-bold text-sun-200">
        {a.formSent}
      </p>
    )
  }

  const message = status === 'invalid' ? a.formError : status === 'network' ? a.formNetwork : status === 'tooMany' ? a.formTooMany : ''

  return (
    <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
      <div>
        <label htmlFor="contact-name" className="mb-1 block text-base font-bold">
          {a.formName} <span className="font-normal text-night-300">({t.common.optional})</span>
        </label>
        <input id="contact-name" name="name" type="text" autoComplete="name" maxLength={60} className={field} />
      </div>
      <div>
        <label htmlFor="contact-reply" className="mb-1 block text-base font-bold">
          {a.formReply} <span className="font-normal text-night-300">({t.common.optional})</span>
        </label>
        <input id="contact-reply" name="replyTo" type="text" autoComplete="email" maxLength={120} aria-describedby="contact-reply-hint" className={field} />
        <p id="contact-reply-hint" className="mt-1 text-sm text-night-300">{a.formReplyHint}</p>
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1 block text-base font-bold">{a.formMessage}</label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          maxLength={1000}
          required
          aria-invalid={status === 'invalid'}
          aria-describedby={message ? 'contact-error' : undefined}
          className={field}
        />
      </div>
      {/* Bots fill every field: people never see or reach this one. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {message && <p id="contact-error" role="alert" className="text-base font-bold text-sun-200">{message}</p>}
      <button type="submit" disabled={status === 'sending'} className="btn btn-primary">
        {status === 'sending' ? a.formSending : a.formSend}
      </button>
    </form>
  )
}
