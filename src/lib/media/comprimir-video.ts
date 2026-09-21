import type { ResultadoCompressao } from './tipos'

const MAIOR_LADO = 1280
const INTERVALO_CHAVE_S = 2

// Comprime um vídeo no navegador, sem wasm.
//
// O plano previa `mp4box.js` para demultiplexar e `mp4-muxer` para
// multiplexar. Ao instalar, o `mp4-muxer` veio DEPRECADO — "superseded by
// Mediabunny" —, e construir código novo sobre pacote abandonado seria dívida
// no dia um. O `mediabunny` é do mesmo autor, é mantido, é TypeScript puro
// sem wasm (compatível com a CSP `script-src 'self'`) e substitui os DOIS
// pacotes por um só, com uma API de alto nível que já faz demux, transcode e
// mux numa chamada.
//
// Ele entra por `import()` DINÂMICO, e só aqui dentro: quem nunca envia vídeo
// nunca baixa a biblioteca. A compressão de imagem não depende dela — é
// canvas, que o navegador já tem.
//
// Devolve `null` quando não dá para comprimir. Não é erro: é o caminho de
// fallback da §3.5 da spec, e quem chama sobe o original. Ninguém fica
// impedido de enviar o vídeo do próprio prato por causa de um codec.
export async function comprimirVideo(
  arquivo: File,
  aoProgredir: (porcentagem: number) => void,
): Promise<ResultadoCompressao | null> {
  // iPhone com Safari anterior ao 17 não tem WebCodecs.
  if (
    typeof VideoEncoder === 'undefined' ||
    typeof VideoDecoder === 'undefined'
  ) {
    return null
  }

  try {
    const {
      ALL_FORMATS,
      BlobSource,
      BufferTarget,
      Conversion,
      Input,
      Mp4OutputFormat,
      Output,
      QUALITY_HIGH,
    } = await import('mediabunny')

    const input = new Input({
      formats: ALL_FORMATS,
      source: new BlobSource(arquivo),
    })

    const faixa = await input.getPrimaryVideoTrack()
    if (!faixa) return null

    // Sem AMPLIAR. Esticar um vídeo de 480p para 1280 aumentaria o arquivo
    // sem acrescentar um pixel de informação — é o mesmo cuidado que a
    // compressão de imagem toma.
    const maiorLado = Math.max(faixa.displayWidth, faixa.displayHeight)
    const escala = Math.min(1, MAIOR_LADO / maiorLado)
    const largura = Math.round(faixa.displayWidth * escala)
    const altura = Math.round(faixa.displayHeight * escala)

    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    })

    const conversao = await Conversion.init({
      input,
      output,
      video: {
        width: largura,
        height: altura,
        codec: 'avc',
        // `quality`, e não `bitrate`: a própria biblioteca marcou `bitrate`
        // como obsoleto, e a escala relativa se adapta à resolução em vez de
        // fixar um número que fica errado quando o vídeo é menor.
        // QUALITY_HIGH porque o pedido foi "mínima perda de qualidade".
        quality: QUALITY_HIGH,
        keyFrameInterval: INTERVALO_CHAVE_S,
      },
      // O áudio é DESCARTADO, e isso é irreversível. Decisão §2.5 da spec: o
      // feed nunca toca som — `muted` é regra desde a Fase 2, porque som no
      // celular de alguém numa mesa de restaurante é agressão. O áudio que
      // sobe hoje já nasce inaudível, e descartá-lo é a maior economia de
      // bytes disponível de graça.
      audio: { discard: true },
    })

    // `isValid` falso quer dizer que a configuração não produz arquivo
    // utilizável — vídeo sem faixa de vídeo, formato que a saída não aceita.
    // Cai no fallback em vez de estourar na cara do dono.
    if (!conversao.isValid) return null

    conversao.onProgress = (progresso) => {
      aoProgredir(Math.round(progresso * 100))
    }

    await conversao.execute()

    const buffer = output.target.buffer
    if (!buffer) return null

    const blob = new Blob([buffer], { type: 'video/mp4' })

    // Mesma regra da imagem: comprimir para PIORAR é defeito, não resultado.
    if (blob.size >= arquivo.size) return null

    return { blob, largura, altura, comprimiu: true }
  } catch {
    // Qualquer falha no caminho vira fallback, nunca erro na cara do dono.
    // Ele quer publicar um prato, não depurar um codec.
    return null
  }
}
