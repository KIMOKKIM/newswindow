/**
 * server.js 기동 시 설정 — /api/health 등에서 읽기 전용
 */
export const bootState = {
  /** assertSupabaseRequiredAtStartup 통과 여부 */
  supabaseRequiredEnvOk: false,
  /** HTTP 리스닝 시작 완료 시각 (ISO) */
  listenAt: null,
};
