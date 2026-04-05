/**
 * Vercel: admin SPA 빌드 후 항상 `public/admin/` 에 복사 — `VERCEL` 환경 변수 미노출 시에도
 * 배포 산출물에 /admin 정적 파일이 포함되도록 함 (public → 사이트 루트 매핑 전제).
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const adminDir = join(root, 'admin');
const publicDir = join(root, 'public');
const publicAdminDir = join(publicDir, 'admin');

/** Repo-root static files served at site `/` (Vercel static root is `public/`). */
const MAIN_SITE_FILES = [
  'index.html',
  'styles.css',
  'script.js',
  'article.html',
  'all-articles.html',
  'all-articles.js',
  'info.html',
  'signup.html',
  'login.html',
];
const MAIN_SITE_DIRS = ['images'];

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

function copyMainSiteIntoPublic() {
  mkdirSync(publicDir, { recursive: true });
  for (const name of MAIN_SITE_FILES) {
    const src = join(root, name);
    if (!existsSync(src)) continue;
    cpSync(src, join(publicDir, name), { force: true });
  }
  for (const name of MAIN_SITE_DIRS) {
    const src = join(root, name);
    if (!existsSync(src)) continue;
    cpSync(src, join(publicDir, name), { recursive: true, force: true });
  }
}

/**
 * 메인 index.html: 업로드/기사 API가 Vercel과 다른 호스트(Render 등)일 때 동일 origin 주입.
 * → window.NW_PUBLIC_UPLOAD_ORIGIN, window.NW_API_ORIGIN
 */
function injectMainSiteUploadOrigin() {
  const p = join(publicDir, 'index.html');
  if (!existsSync(p)) return;
  let html = readFileSync(p, 'utf8');
  const origin = String(process.env.PUBLIC_UPLOAD_ORIGIN || process.env.BACKEND_PUBLIC_URL || '')
    .trim()
    .replace(/\/+$/, '');
  html = html.replace(
    /<script>\(function\(\)\{var u=[^<]*NW_API_ORIGIN=u[^<]*\}\)\(\);<\/script>\s*/gi,
    ''
  );
  html = html.replace(/<script>window\.NW_PUBLIC_UPLOAD_ORIGIN=[\s\S]*?<\/script>\s*/gi, '');
  if (origin) {
    const snippet =
      '<script>(function(){var u=' +
      JSON.stringify(origin) +
      ';window.NW_PUBLIC_UPLOAD_ORIGIN=u;window.NW_API_ORIGIN=u;})();</script>';
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, snippet + '\n</head>');
    } else {
      html = snippet + '\n' + html;
    }
  }
  writeFileSync(p, html, 'utf8');

  const articlePath = join(publicDir, 'article.html');
  if (existsSync(articlePath)) {
    let ah = readFileSync(articlePath, 'utf8');
    ah = ah.replace(
      /<script>\(function\(\)\{var u=[^<]*NW_API_ORIGIN=u[^<]*\}\)\(\);<\/script>\s*/gi,
      ''
    );
    ah = ah.replace(/<script>window\.NW_PUBLIC_UPLOAD_ORIGIN=[\s\S]*?<\/script>\s*/gi, '');
    if (origin) {
      const snippet =
        '<script>(function(){var u=' +
        JSON.stringify(origin) +
        ';window.NW_PUBLIC_UPLOAD_ORIGIN=u;window.NW_API_ORIGIN=u;})();</script>';
      if (/<\/head>/i.test(ah)) {
        ah = ah.replace(/<\/head>/i, snippet + '\n</head>');
      } else {
        ah = snippet + '\n' + ah;
      }
    }
    writeFileSync(articlePath, ah, 'utf8');
  }

  if (origin) console.log('vercel-build: injected NW_PUBLIC_UPLOAD_ORIGIN + NW_API_ORIGIN.');
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

console.log('vercel-build: copying repo-root main site → public/ …');
copyMainSiteIntoPublic();
injectMainSiteUploadOrigin();

const sharedDir = join(root, 'shared');
const publicSharedDir = join(publicDir, 'shared');
if (existsSync(join(sharedDir, 'articleCategories.json'))) {
  mkdirSync(publicSharedDir, { recursive: true });
  cpSync(join(sharedDir, 'articleCategories.json'), join(publicSharedDir, 'articleCategories.json'), { force: true });
  console.log('vercel-build: shared/articleCategories.json → public/shared/ …');
}

console.log('vercel-build: public/ (main + admin) ready.');
