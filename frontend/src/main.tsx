import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom';

import './index.css'
import router from "./routes";

import { worker } from './mocks/browser';
import { login } from './services';
import { Toaster } from './components/ui/sonner';
import { SuccessOverlayProvider } from './components/common/success';
worker.start().then(async () => {
  await login({ email: 'john@example.com', password: 'secret-password' });
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <SuccessOverlayProvider>
        <RouterProvider router={router} />
        <Toaster />
      </SuccessOverlayProvider>
    </StrictMode>,
  )

});

