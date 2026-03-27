// Central configuration for frontend scripts
window.NW_CONFIG = window.NW_CONFIG || (function(){
  // Default: if running on localhost use local backend, otherwise use relative /api for serverless on Vercel.
  var host = (typeof location !== 'undefined' && location.hostname) ? location.hostname : '';
  var isLocal = /^(localhost|127\\.0\\.0\\.1)$/.test(host);
  return {
    API_BASE: isLocal ? 'http://127.0.0.1:3001' : '/api'
  };
})();

