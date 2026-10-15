import { defineConfig, type Plugin } from 'vitest/config';
import path from 'path';
import fs from 'fs';

function resolveWithExtension(filePath: string) {
  if (filePath.endsWith('.js')) {
    const tsPath = filePath.slice(0, -3) + '.ts';
    if (fs.existsSync(tsPath)) return tsPath;
  }
  if (fs.existsSync(filePath)) return filePath;
  if (fs.existsSync(filePath + '.ts')) return filePath + '.ts';
  return null;
}

function monorepoPathResolverPlugin(): Plugin {
  return {
    name: 'monorepo-path-resolver',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source.startsWith('@/common/')) {
        const sub = source.replace('@/common/', '');
        return resolveWithExtension(path.resolve(import.meta.dirname, 'libs/common/src', sub));
      }
      if (source.startsWith('@/config/')) {
        const sub = source.replace('@/config/', '');
        return resolveWithExtension(path.resolve(import.meta.dirname, 'libs/config/src', sub));
      }
      if (source.startsWith('@/events/')) {
        const sub = source.replace('@/events/', '');
        return resolveWithExtension(path.resolve(import.meta.dirname, 'libs/events/src', sub));
      }
      if (source.startsWith('@/')) {
        const sub = source.replace('@/', '');
        if (importer) {
          const match = importer.match(/[\\/]apps[\\/]([^\\/]+)/);
          if (match) {
            const appName = match[1];
            return resolveWithExtension(path.resolve(import.meta.dirname, 'apps', appName, 'src', sub));
          }
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [monorepoPathResolverPlugin()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    passWithNoTests: true,
  },
});



