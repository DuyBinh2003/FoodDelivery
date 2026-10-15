import { glob } from 'glob';
import fs from 'fs';

async function checkImports() {
  const files = await glob(['apps/**/*.ts', 'libs/**/*.ts', 'src/**/*.ts', 'test/**/*.ts'], {
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
  });
  let hasError = false;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      // Bỏ qua comments
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
        return;
      }

      // Bắt các relative import/export: from './...', from '../...', import './...', import('./...')
      const match = trimmed.match(/(?:from\s+['"](\.[^'"]+)['"]|import\s+['"](\.[^'"]+)['"]|import\s*\(\s*['"](\.[^'"]+)['"]\s*\))/);
      if (match) {
        const importPath = match[1] || match[2] || match[3];
        console.error(`\x1b[31mError: Relative import ("${importPath}") found in ${file}:${index + 1}\x1b[0m`);
        console.error(`  > ${trimmed}`);
        console.error(`  Vui lòng sử dụng absolute import với alias @/ thay thế.`);
        hasError = true;
      }
    });
  }

  if (hasError) {
    console.error('\x1b[31m✖ CI Check Failed: Phát hiện import tương đối vi phạm quy chuẩn dự án!\x1b[0m');
    process.exit(1);
  } else {
    console.log('\x1b[32m✔ All imports are absolute.\x1b[0m');
  }
}

checkImports().catch(console.error);

