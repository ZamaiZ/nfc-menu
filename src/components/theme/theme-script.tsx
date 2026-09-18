// Este script roda ANTES da primeira pintura. E ele que evita o lampejo
// branco quando a preferencia e escura: sem isso, a pagina pinta clara e so
// depois o React corrige, o que aparece como um flash na cara do usuario.
//
// Precisa ser sincrono e embutido. Um componente React normal nao serve,
// porque so executaria depois da hidratacao -- tarde demais.
//
// O try/catch nao e decorativo: em janela privada o acesso ao localStorage
// LANCA, e sem ele a pagina inteira quebraria antes de pintar qualquer coisa.
const script = `(function(){try{var t=localStorage.getItem("tema");var d=t==="dark"||((!t||t==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})()`

export function ThemeScript() {
  // Unico dangerouslySetInnerHTML do projeto, e seguro porque o conteudo e
  // uma constante escrita por nos, sem nenhuma entrada de usuario.
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
