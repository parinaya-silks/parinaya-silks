import { loadEnv } from 'vite';
import { verifyFirestoreConnection } from '../src/services/firebase/verification.ts';

const args = process.argv.slice(2);
let mode = 'development';
let documentPath: string | undefined;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--mode' && args[i + 1]) mode = args[++i];
  else if (args[i] === '--document' && args[i + 1]) documentPath = args[++i];
  else { console.error('Usage: npm run firebase:check -- [--mode development|production|preview] [--document approved/document]'); process.exit(1); }
}
if (!['development', 'production', 'preview'].includes(mode)) { console.error('Unsupported environment mode.'); process.exit(1); }
const environment = { ...loadEnv(mode, process.cwd(), 'VITE_FIREBASE_') };
for (const [name, value] of Object.entries(process.env)) {
  if (name.startsWith('VITE_FIREBASE_') && value !== undefined) environment[name] = value;
}
const result = await verifyFirestoreConnection({ environment, documentPath });
console.log(JSON.stringify(result, null, 2));
// Initialization is not a successful database-read check.
process.exit(result.databaseReadVerified ? 0 : 2);
