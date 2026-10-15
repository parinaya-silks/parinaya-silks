import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getFirestoreClient } from './services/firebase/firestore.ts';

// Initialize the client without reading data or changing storefront/demo behavior.
// Developer tooling handles safe diagnostics; customer pages have no status panel.
getFirestoreClient();
if (import.meta.env.DEV) {
  void import('./services/firebase/developer.ts').then(module => module.installFirebaseDeveloperTools());
}

createRoot(document.getElementById('root')!).render(<App />);
