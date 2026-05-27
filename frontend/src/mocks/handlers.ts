// mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/echo', async ({ request }) => {
    return HttpResponse.json({ message: "Hello!" })
  }),
]