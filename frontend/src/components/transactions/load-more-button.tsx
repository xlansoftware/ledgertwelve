import { Button } from '@/components/ui/button'

type LoadMoreButtonProps = {
  onClick: () => void
  isLoading: boolean
  hasMore: boolean
}

export default function LoadMoreButton({
  onClick,
  isLoading,
  hasMore,
}: LoadMoreButtonProps) {
  if (!hasMore) return null

  return (
    <div className="flex justify-center py-6">
      <Button variant="outline" onClick={onClick} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Load more...'}
      </Button>
    </div>
  )
}
