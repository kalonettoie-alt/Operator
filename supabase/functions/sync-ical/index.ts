import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json } from '../_shared/cors.ts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ICalEvent {
  uid: string
  summary: string
  checkinDate: string   // YYYY-MM-DD
  checkoutDate: string  // YYYY-MM-DD
  cancelled: boolean
}

interface ICalSource {
  id: string
  property_id: string
  url: string
  platform: string | null
  properties: {
    client_id: string
    base_price: number
    checkout_time: string
    owner_reminder: string | null
    report_extras: string[]
    profiles: { sepa_mandate_active: boolean }
  }
}

// ─── Parseur iCal ─────────────────────────────────────────────────────────────

function parseDate(raw: string): string {
  // raw peut être "20260401" ou "20260401T100000Z" ou "20260401T100000"
  const digits = raw.replace(/[TZ].*/, '')
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

function parseIcal(text: string): ICalEvent[] {
  // Unfold les lignes continues (RFC 5545 §3.1)
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const events: ICalEvent[] = []
  let current: Partial<ICalEvent> | null = null

  for (const line of unfolded.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === 'BEGIN:VEVENT') {
      current = { cancelled: false }
      continue
    }
    if (trimmed === 'END:VEVENT') {
      if (current?.uid && current.checkinDate && current.checkoutDate) {
        events.push(current as ICalEvent)
      }
      current = null
      continue
    }
    if (!current) continue

    // Séparer key (avec éventuel ;PARAM=val) et value au premier ":"
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) continue
    const keyPart = trimmed.slice(0, colonIdx).toUpperCase()
    const value = trimmed.slice(colonIdx + 1)

    if (keyPart === 'UID') {
      current.uid = value
    } else if (keyPart.startsWith('DTSTART')) {
      current.checkinDate = parseDate(value)
    } else if (keyPart.startsWith('DTEND')) {
      // DTEND = jour du checkout (non-inclus) → jour de départ du voyageur
      current.checkoutDate = parseDate(value)
    } else if (keyPart === 'SUMMARY') {
      current.summary = value
    } else if (keyPart === 'STATUS' && value.toUpperCase() === 'CANCELLED') {
      current.cancelled = true
    }
  }

  return events
}

// ─── Checklist ────────────────────────────────────────────────────────────────

const EXTRA_LABELS: Record<string, string> = {
  garage_remote: 'Bip garage',
  tv_remote: 'Télécommande TV',
  meter: 'Compteur (eau / électricité)',
  key_box: 'Boîte à clés',
  balcony: 'Balcon',
  trash: 'Poubelles',
  fridge: 'Frigo',
}

function buildChecklist(reportExtras: string[]): { id: string; label: string; done: boolean }[] {
  const base = [
    'Vue générale',
    'Cuisine',
    'Salle de bain',
    'Chambres',
    'Toilettes',
  ]
  const items = base.map((label) => ({ id: crypto.randomUUID(), label, done: false }))
  for (const extra of reportExtras) {
    const label = EXTRA_LABELS[extra]
    if (label) items.push({ id: crypto.randomUUID(), label, done: false })
  }
  return items
}

// ─── Traitement d'une source ──────────────────────────────────────────────────

