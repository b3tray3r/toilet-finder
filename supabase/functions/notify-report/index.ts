import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = '144400864'

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const report = payload.record

    // Получаем данные туалета
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const { data: toilet } = await supabase
      .from('toilets')
      .select('name, lat, lng')
      .eq('id', report.toilet_id)
      .single()

    if (!toilet) throw new Error('Туалет не найден')

    const mapsLink = `https://maps.google.com/?q=${toilet.lat},${toilet.lng}`

    const message = `
🚩 <b>Новая жалоба на точку</b>

📍 <b>Название:</b> ${toilet.name}
🗺 <b>Координаты:</b> <a href="${mapsLink}">${toilet.lat.toFixed(5)}, ${toilet.lng.toFixed(5)}</a>
💬 <b>Причина:</b> ${report.reason}
🕐 <b>Время:</b> ${new Date(report.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
    `.trim()

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        })
      }
    )

    const result = await response.json()
    if (!result.ok) throw new Error(`Telegram error: ${result.description}`)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('notify-report error:', err)
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})