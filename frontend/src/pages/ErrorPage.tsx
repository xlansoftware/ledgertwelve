import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom"
import { AlertTriangle, Home, RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// ---------------------------------------------------------------------------
// ErrorPage — route-level error boundary
//
// Used as the router's `errorElement`. Instead of React Router's default
// "Unexpected Application Error!" screen (which exposes minified React error
// codes) this renders a friendly, actionable fallback.
// ---------------------------------------------------------------------------

type ErrorDetails = {
  title: string
  description: string
  /** Low-level message shown under a "Technical details" label. */
  technical: string | null
}

function getErrorDetails(error: unknown): ErrorDetails {
  if (isRouteErrorResponse(error)) {
    return {
      title: `${error.status} ${error.statusText}`,
      description:
        error.status === 404
          ? "We couldn't find the page you were looking for."
          : "The server rejected the request.",
      technical: typeof error.data === "string" ? error.data : null,
    }
  }

  if (error instanceof Error) {
    const isMaxUpdateDepth = /Minified React error #185|Maximum update depth/i.test(error.message)
    return {
      title: "Something went wrong",
      description: isMaxUpdateDepth
        ? "The page entered an unexpected render loop. Reloading usually clears it."
        : "An unexpected error interrupted this page. You can retry or head back home.",
      technical: error.message,
    }
  }

  return {
    title: "Something went wrong",
    description: "An unexpected error interrupted this page. You can retry or head back home.",
    technical: null,
  }
}

export default function ErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()
  const { title, description, technical } = getErrorDetails(error)

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-destructive size-5" />
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RotateCw />
              Reload
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/", { replace: true })}
            >
              <Home />
              Go home
            </Button>
          </div>

          {technical && (
            <details className="text-muted-foreground text-xs">
              <summary className="cursor-pointer select-none">Technical details</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words">
                {technical}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
