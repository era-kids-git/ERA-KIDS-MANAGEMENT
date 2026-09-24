import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  // Prevent any horizontal drift or layout shifting after keyboard dismissal on mobile
  window.addEventListener('focusout', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
      if (window.scrollX !== 0) {
        window.scrollTo({ left: 0 });
      }
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
