// Copies the shared spike code into both apps (a bundler root cannot import from outside itself reliably).
import { cpSync, rmSync } from 'node:fs';
for (const app of ['expo-app', 'vite-app']) {
  rmSync(`${app}/src/shared`, { recursive: true, force: true });
  cpSync('shared', `${app}/src/shared`, { recursive: true });
}
