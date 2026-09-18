// Preço vive como inteiro de centavos em todo o sistema. A conversão para
// exibição acontece só aqui, na borda.
export function formatPriceBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}
