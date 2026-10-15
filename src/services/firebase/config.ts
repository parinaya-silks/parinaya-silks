import type { FirebaseOptions } from 'firebase/app';

export const EXPECTED_FIREBASE_PROJECT_ID = 'parinaya-silks';
export const FIREBASE_ENVIRONMENT_KEYS = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
} as const;

export type FirebaseEnvironment = Record<string, unknown>;
export type ConfigurationIssue = { variable: string; reason: string };
export type FirebaseConfiguration =
  | { status: 'ready'; options: FirebaseOptions }
  | { status: 'missing' | 'invalid'; issues: ConfigurationIssue[] };

// Diagnostics contain variable names and reasons only, never configured values.
export function validateFirebaseConfiguration(environment: FirebaseEnvironment): FirebaseConfiguration {
  const issues: ConfigurationIssue[] = [];
  const values: Record<string, string> = {};
  let missing = false;
  for (const [option, variable] of Object.entries(FIREBASE_ENVIRONMENT_KEYS)) {
    const value = environment[variable];
    if (value === undefined || value === null || value === '') {
      missing = true;
      issues.push({ variable, reason: 'Required value is missing.' });
    } else if (typeof value !== 'string' || value !== value.trim() || /[\s"'<>]/.test(value) || /^(?:your[_-]|replace[_-]|placeholder|my[_-])/i.test(value)) {
      issues.push({ variable, reason: 'Use a configuration value without whitespace, embedded quotes or placeholders.' });
    } else {
      values[option] = value;
    }
  }
  const check = (option: keyof typeof FIREBASE_ENVIRONMENT_KEYS, valid: boolean, reason: string) => {
    if (values[option] && !valid) issues.push({ variable: FIREBASE_ENVIRONMENT_KEYS[option], reason });
  };
  check('apiKey', /^AIza[\w-]{35}$/.test(values.apiKey || ''), 'Expected a Firebase browser API key.');
  check('projectId', values.projectId === EXPECTED_FIREBASE_PROJECT_ID, 'Must target the approved PARINAYA SILKS project.');
  check('authDomain', values.authDomain === `${EXPECTED_FIREBASE_PROJECT_ID}.firebaseapp.com`, 'Must match the supplied Firebase authentication domain.');
  check('storageBucket', values.storageBucket === `${EXPECTED_FIREBASE_PROJECT_ID}.firebasestorage.app`, 'Must match the supplied Firebase storage bucket.');
  check('messagingSenderId', /^\d+$/.test(values.messagingSenderId || ''), 'Expected a numeric sender ID.');
  check('appId', /^1:\d+:web:[a-f\d]+$/i.test(values.appId || '') && values.appId.split(':')[1] === values.messagingSenderId, 'Expected a web app ID matching the sender ID.');
  if (issues.length) return { status: missing ? 'missing' : 'invalid', issues };
  return { status: 'ready', options: values };
}

export function readFirebaseConfiguration(): FirebaseConfiguration {
  return validateFirebaseConfiguration(import.meta.env ?? {});
}
