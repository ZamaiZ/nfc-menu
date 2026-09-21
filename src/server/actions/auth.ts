'use server'

import { redirect } from 'next/navigation'
import { safeNextPath } from '@/domain/common'
import * as dal from '@/server/dal/session'
import { runAction, type ActionResult } from './result'

export async function signInAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    await dal.signIn({
      email: formData.get('email'),
      password: formData.get('password'),
    })
  })

  if (!result.ok) return result

  // O redirect fica FORA do runAction de propósito. Ele funciona lançando,
  // e o runAction reconhece esse lançamento e o repassa — mas manter aqui
  // deixa explícito que o desvio é sucesso, não erro.
  //
  // safeNextPath de novo: o campo oculto do formulário é controlado pelo
  // navegador, então o valor não pode ser confiado só porque a página o
  // entregou limpo.
  //
  // O padrão deixou de ser `/` na Fase 4. Cair na rota ambígua logo depois de
  // entrar era exatamente o momento em que a página do território público
  // aparecia dentro do painel. `/restaurantes` existe nos DOIS territórios
  // privados, então o padrão vale para os dois sem ramificação.
  redirect(safeNextPath(formData.get('next'), '/restaurantes'))
}

export async function signUpAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  // Não redireciona: quem se cadastra está no meio do resgate de convite e
  // precisa continuar na mesma página, agora autenticado, para aceitar.
  return runAction(async () => {
    await dal.signUp({
      email: formData.get('email'),
      password: formData.get('password'),
    })
  })
}

export async function signOutAction(): Promise<never> {
  await dal.signOut()
  redirect('/entrar')
}
