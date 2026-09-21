import type { ResultadoCompressao } from './tipos'

const MAIOR_LADO = 1920
const QUALIDADE = 0.86

// Canvas, e não uma biblioteca. O navegador já sabe redimensionar e
// codificar; trazer dependência para isso seria peso no pacote de uma tela
// que o dono abre do celular.
export async function comprimirImagem(
  arquivo: File,
): Promise<ResultadoCompressao> {
  const bitmap = await createImageBitmap(arquivo)

  try {
    // Sem AMPLIAR: `Math.min(1, ...)`. Esticar uma foto pequena para 1920
    // aumentaria o arquivo sem acrescentar um pixel de informação.
    const escala = Math.min(
      1,
      MAIOR_LADO / Math.max(bitmap.width, bitmap.height),
    )
    const largura = Math.round(bitmap.width * escala)
    const altura = Math.round(bitmap.height * escala)

    const original: ResultadoCompressao = {
      blob: arquivo,
      largura: bitmap.width,
      altura: bitmap.height,
      comprimiu: false,
    }

    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    const contexto = canvas.getContext('2d')
    if (!contexto) return original

    contexto.drawImage(bitmap, 0, 0, largura, altura)

    // WebP é o PEDIDO, não a promessa: Safari antigo aceita o pedido e
    // devolve PNG calado. Quem chama lê `blob.type` em vez de supor — é a
    // mesma regra que `captureVideoPoster` segue desde a Fase 2.
    const blob = await new Promise<Blob | null>((resolver) => {
      canvas.toBlob((saida) => resolver(saida), 'image/webp', QUALIDADE)
    })

    // Comprimir para PIORAR é o defeito clássico daqui. Acontece com PNG
    // pequeno e com foto que já veio otimizada.
    if (!blob || blob.size >= arquivo.size) return original

    return { blob, largura, altura, comprimiu: true }
  } finally {
    // Sem isto, um dono que escolhe dez fotos segura dez bitmaps
    // descomprimidos na memória do celular.
    bitmap.close()
  }
}
