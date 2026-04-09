import { Router } from 'express';
import {
  useSupabasePersistence,
  useLegacyFileDb,
  getArticlesReadSource,
  getAdsReadSource,
} from '../lib/dbMode.js';
import { isSupabaseConfigured, getServiceSupabase } from '../lib/supabaseServer.js';

/** 배포/지원 식별용 — 짧은 JSON만 보이면 이 번들이 아님 */
export const HEALTH_ROUTE_VERSION = '2-extended';

const router = Router();

router.get('/', async (req, res) => {
  res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.set('X-NW-Health-Route', HEALTH_ROUTE_VERSION);

  let supabaseConnected = false;
  let adsConfigConnected = false;
  if (isSupabaseConfigured()) {
    try {
      const sb = getServiceSupabase();
      if (sb) {
        const articlesProbe = await sb.from('articles').select('id').limit(1);
        supabaseConnected = !articlesProbe.error;
        const adsProbe = await sb.from('ad_site_config').select('id').eq('id', 1).maybeSingle();
        adsConfigConnected = !adsProbe.error;
      }
    } catch {
      supabaseConnected = false;
      adsConfigConnected = false;
    }
  }

  const payload = {
    ok: true,
    timestamp: new Date().toISOString(),
    healthRouteVersion: HEALTH_ROUTE_VERSION,
    renderGitCommit: process.env.RENDER_GIT_COMMIT || null,
    storage: useSupabasePersistence() ? 'supabase' : 'file',
    articlesReadSource: getArticlesReadSource(),
    adsReadSource: getAdsReadSource(),
    supabaseConfigured: isSupabaseConfigured(),
    supabaseConnected,
    adsConfigConnected,
    allStorageOk: supabaseConnected && adsConfigConnected,
    legacyFileDbFlag: useLegacyFileDb(),
  };

  res.status(200).json(payload);
});

export { router as healthRouter };
