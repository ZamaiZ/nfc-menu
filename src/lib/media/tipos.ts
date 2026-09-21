// Tipos do pipeline de mídia. Arquivo de NAVEGADOR: não importa nada de
// `@/server` e não conhece Supabase.

// `comprimiu: false` significa que o ORIGINAL está voltando, e não que algo
// falhou. Acontece quando a compressão sairia maior — PNG pequeno, foto já
// otimizada — e comprimir para piorar é o defeito clássico deste tipo de
// código.
export type ResultadoCompressao = {
  blob: Blob
  largura: number
  altura: number
  comprimiu: boolean
}

export type EstadoMidia =
  | 'pendente'
  | 'comprimindo'
  | 'enviando'
  | 'erro'
  | 'pronta'

// Uma mídia escolhida e ainda NÃO gravada. Ela vive no navegador até o dono
// confirmar. `idLocal` é do navegador, não do banco: a linha do banco só
// existe depois do envio.
export type MidiaPendente = {
  idLocal: string
  arquivo: File
  previewUrl: string
  kind: 'image' | 'video'
  estado: EstadoMidia
  progresso: number
  erro?: string
  duracaoMs?: number
}
