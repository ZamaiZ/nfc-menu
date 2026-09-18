import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { territoryFromHost, type Territory } from '@/server/territory'
import { createUserClient } from './_client'

export type AuthUser = { id: string; email: string | null }

export class ForbiddenError extends Error {
  constructor(message = 'Sem permissão para esta operação') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export const currentTerritory = cache(async (): Promise<Territory> => {
  const requestHeaders = await headers()
  return territoryFromHost(requestHeaders.get('host'))
})

// cache() do React deduplica dentro do MESMO render. Nao e cache entre
// requisicoes: continua tudo fresco, so evita a mesma consulta rodar cinco
// vezes numa pagina que chama getCurrentUser em varios componentes.
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const territory = await currentTerritory()
  // O territorio publico nao tem sessao, por construcao.
  if (territory === 'site') return null

  const supabase = await createUserClient(territory)
  // getUser() revalida o token contra o servidor de auth. getSession() so
  // decodifica o cookie e NUNCA deve ser usado para autorizar no servidor.
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null

  return { id: data.user.id, email: data.user.email ?? null }
})

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    // Caminho EXTERNO, sem o prefixo do territorio. Dentro de admin. ou
    // painel., /entrar ja e reescrito pelo proxy para /admin/entrar ou
    // /painel/entrar. Redirecionar para /admin/entrar faria o navegador
    // pedir /admin/admin/entrar, que nao existe.
    redirect('/entrar')
  }
  return user
}

async function callGuard(
  fn: string,
  args: Record<string, unknown> = {},
): Promise<boolean> {
  const supabase = await createUserClient(await currentTerritory())
  const { data, error } = await supabase.rpc(fn, args)
  return !error && data === true
}

export async function requirePlatformAdmin(): Promise<AuthUser> {
  const user = await requireUser()
  if (!(await callGuard('is_platform_admin'))) throw new ForbiddenError()
  return user
}

export async function requireMember(restaurantId: string): Promise<AuthUser> {
  const user = await requireUser()
  const allowed =
    (await callGuard('is_member', { rid: restaurantId })) ||
    (await callGuard('is_platform_admin'))
  if (!allowed) throw new ForbiddenError()
  return user
}

export async function requireOwner(restaurantId: string): Promise<AuthUser> {
  const user = await requireUser()
  const allowed =
    (await callGuard('is_owner', { rid: restaurantId })) ||
    (await callGuard('is_platform_admin'))
  if (!allowed) throw new ForbiddenError()
  return user
}
