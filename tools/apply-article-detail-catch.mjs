import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const p = fileURLToPath(new URL('../backend/routes/articles.js', import.meta.url));
let s = readFileSync(p, 'utf8');
// Source file contains two backslash chars before "d" in (\\d+)
const startMarker = "articlesRouter.get('/public/:id(\\\\d+)', async (req, res, next) => {";
const endMarker = '// GET /api/articles —';
const i = s.indexOf(startMarker);
if (i < 0) {
  console.error('start not found');
  process.exit(1);
}
const end = s.indexOf(endMarker, i);
if (end < 0) {
  console.error('end not found');
  process.exit(1);
}
let block = s.slice(i, end);
const oldCatch = `  } catch (e) {
    next(e);
  }
});`;
if (!block.includes(oldCatch)) {
  console.error('catch pattern not found in public/:id block');
  process.exit(1);
}
const newCatch = `  } catch (e) {
    const ms = Date.now() - t0;
    const tags = classifyUpstreamError(e);
    const upstreamCategory = upstreamPrimaryCategory(tags);
    console.error(
      '[nw/article-detail]',
      JSON.stringify({
        route: 'GET /api/articles/public/:id',
        reqId: req.nwRequestId,
        articleId: req.params.id,
        ms,
        upstreamCategory,
        tags,
      }),
    );
    next(e);
  }
});`;
block = block.replace(oldCatch, newCatch);
s = s.slice(0, i) + block + s.slice(end);
writeFileSync(p, s);
console.log('patched public/:id catch');
