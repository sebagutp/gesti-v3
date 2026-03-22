export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        {/* TODO: Header */}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t">
        {/* TODO: Footer */}
      </footer>
    </div>
  )
}
