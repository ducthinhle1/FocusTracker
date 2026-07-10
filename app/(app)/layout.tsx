import { AppHeader } from "@/components/layout/AppHeader"

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex flex-1 flex-col pb-16 sm:pb-0">{children}</main>
    </div>
  )
}
