import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold">Home</h1>
        <Button>Get Started</Button>
      </div>
    </div>
  )
}
