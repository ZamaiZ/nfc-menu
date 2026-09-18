export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  // Next 16: params e uma Promise e precisa de await.
  const { slug } = await params

  return (
    <main>
      <h1>Cardápio</h1>
      <p>Restaurante: {slug}</p>
    </main>
  )
}
