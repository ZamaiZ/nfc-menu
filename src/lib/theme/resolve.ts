import {
  DEFAULT_PRESET,
  themeSchema,
  type Density,
  type FaceDefinition,
  type ThemePreset,
  type ThemePresetId,
} from '@/domain/theme'
import { pickByContrast } from '@/lib/color'
import { isBaseInRange, PRESETS } from './presets'

export type ResolvedTheme = {
  presetId: ThemePresetId
  layout: ThemePreset['layout']
  density: Density
  styleLight: Record<string, string>
  styleDark: Record<string, string>
}

function faceToVars(
  preset: ThemePreset,
  face: FaceDefinition,
  base: string,
): Record<string, string> {
  return {
    '--m-base': base,
    '--m-ink': pickByContrast(base, face.ink),
    '--m-muted': pickByContrast(base, face.muted),
    '--m-line': pickByContrast(base, face.line),
    '--m-accent': face.accent,
    // O texto SOBRE o destaque é escolhido contra o DESTAQUE, não contra o
    // fundo da página. Sem isto, um destaque claro num tema claro daria texto
    // claro sobre fundo claro justamente no único lugar que precisa gritar.
    '--m-on-accent': pickByContrast(face.accent, face.ink),
    '--m-radius-block': preset.radius.block,
    '--m-radius-photo': preset.radius.photo,
    '--m-font-display': preset.displayFont,
    '--m-font-text': preset.textFont,
  }
}

export function resolveTheme(raw: unknown): ResolvedTheme {
  // `safeParse`, e não `parse`. Os `catch` de cada campo cobrem valor ruim
  // DENTRO de um objeto, mas a coluna é jsonb livre e pode conter `42` ou uma
  // string — aí o erro é no nível do objeto e nenhum catch de campo pega.
  // Cardápio no ar não pode cair por causa do conteúdo de uma coluna.
  const parsed = themeSchema.safeParse(raw ?? {})
  const choice = parsed.success
    ? parsed.data
    : {
        preset: DEFAULT_PRESET,
        base: null,
        accent: null,
        density: 'confortavel' as const,
      }

  const preset = PRESETS[choice.preset]

  // O dono escolhe o fundo da face CLARA. A escura mantém o padrão do preset,
  // porque derivar um escuro bom a partir de um claro qualquer não é
  // confiável, e um cardápio ilegível à noite é pior que um previsível.
  // O destaque, esse sim, vale nas duas faces.
  const baseLight =
    choice.base && isBaseInRange(choice.preset, choice.base)
      ? choice.base
      : preset.light.base

  const accent = choice.accent ?? null

  return {
    presetId: preset.id,
    layout: preset.layout,
    density: choice.density,
    styleLight: faceToVars(
      preset,
      accent ? { ...preset.light, accent } : preset.light,
      baseLight,
    ),
    styleDark: faceToVars(
      preset,
      accent ? { ...preset.dark, accent } : preset.dark,
      preset.dark.base,
    ),
  }
}
