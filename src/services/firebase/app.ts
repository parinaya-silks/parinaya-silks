import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { FIREBASE_ENVIRONMENT_KEYS, readFirebaseConfiguration, type FirebaseConfiguration } from './config.ts';

const APP_NAME = 'parinaya-silks-web';

export type FirebaseAppResult =
  | { status: 'app-initialized'; app: FirebaseApp }
  | Exclude<FirebaseConfiguration, { status: 'ready' }>
  | { status: 'initialization-error'; message: string };

// Lazy: importing this module does not initialize services or perform a database read.
export function getFirebaseApp(configuration = readFirebaseConfiguration()): FirebaseAppResult {
  if (configuration.status !== 'ready') return configuration;
  const existing = getApps().find(app => app.name === APP_NAME);
  if (existing) {
    const keys = Object.keys(FIREBASE_ENVIRONMENT_KEYS) as Array<keyof FirebaseOptions>;
    if (keys.some(key => existing.options[key] !== configuration.options[key])) {
      return { status: 'initialization-error', message: 'Firebase configuration changed. Restart the development server and reload the page.' };
    }
    return { status: 'app-initialized', app: existing };
  }
  try {
    return { status: 'app-initialized', app: initializeApp(configuration.options, APP_NAME) };
  } catch {
    return { status: 'initialization-error', message: 'Firebase app initialization failed. Check the browser configuration.' };
  }
}
