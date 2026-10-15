import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { delimiter, resolve } from 'node:path';
const env = { ...process.env };
// Firebase CLI debug logging can serialize its inherited environment. Tests do
// not need that output, so never enable it through the host's DEBUG setting.
delete env.DEBUG;
env.FIREBASE_DEBUG_PATH = resolve('.cache/admin-emulator-debug.log');
const javaExecutable = process.platform === 'win32' ? 'java.exe' : 'java';
if (!env.JAVA_HOME || !existsSync(resolve(env.JAVA_HOME, 'bin', javaExecutable))) {
  const cache = resolve('.cache/java/runtime');
  if (existsSync(cache)) {
    const candidate = readdirSync(cache).map(name => resolve(cache, name)).find(path => existsSync(resolve(path, 'bin', javaExecutable)));
    if (candidate) env.JAVA_HOME = candidate;
  }
}
if (env.JAVA_HOME && existsSync(resolve(env.JAVA_HOME, 'bin', javaExecutable))) {
  env.PATH = `${resolve(env.JAVA_HOME, 'bin')}${delimiter}${env.PATH || env.Path || ''}`;
  // Windows treats environment names case-insensitively; avoid duplicate PATH keys.
  delete env.Path;
}
env.FIREBASE_EMULATORS_PATH = resolve('.cache/firebase-emulators');
const child = spawn(process.execPath, ['scripts/firebase-test-cli.cjs', 'emulators:exec', '--only', 'auth,firestore', '--project', 'parinaya-silks', 'node --import tsx scripts/admin-emulator-suite.ts'], { stdio: 'inherit', env });
child.on('error', () => { console.error('Unable to start the local emulator tests.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
