// Guarda de regressão dos tokens de tema. Roda os oito presets nas duas
// faces e confere a regra de CADA papel — que não são todas do mesmo tipo.
//
// Ele existe porque a Fase 3 saiu com as dezesseis faces usando o fio de
// MAIOR contraste, a 12–15:1, e nada no projeto era capaz de notar. Este é o
// único arquivo de verificação que fica no repositório: guarda que morre com
// a sessão não guarda nada.
//
// Uso: pnpm exec tsx scripts/verificar-contraste.ts
import { contrastRatio } from '../src/lib/color'
import { THEME_PRESET_IDS } from '../src/domain/theme'
import { PRESETS } from '../src/lib/theme/presets'
import { FAIXA_FIO, PISOS, resolveTheme } from '../src/lib/theme/resolve'

// Destaques plausíveis que um dono escolheria. Cada um é aprovado em pelo
// menos uma face de algum preset, e é justamente esse o caminho que produziu
// o defeito da Fase 4.
const DESTAQUES_DE_PROVA = ['#241e0a', '#8a2d1a', '#1a4d8a', '#0f5132', '#e0603f']

let falhas = 0

function piso(rotulo: string, razao: number, minimo: number) {
  const ok = razao >= minimo
  if (!ok) falhas += 1
  console.log(
    `    ${ok ? 'ok   ' : 'FALHA'} ${rotulo.padEnd(11)} ${razao.toFixed(2).padStart(5)}:1  (piso ${minimo})`,
  )
}

function faixa(rotulo: string, razao: number) {
  const ok = razao >= FAIXA_FIO.min && razao <= FAIXA_FIO.max
  if (!ok) falhas += 1
  const motivo = razao < FAIXA_FIO.min ? 'sumiu no fundo' : 'compete com o texto'
  console.log(
    `    ${ok ? 'ok   ' : 'FALHA'} ${rotulo.padEnd(11)} ${razao.toFixed(2).padStart(5)}:1  ` +
      `(faixa ${FAIXA_FIO.min}-${FAIXA_FIO.max})${ok ? '' : ` -- ${motivo}`}`,
  )
}

function conferirFace(rotulo: string, vars: Record<string, string>) {
  console.log(`  ${rotulo}`)
  const base = vars['--m-base']
  piso('ink', contrastRatio(base, vars['--m-ink']), PISOS.ink)
  piso('muted', contrastRatio(base, vars['--m-muted']), PISOS.muted)
  piso('accent', contrastRatio(base, vars['--m-accent']), PISOS.accent)
  piso(
    'on-accent',
    contrastRatio(vars['--m-accent'], vars['--m-on-accent']),
    PISOS.onAccent,
  )
  faixa('line', contrastRatio(base, vars['--m-line']))
}

for (const id of THEME_PRESET_IDS) {
  console.log(`\n${PRESETS[id].label} (${id}) -- cores do preset`)
  const padrao = resolveTheme({
    preset: id,
    base: null,
    accent: null,
    density: 'confortavel',
  })
  conferirFace('face clara', padrao.styleLight)
  conferirFace('face escura', padrao.styleDark)

  for (const accent of DESTAQUES_DE_PROVA) {
    console.log(`\n${PRESETS[id].label} (${id}) -- destaque personalizado ${accent}`)
    const t = resolveTheme({
      preset: id,
      base: null,
      accent,
      density: 'confortavel',
    })
    conferirFace('face clara', t.styleLight)
    conferirFace('face escura', t.styleDark)
  }
}

console.log(
  falhas === 0
    ? '\nTODOS OS TOKENS DENTRO DA REGRA'
    : `\n${falhas} TOKEN(S) FORA DA REGRA`,
)
process.exit(falhas === 0 ? 0 : 1)
