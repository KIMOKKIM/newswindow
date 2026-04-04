/**
 * Vercel: admin SPA 빌드 후 항상 `public/admin/` 에 복사 — `VERCEL` 환경 변수 미노출 시에도
 * 배포 산출물에 /admin 정적 파일이 포함되도록 함 (public → 사이트 루트 매핑 전제).
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const adminDir = join(root, 'admin');
const publicAdminDir = join(root, 'public', 'admin');

function runNpm(args, cwd) {
  const r =
    process.platform === 'win32'
      ? spawnSync(`npm ${args.join(' ')}`, { cwd, stdio: 'inherit', env: process.env, shell: true })
      : spawnSync('npm', args, { cwd, stdio: 'inherit', env: process.env, shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function copyDirContents(srcDir, destDir) {
  for (const name of readdirSync(srcDir)) {
    const s = join(srcDir, name);
    const d = join(destDir, name);
    cpSync(s, d, { recursive: true, force: true });
  }
}

if (process.env.VERCEL === '1') {
  runNpm(['ci'], adminDir);
} else {
  console.log('vercel-build: local run — skip npm ci (use admin with deps installed).');
}
runNpm(['run', 'build'], adminDir);

const dist = join(adminDir, 'dist');
if (!existsSync(dist)) {
  console.error('vercel-build: admin/dist not found after build');
  process.exit(1);
}

console.log('vercel-build: copying admin/dist → public/admin/ …');
rmSync(publicAdminDir, { recursive: true, force: true });
mkdirSync(publicAdminDir, { recursive: true });
copyDirContents(dist, publicAdminDir);

console.log('vercel-build: public/admin ready.');
