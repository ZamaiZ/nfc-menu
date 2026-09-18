import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { territoryFromHost, type Territory } from '@/server/territory'
import { createUserClient } from './_client'

export type AuthUser = { id: string; email: string | null }

// Erro PREVISTO, com mensagem escrita por nós, segura para chegar na tela.
// Diferente do genérico do runAction, que existe para não vazar nome de
// tabela e constraint do Postgres — um mapa do schema de graça para quem
// estiver sondando.
//
// Todo erro que deva ser mostrado ao usuário estende esta classe. O
// runAction testa a BASE, não cada filha, então acrescentar um erro novo
// não exige lembrar de atualizar o runAction junto.
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

export class ForbiddenError extends UserFacingError {
  constructor(message = 'Sem permissão para esta operação') {
    super(message)
  }
}

export class ConflictError extends UserFacingError {}

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

type GuardFunction = 'is_platform_admin' | 'is_member' | 'is_owner'

async function callGuard(
  fn: GuardFunction,
  args: Record<string, unknown> = {},
): Promise<boolean> {
  const supabase = await createUserClient(await currentTerritory())
  // O cast existe porque as três funções compartilham a forma
  // (uuid opcional) -> boolean, mas o tipo gerado as trata separadamente.
  const { data, error } = await supabase.rpc(
    fn as 'is_platform_admin',
    args as never,
  )
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
