'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  RiArrowGoBackLine,
  RiCheckLine,
  RiSmartphoneLine,
} from 'react-icons/ri'
import { BrandImages } from '@/components/painel/brand-images'
import { ThemePreview } from '@/components/painel/theme-preview'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { NativeSelect } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { SEGMENTS_ORDENADOS, suggestPresetFor } from '@/domain/segment'
import {
  THEME_PRESET_IDS,
  themeSchema,
  type Density,
  type ThemeChoice,
  type ThemePresetId,
} from '@/domain/theme'
import { fitContrast, hexToOklch, oklchToHex } from '@/lib/color'
import { isBaseInRange, PRESETS } from '@/lib/theme/presets'
import { PISOS } from '@/lib/theme/resolve'
import { updateIdentityAction } from '@/server/actions/restaurants'
import { cn } from 'cn'

export function IdentityForm({
  restaurantId,
  name,
  segment,
  theme,
  logoPath,
  coverPath,
  onSaved,
}: {
  restaurantId: string
  name: string
  segment: string | null
  theme: unknown
  logoPath: string | null
  coverPath: string | null
  /** O assistente usa isto para avançar de passo; a tela solta não passa. */
  onSaved?: () => void
}) {
  const inicial = themeSchema.safeParse(theme ?? {})
  const [escolha, setEscolha] = useState<ThemeChoice>(
    inicial.success
      ? inicial.data
      : { preset: 'grao', base: null, accent: null, density: 'confortavel' },
  )
  const [salvo, setSalvo] = useState(escolha)
  const [segmento, setSegmento] = useState<string | null>(segment)
  const [segmentoSalvo, setSegmentoSalvo] = useState(segment)
  const [tocouTema, setTocouTema] = useState(false)
  // O aceite da derivação é por MUDANÇA, não por sessão: quem abre a tela e
  // não mexe na cor não é interrogado de novo sobre uma escolha que já fez.
  const [tocouAccent, setTocouAccent] = useState(false)
  const [accentAceito, setAccentAceito] = useState(false)
  const [pending, startTransition] = useTransition()
  const [previewOpen, setPreviewOpen] = useState(true)
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light')

  const preset = PRESETS[escolha.preset]
  const baseAtual = escolha.base ?? preset.light.base
  const accentAtual = escolha.accent ?? preset.light.accent
  const baseOptions = useMemo(() => {
    const { l, c } = preset.baseRange
    const hue = hexToOklch(preset.light.base).h
    const options = new Set<string>([preset.light.base])
    for (let lightness = l[0]; lightness <= l[1] + 0.0001; lightness += 0.035) {
      for (let chroma = c[0]; chroma <= c[1] + 0.0001; chroma += 0.012) {
        const color = oklchToHex({ l: lightness, c: chroma, h: hue })
        if (isBaseInRange(escolha.preset, color)) options.add(color)
      }
    }
    return [...options]
  }, [escolha.preset, preset])
  const accentOptions = useMemo(() => {
    const source = hexToOklch(preset.light.accent)
    const candidates = new Set<string>()
    for (const hueDelta of [-30, -20, -10, 0, 10, 20, 30]) {
      for (const lightDelta of [-0.08, 0, 0.08]) {
        const color = oklchToHex({ l: Math.max(0.2, Math.min(0.88, source.l + lightDelta)), c: source.c, h: (source.h + hueDelta + 360) % 360 })
        if (fitContrast(color, baseAtual, PISOS.accent) && fitContrast(color, preset.dark.base, PISOS.accent)) candidates.add(color)
      }
    }
    if (fitContrast(accentAtual, baseAtual, PISOS.accent) && fitContrast(accentAtual, preset.dark.base, PISOS.accent)) candidates.add(accentAtual)
    return [...candidates]
  }, [accentAtual, baseAtual, preset])

  // As duas conferências do servidor, repetidas aqui. Isto é conveniência —
  // a regra é o `updateIdentity`, que roda de novo e recusa. Mas dizer
  // "não passa" no momento da escolha é muito melhor que dizer ao salvar.
  const baseValida = useMemo(
    () => isBaseInRange(escolha.preset, baseAtual),
    [escolha.preset, baseAtual],
  )
  // A derivação por face, a mesma que `resolveTheme` faz para desenhar o
  // cardápio e que `updateIdentity` confere antes de gravar. `null` numa das
  // faces quer dizer que nem o extremo de luminosidade atinge o piso — e aí
  // a cor é recusada, não adaptada.
  const derivado = useMemo(
    () => ({
      claro: fitContrast(accentAtual, baseAtual, PISOS.accent),
      escuro: fitContrast(accentAtual, preset.dark.base, PISOS.accent),
    }),
    [accentAtual, baseAtual, preset],
  )

  const accentValido = derivado.claro !== null && derivado.escuro !== null
  const temMudancas = JSON.stringify(escolha) !== JSON.stringify(salvo) || segmento !== segmentoSalvo

  // Só pede aceite quando a derivação de fato MUDOU a cor. Cor que já serve
  // nas duas faces passa direto: pedir confirmação do que não mudou é ruído
  // que ensina a clicar sem ler.
  const precisaAceite =
    tocouAccent &&
    accentValido &&
    (derivado.claro !== accentAtual || derivado.escuro !== accentAtual)

  function trocarSegmento(valor: string) {
    const novo = valor === '' ? null : valor
    setSegmento(novo)

    // Sugere o tema, e só enquanto a pessoa não tiver escolhido um à mão.
    // Depois disso a escolha é dela, e sobrescrever seria desfazer decisão.
    if (!tocouTema) {
      const sugerido = suggestPresetFor(novo)
      if (sugerido) setEscolha((atual) => ({ ...atual, preset: sugerido }))
    }
  }

  function trocarPreset(id: ThemePresetId) {
    setTocouTema(true)
    // As cores voltam ao padrão do preset novo: um fundo escolhido dentro da
    // faixa do Grão quase nunca está dentro da faixa do Brasa, e carregar a
    // cor antiga produziria um estado recusado já no primeiro render.
    setEscolha((atual) => ({ ...atual, preset: id, base: null, accent: null }))
    // E o aceite zera junto: a cor voltou a ser a do preset, que é calibrada
    // e não precisa de aceite nenhum.
    setTocouAccent(false)
    setAccentAceito(false)
  }

  function salvar() {
    startTransition(async () => {
      const result = await updateIdentityAction({
        restaurantId,
        segment: segmento,
        theme: escolha,
      })
      if (result.ok) {
        setSalvo(escolha)
        setSegmentoSalvo(segmento)
        toast.add({ title: 'Identidade salva', type: 'success' })
        onSaved?.()
      } else {
        toast.add({ title: result.error, type: 'error' })
      }
    })
  }

  return (
    <div className="tv-identity-layout">
      <div className="tavvi-surface space-y-6 p-5 sm:p-6">
        {/* Logo e capa gravam SOZINHAS, na hora do envio — não esperam o
            "Salvar identidade". Envio de arquivo já é uma confirmação por si,
            e amarrar o arquivo a um botão de salvar criaria um estado onde o
            arquivo está no storage mas o banco ainda não sabe dele. */}
        <BrandImages
          restaurantId={restaurantId}
          logoPath={logoPath}
          coverPath={coverPath}
        />

        <Field>
          <FieldLabel htmlFor="segmento">Tipo de restaurante</FieldLabel>
          <NativeSelect
            id="segmento"
            value={segmento ?? ''}
            onChange={(event) => trocarSegmento(event.target.value)}
          >
            <option value="">Não informar</option>
            {SEGMENTS_ORDENADOS.map((s) => (
              <option key={s.label} value={s.label}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
          <FieldDescription>
            Só serve para sugerir um tema. Você pode trocar o tema depois.
          </FieldDescription>
        </Field>

        <div>
          <p className="text-small font-medium">Tema do cardápio</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {THEME_PRESET_IDS.map((id) => {
              const p = PRESETS[id]
              const ativo = escolha.preset === id
              const sugerido = suggestPresetFor(segmento) === id

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => trocarPreset(id)}
                  aria-pressed={ativo}
                  className={cn(
                    'flex min-h-11 flex-col gap-2 rounded-lg border p-3 text-left transition-colors',
                    ativo
                      ? 'border-primary bg-accent'
                      : 'border-border hover:bg-accent/50',
                  )}
                >
                  <span className="flex gap-1" aria-hidden="true">
                    {[p.light.base, p.light.accent, p.dark.base].map((cor, i) => (
                      <i
                        key={i}
                        className="size-3.5 rounded-full border border-border"
                        style={{ background: cor }}
                      />
                    ))}
                  </span>
                  <span aria-hidden="true" className="text-lg leading-none" style={{ color: p.light.accent, fontFamily: p.displayFont }}>Aa</span>
                  <span className="text-card font-semibold">{p.label}</span>
                  {sugerido ? (
                    <span className="text-micro font-semibold uppercase tracking-wider text-primary">
                      Sugerido
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-small text-muted-foreground">
            {preset.segments.slice(0, 5).join(' · ')}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="base">Cor de fundo</FieldLabel>
            <div className="tv-theme-colors" role="group" aria-label="Opções de cor de fundo">
              {baseOptions.map((color) => <button
                key={color}
                type="button"
                title={color}
                aria-label={`Cor de fundo ${color}`}
                aria-pressed={baseAtual.toLowerCase() === color.toLowerCase()}
                onClick={() => setEscolha((current) => ({ ...current, base: color === preset.light.base ? null : color }))}
                style={{ backgroundColor: color }}
              />)}
            </div>
            <p className="font-mono text-xs text-muted-foreground">{baseAtual}</p>
            <FieldDescription>
              {baseValida ? (
                'Dentro da faixa deste tema.'
              ) : (
                <span className="text-destructive">
                  Fora da faixa do tema {preset.label}. O cardápio ficaria
                  ilegível, e o servidor vai recusar.
                </span>
              )}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="accent">Cor de destaque</FieldLabel>
            <div className="tv-theme-colors" role="group" aria-label="Cores de destaque deste tema">
              {accentOptions.map((color) => <button
                key={color}
                type="button"
                title={color}
                aria-label={`Cor de destaque ${color}`}
                aria-pressed={accentAtual.toLowerCase() === color.toLowerCase()}
                onClick={() => {
                  setTocouAccent(true)
                  setAccentAceito(false)
                  setEscolha((current) => ({ ...current, accent: color === preset.light.accent ? null : color }))
                }}
                style={{ backgroundColor: color }}
              />)}
            </div>
            <p className="font-mono text-xs text-muted-foreground">{accentAtual}</p>
            <FieldDescription>
              {accentValido ? (
                'O matiz é mantido nas duas versões do cardápio; só a luminosidade se ajusta quando precisa.'
              ) : (
                <span className="text-destructive">
                  Não fica legível na versão{' '}
                  {derivado.claro === null && derivado.escuro === null
                    ? 'clara nem na escura'
                    : derivado.claro === null
                      ? 'clara'
                      : 'escura'}{' '}
                  do cardápio. Escolha um tom mais vivo ou menos acinzentado.
                </span>
              )}
            </FieldDescription>
          </Field>
        </div>

        {/* A derivação não é silenciosa. Sem isto, a cor da marca mudaria
            pelas costas do dono e ele só descobriria se olhasse a
            pré-visualização escura. */}
        {precisaAceite ? (
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            <p className="text-small font-medium">
              Esta cor precisa de ajuste para ficar legível
            </p>
            <p className="mt-1 text-small text-muted-foreground">
              O matiz é mantido; só a luminosidade muda, e só na versão em que
              a cor original não seria lida.
            </p>

            <div className="mt-3 flex flex-wrap gap-4">
              {[
                { rotulo: 'Você escolheu', cor: accentAtual },
                { rotulo: 'No claro', cor: derivado.claro ?? accentAtual },
                { rotulo: 'No escuro', cor: derivado.escuro ?? accentAtual },
              ].map((amostra) => (
                <div key={amostra.rotulo}>
                  <span
                    className="block size-10 rounded-md border border-border"
                    style={{ background: amostra.cor }}
                  />
                  <p className="mt-1 text-micro text-muted-foreground">
                    {amostra.rotulo}
                  </p>
                  <p className="text-micro font-medium">{amostra.cor}</p>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setAccentAceito(true)}
            >
              <RiCheckLine className="size-4" />
              Entendi, usar assim
            </Button>
          </div>
        ) : null}

        <div>
          <p className="text-small font-medium">Densidade</p>
          <div className="mt-3 flex gap-2">
            {(['confortavel', 'compacto'] as Density[]).map((d) => (
              <Button
                key={d}
                type="button"
                variant={escolha.density === d ? 'default' : 'outline'}
                onClick={() => setEscolha((a) => ({ ...a, density: d }))}
              >
                {d === 'confortavel' ? 'Confortável' : 'Compacto'}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-small text-muted-foreground">
            Compacto recolhe a descrição e aperta a linha. Serve a cardápio de
            centenas de itens, como rotisserie e self-service.
          </p>
        </div>

        <div className="tv-identity-savebar">
          <span>{temMudancas ? 'Alterações pendentes' : 'Tudo salvo'}</span>
          <div className="flex flex-wrap gap-2">
          <Button
            onClick={salvar}
            disabled={
              pending ||
              !temMudancas ||
              !baseValida ||
              !accentValido ||
              (precisaAceite && !accentAceito)
            }
          >
            {pending ? <Spinner className="size-4" /> : <RiCheckLine className="size-4" />}
            {pending ? 'Salvando…' : 'Salvar identidade'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setEscolha((a) => ({ ...a, base: null, accent: null }))
              setTocouAccent(false)
              setAccentAceito(false)
            }}
          >
            <RiArrowGoBackLine className="size-4" />
            Restaurar as cores do tema
          </Button>
          </div>
        </div>
      </div>

      <aside className={`tv-identity-preview${previewOpen ? ' is-open' : ''}`}>
        <div className="tv-identity-preview-head">
          <div><h2>Prévia do cardápio</h2><p>Atualizada conforme você edita o tema.</p></div>
          <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen((open) => !open)} aria-expanded={previewOpen} aria-controls="identity-preview-panel">
            <RiSmartphoneLine className="size-4" />{previewOpen ? 'Recolher' : 'Ver'}
          </Button>
        </div>
        <div id="identity-preview-panel" className="tv-identity-preview-body">
          <div className="tv-identity-mode" role="group" aria-label="Aparência da prévia">
            <button type="button" aria-pressed={previewMode === 'light'} onClick={() => setPreviewMode('light')}>Claro</button>
            <button type="button" aria-pressed={previewMode === 'dark'} onClick={() => setPreviewMode('dark')}>Escuro</button>
          </div>
          <ThemePreview theme={escolha} name={name} mode={previewMode} />
        </div>
      </aside>
    </div>
  )
}
