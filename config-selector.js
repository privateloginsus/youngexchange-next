(function () {
  'use strict';

  window.YEX_ENV = 'public';
  window.YEX_CONFIG = undefined;
  if (!window.YEX_PRODUCTION_CONFIG) {
    document.write('<script src="config.production.js?v=20261117-public-production-3"><\/script>');
  }
  const config = window.YEX_PRODUCTION_CONFIG;
  const valid = config?.enabled === true &&
    config?.supabaseUrl === 'https://vviyfrlvikokmcwhmhys.supabase.co' &&
    config?.supabaseProjectRef === 'vviyfrlvikokmcwhmhys' &&
    typeof config?.supabasePublishableKey === 'string' &&
    /^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(config.supabasePublishableKey) &&
    config?.financialOperationsEnabled === false;
  window.YEX_CONFIG = valid ? config : undefined;
  window.YEX_PUBLIC_STARTUP_BLOCKED = !valid;
  if (valid) return;
  document.querySelectorAll('#authScreen, #appScreen').forEach(element => {
    element.hidden = true;
  });
  const error = document.createElement('section');
  error.setAttribute('role', 'alert');
  error.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;padding:24px;background:#07110f;color:#e6fff5;font:16px system-ui;text-align:center';
  error.innerHTML = '<strong>Servizio non ancora attivo</strong><br><span style="display:block;margin-top:12px">L&#39;accesso sarà disponibile dopo la verifica della configurazione pubblica del progetto ufficiale. Le operazioni finanziarie restano disabilitate.</span>';
  document.body.appendChild(error);
})();
