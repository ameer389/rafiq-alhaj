import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { subscribeLive } from './live'

// All members of the campaign, kept live via Realtime.
export function useMembers(campaignId) {
  const [members, setMembers] = useState([])

  useEffect(() => {
    if (!campaignId) return
    let alive = true
    const fetchAll = async () => {
      const { data, error } = await supabase.from('members').select('*').eq('campaign_id', campaignId).order('name')
      if (error) console.error('members', error)
      else if (alive) setMembers(data)
    }
    fetchAll()
    const stop = subscribeLive(`members-${campaignId}`, (ch) => ch
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `campaign_id=eq.${campaignId}` }, fetchAll), fetchAll)
    return () => { alive = false; stop() }
  }, [campaignId])

  const pilgrims = useMemo(() => members.filter((m) => m.role === 'pilgrim'), [members])
  return { members, pilgrims }
}