async function processSource(admin: SupabaseClient, source: ICalSource): Promise<void> {
  const property = source.properties

  // Fetch + parse
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  let events: ICalEvent[]
  try {
    const res = await fetch(source.url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    events = parseIcal(text)
  } finally {
    clearTimeout(timeout)
  }

  // Réservations actives existantes pour cette source
  const { data: existingResos } = await admin
    .from('reservations')
    .select('id, ical_uid, checkin_date, checkout_date')
    .eq('ical_source_id', source.id)
    .eq('is_cancelled', false)

  const existingMap = new Map((existingResos ?? []).map((r) => [r.ical_uid, r]))
  const parsedUids = new Set<string>()

  const priceEuros = property.base_price / 100
  const providerPayout = +(priceEuros * 0.80).toFixed(2)
  const deltomCommission = +(priceEuros * 0.20).toFixed(2)
  const checklist = buildChecklist(property.report_extras ?? [])

  for (const event of events) {
    if (event.cancelled) {
      // Annuler si elle existe en base
      const existing = existingMap.get(event.uid)
      if (existing) {
        await cancelReservation(admin, existing.id)
      }
      continue
    }

    parsedUids.add(event.uid)
    const existing = existingMap.get(event.uid)

    if (!existing) {
      // Nouvelle réservation → créer réservation + intervention
      const { data: reso, error: resoErr } = await admin
        .from('reservations')
        .insert({
          property_id: source.property_id,
          ical_source_id: source.id,
          ical_uid: event.uid,
          guest_name: event.summary || null,
          checkin_date: event.checkinDate,
          checkout_date: event.checkoutDate,
          platform: source.platform,
        })
        .select('id')
        .single()
      if (resoErr) {
        // Doublon (contrainte unique) — ignorer silencieusement
        if (resoErr.code === '23505') continue
        throw resoErr
      }

      // L'intervention se passe le jour du checkout (ménage après départ)
      await admin.from('interventions').insert({
        property_id: source.property_id,
        reservation_id: reso.id,
        client_id: property.client_id,
        status: 'pending',
        scheduled_date: event.checkoutDate,
        scheduled_time: property.checkout_time,
        price: priceEuros,
        provider_payout: providerPayout,
        deltom_commission: deltomCommission,
        checklist,
        owner_reminder: property.owner_reminder,
      })
    } else if (
      existing.checkin_date !== event.checkinDate ||
      existing.checkout_date !== event.checkoutDate
    ) {
      // Dates modifiées → mettre à jour réservation + intervention
      await admin
        .from('reservations')
        .update({
          checkin_date: event.checkinDate,
          checkout_date: event.checkoutDate,
          guest_name: event.summary || null,
        })
        .eq('id', existing.id)

      await admin
        .from('interventions')
        .update({
          scheduled_date: event.checkoutDate,
          scheduled_time: property.checkout_time,
        })
        .eq('reservation_id', existing.id)
        .in('status', ['pending', 'assigned'])
    }
  }

  // Événements supprimés du feed iCal → annuler
  for (const [uid, existing] of existingMap) {
    if (!parsedUids.has(uid)) {
      await cancelReservation(admin, existing.id)
    }
  }

  // Marquer source comme sync réussie
  await admin
    .from('ical_sources')
    .update({ last_synced_at: new Date().toISOString(), consecutive_failures: 0 })
    .eq('id', source.id)
}

async function cancelReservation(admin: SupabaseClient, reservationId: string): Promise<void> {
  await admin
    .from('reservations')
    .update({ is_cancelled: true, cancelled_at: new Date().toISOString() })
    .eq('id', reservationId)

  await admin
    .from('interventions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('reservation_id', reservationId)
    .in('status', ['pending', 'assigned', 'accepted'])
}

// ─── Handler principal ────────────────────────────────────────────────────────

serve(async (req) => {
  // Vérifier le secret cron (appelé depuis pg_cron ou un cron externe)
  const authHeader = req.headers.get('Authorization') ?? ''
  const cronSecret = Deno.env.get('CRON_SECRET')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    authHeader === `Bearer ${serviceRoleKey}`

  if (!isAuthorized) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
    { auth: { persistSession: false } }
  )

  // Charger toutes les sources actives dont le client a un SEPA actif
  const { data: sources, error: sourcesErr } = await admin
    .from('ical_sources')
    .select(`
      id, property_id, url, platform,
      properties!inner (
        client_id, base_price, checkout_time, owner_reminder, report_extras,
        is_active,
        profiles!inner ( sepa_mandate_active )
      )
    `)
    .eq('is_active', true)
    .eq('properties.is_active', true)
    .eq('properties.profiles.sepa_mandate_active', true)

  if (sourcesErr) {
    console.error('[sync-ical] fetch sources error:', sourcesErr)
    return json({ error: sourcesErr.message }, 500)
  }

  const results = { processed: 0, errors: 0 }

  for (const source of (sources ?? []) as unknown as ICalSource[]) {
    try {
      await processSource(admin, source)
      results.processed++
    } catch (err) {
      results.errors++
      console.error(`[sync-ical] source ${source.id}:`, err)

      // Incrémenter les échecs consécutifs, désactiver après 5
      const { data: src } = await admin
        .from('ical_sources')
        .select('consecutive_failures')
        .eq('id', source.id)
        .single()

      const failures = (src?.consecutive_failures ?? 0) + 1
      await admin
        .from('ical_sources')
        .update({
          consecutive_failures: failures,
          is_active: failures < 5,
        })
        .eq('id', source.id)
    }
  }

  console.log(`[sync-ical] done — processed: ${results.processed}, errors: ${results.errors}`)
  return json(results)
})
