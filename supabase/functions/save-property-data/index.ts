import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'

async function encrypt(plaintext: string): Promise<string> {
  const keyB64 = Deno.env.get('ENCRYPTION_KEY')
  if (!keyB64) throw new Error('ENCRYPTION_KEY not configured')
  const keyBytes = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const ivB64 = btoa(String.fromCharCode(...iv))
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  return `${ivB64}:${ctB64}`
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } }
    )

    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { propertyId, accessCode, wifiCode, keyBoxCode } = await req.json()
    if (!propertyId) return json({ error: 'propertyId required' }, 400)

    // Vérifier que l'utilisateur est propriétaire du logement
    const { data: prop } = await userClient
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('client_id', user.id)
      .single()
    if (!prop) return json({ error: 'Property not found or unauthorized' }, 403)

    // Chiffrer les codes non-vides
    const updates: Record<string, string> = {}
    if (accessCode?.trim()) updates.access_code_encrypted = await encrypt(accessCode.trim())
    if (wifiCode?.trim()) updates.wifi_code_encrypted = await encrypt(wifiCode.trim())
    if (keyBoxCode?.trim()) updates.key_box_code_encrypted = await encrypt(keyBoxCode.trim())

    if (Object.keys(updates).length > 0) {
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      const { error: updateErr } = await admin
        .from('properties')
        .update(updates)
        .eq('id', propertyId)
      if (updateErr) throw updateErr
    }

    return json({ ok: true })
  } catch (err: unknown) {
    console.error('[save-property-data]', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    return json({ error: message }, 500)
  }
})
