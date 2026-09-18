import 'server-only'
import { createUserClient } from '@/server/dal/_client'
import { currentTerritory } from '@/server/dal/auth'
import { clientIp } from './client-ip'

export async function recordAudit(input: {
  action: string
  subjectType: string
  subjectId?: string
  restaurantId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const supabase = await createUserClient(await currentTerritory())

  await supabase.rpc('record_audit', {
    p_action: input.action,
    p_subject_type: input.subjectType,
    p_subject_id: input.subjectId ?? null,
    p_restaurant_id: input.restaurantId ?? null,
    p_metadata: input.metadata ?? {},
    // null quando o IP nao pode ser determinado. A coluna e inet e
    // recusaria uma string que nao seja endereco.
    p_ip: await clientIp(),
  })
}
