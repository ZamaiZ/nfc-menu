'use client'

import { useMemo, useState, useTransition } from 'react'
import { RiArrowGoBackLine, RiCheckLine } from 'react-icons/ri'
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
import { contrastRatio } from '@/lib/color'
import { isBaseInRange, PRESETS } from '@/lib/theme/presets'
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
  const [segmento, setSegmento] = useState<string | null>(segment)
  const [tocouTema, setTocouTema] = useState(false)
  const [pending, startTransition] = useTransition()

  const preset = PRESETS[escolha.preset]
  const baseAtual = escolha.base ?? preset.light.base
  const accentAtual = escolha.accent ?? preset.light.accent

  // As duas conferências do servidor, repetidas aqui. Isto é conveniência —
  // a regra é o `updateIdentity`, que roda de novo e recusa. Mas dizer
  // "não passa" no momento da escolha é muito melhor que dizer ao salvar.
  const baseValida = useMemo(
    () => isBaseInRange(escolha.preset, baseAtual),
    [escolha.preset, baseAtual],
  )
  const razaoAccent = useMemo(
    () => contrastRatio(baseAtual, accentAtual),
    [baseAtual, accentAtual],
  )
  const accentValido = razaoAccent >= 3

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
  }

  function salvar() {
    startTransition(async () => {
      const result = await updateIdentityAction({
        restaurantId,
        segment: segmento,
        theme: escolha,
      })
      if (result.ok) {
        toast.add({ title: 'Identidade salva', type: 'success' })
        onSaved?.()
      } else {
        toast.add({ title: result.error, type: 'error' })
      }
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-8">
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
            <input
              id="base"
              type="color"
              value={baseAtual}
              onChange={(event) =>
                setEscolha((a) => ({ ...a, base: event.target.value }))
              }
              className="h-11 w-full cursor-pointer rounded-md border border-input bg-transparent p-1"
            />
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
            <input
              id="accent"
              type="color"
              value={accentAtual}
              onChange={(event) =>
                setEscolha((a) => ({ ...a, accent: event.target.value }))
              }
              className="h-11 w-full cursor-pointer rounded-md border border-input bg-transparent p-1"
            />
            <FieldDescription>
              Contraste {razaoAccent.toFixed(1)}:1.{' '}
              {accentValido ? (
                'Legível sobre o fundo.'
              ) : (
                <span className="text-destructive">
                  Abaixo de 3:1. Escolha um tom mais escuro ou mais claro.
                </span>
              )}
            </FieldDescription>
          </Field>
        </div>

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

        <div className="flex flex-wrap gap-2">
          <Button onClick={salvar} disabled={pending || !baseValida || !accentValido}>
            {pending ? <Spinner className="size-4" /> : <RiCheckLine className="size-4" />}
            Salvar identidade
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setEscolha((a) => ({ ...a, base: null, accent: null }))}
          >
            <RiArrowGoBackLine className="size-4" />
            Restaurar as cores do tema
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-small text-muted-foreground">
          É assim que o cliente vai ver.
        </p>
        <ThemePreview theme={escolha} name={name} />
      </div>
    </div>
  )
}
