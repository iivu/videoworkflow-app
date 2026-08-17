import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = resolve(apiDir, '../..');

// 解析 pnpm-workspace.yaml 中的 catalog（仅支持扁平的 key: version 结构）
const workspaceYaml = readFileSync(resolve(rootDir, 'pnpm-workspace.yaml'), 'utf8');
const catalog = {};
let inCatalog = false;
for (const line of workspaceYaml.split('\n')) {
  if (/^catalog:/.test(line)) {
    inCatalog = true;
    continue;
  }
  if (inCatalog) {
    if (/^\S/.test(line)) break; // 遇到顶层字段，catalog 结束
    const match = line.match(/^\s+['"]?([^'"]+?)['"]?:\s*(\S+)\s*$/);
    if (match) catalog[match[1]] = match[2];
  }
}

const pkg = JSON.parse(readFileSync(resolve(apiDir, 'package.json'), 'utf8'));

for (const field of ['dependencies', 'devDependencies']) {
  const deps = pkg[field];
  if (!deps) continue;
  for (const [name, version] of Object.entries(deps)) {
    if (version.startsWith('workspace:')) {
      delete deps[name];
    } else if (version.startsWith('catalog:')) {
      const realVersion = catalog[name];
      if (!realVersion) {
        throw new Error(`catalog 中未找到依赖版本: ${name}`);
      }
      deps[name] = realVersion;
    }
  }
  if (Object.keys(deps).length === 0) delete pkg[field];
}

const outDir = resolve(apiDir, 'build');
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
console.log('已生成 build/package.json');
