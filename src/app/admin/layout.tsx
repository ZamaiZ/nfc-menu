export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div data-territory="admin">{children}</div>
}
