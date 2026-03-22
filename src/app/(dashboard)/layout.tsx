export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-[150px] bg-gesti-teal text-white hidden md:block">
        {/* TODO: Sidebar */}
      </aside>
      <main className="flex-1">
        <header className="h-16 border-b flex items-center px-6">
          {/* TODO: Header */}
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
