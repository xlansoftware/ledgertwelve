import { useUserStore } from '@/store/userStore'

export default function HomePage() {
  const user = useUserStore((s) => s.user)

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold">Home</h1>
        <p className="text-muted-foreground text-sm">
          Welcome, {user ?? 'User'}!
        </p>
      </div>
    </div>
  )
}
