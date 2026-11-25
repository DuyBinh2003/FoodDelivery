import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = join(__dirname, '..');

const tsxCli = join(backendRoot, 'node_modules/tsx/dist/cli.mjs');
const result = spawnSync(process.execPath, [tsxCli, join(__dirname, 'seed-all.ts'), '--only-s3'], {
  cwd: backendRoot,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
