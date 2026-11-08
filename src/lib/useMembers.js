import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { subscribeLive } from './live'
import { loadCache, saveCache } from './storage'

// All members of the campaign, kept live via Realtime.
// Cached per campaign on the device: renders from the cache first (opens offline), then refreshes.
export function useMembers(campaignId) {
  const [members, setMembers] = useState(() => loadCache(campaignId, 'members', []))
  const cacheCid = useRef(campaignId) // campaign the state belongs to

  useEffect(() => {
    if (!campaignId) return
    if (cacheCid.current !== campaignId) { cacheCid.current = campaignId; setMembers(loadCache(campaignId, 'members', [])) }
    let alive = true
    const fetchAll = async () => {
      const { data, error } = await supabase.from('members').select('*').eq('campaign_id', campaignId).order('name')
      if (error) console.warn('members (using cache)', error)
      else if (alive) { setMembers(data); saveCache(campaignId, 'members', data) }
    }
    fetchAll()
    const stop = subscribeLive(`members-${campaignId}`, (ch) => ch
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `campaign_id=eq.${campaignId}` }, fetchAll), fetchAll)
    return () => { alive = false; stop() }
  }, [campaignId])

  const pilgrims = useMemo(() => members.filter((m) => m.role === 'pilgrim'), [members])
  return { members, pilgrims }
}
