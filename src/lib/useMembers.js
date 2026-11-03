import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

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
    const ch = supabase.channel(`members-${campaignId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `campaign_id=eq.${campaignId}` }, fetchAll)
      .subscribe()
    return () => { alive = false; supabase.removeChannel(ch) }
  }, [campaignId])

  const pilgrims = useMemo(() => members.filter((m) => m.role === 'pilgrim'), [members])
  return { members, pilgrims }
}
