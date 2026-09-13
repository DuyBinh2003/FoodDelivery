import { glob } from 'glob';
import fs from 'fs';

async function checkImports() {
  const files = await glob(['src/**/*.ts', 'test/**/*.ts']);
  let hasError = false;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.match(/(import|export)\s+.*\s+from\s+['"](\.[^'"]+)['"]/)) {
        console.error(`\x1b[31mError: Relative import found in ${file}:${index + 1}\x1b[0m`);
        console.error(`  > ${line.trim()}`);
        console.error(`  Vui lòng sử dụng absolute import với alias @/ thay thế.`);
        hasError = true;
      }
    });
  }

  if (hasError) {
    process.exit(1);
  } else {
    console.log('\x1b[32m✔ All imports are absolute.\x1b[0m');
  }
}

checkImports().catch(console.error);
