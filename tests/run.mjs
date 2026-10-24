import { spawnSync } from 'node:child_process';
for (const test of [
  'learning',
  'efficiency',
  'repository',
  'core',
  'storage',
  'consolidation',
  'academic-sync',
  'sync',
  'api',
  'backup',
  'locales',
  'localisation-audit',
  'merge-boundaries',
  'topic-timer',
  'parity',
  'audit-regressions',
  'api-audit',
  'stress',
]) {
  const result = spawnSync(process.execPath, ['tests/' + test + '.test.mjs'], {
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
