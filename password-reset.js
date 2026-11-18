(() => {
  'use strict';

  const config = window.YEX_CONFIG;
  const supabaseClient = window.supabase && config
    ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: {
          detectSessionInUrl: false,
          autoRefreshToken: true,
          persistSession: true
        }
      })
    : null;
  const $ = id => document.getElementById(id);
  const form = $('resetForm');
  const description = $('resetDescription');
  const message = $('resetMessage');
  const login = $('loginLink');
  let recoveryAuthorized = false;
  let updateCompleted = false;

  const setMessage = (text, type = '') => {
    message.textContent = text;
    message.className = `recovery-message ${type}`;
  };

  const finish = (text, type) => {
    form.hidden = true;
    login.hidden = false;
    description.textContent = '';
    setMessage(text, type);
  };

  const passwordState = password => ({
    length: password.length >= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password)
  });

  const renderRules = () => {
    const state = passwordState($('newPassword').value);
    Object.entries(state).forEach(([key, valid]) => {
      document.querySelector(`[data-rule="${key}"]`)?.classList.toggle('valid', valid);
    });
    return Object.values(state).every(Boolean);
  };

  const clearCallbackFromUrl = () => {
    history.replaceState(null, document.title, location.pathname);
  };

  const readCallback = () => {
    const query = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const code = query.get('code');
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    const callbackType = hash.get('type') || query.get('type');

    if (code) return { kind: 'pkce', code };
    if (accessToken || refreshToken || callbackType) {
      return {
        kind: 'token',
        accessToken,
        refreshToken,
        callbackType
      };
    }
    return null;
  };

  const authorizeFromCallback = async callback => {
    if (!callback) {
      throw new Error('missing_recovery_callback');
    }

    clearCallbackFromUrl();

    if (callback.kind === 'pkce') {
      const { data, error } = await supabaseClient.auth.exchangeCodeForSession(callback.code);
      if (error || !data?.session) throw new Error('invalid_recovery_code');
      return data.session;
    }

    if (!['recovery', 'invite'].includes(callback.callbackType) || !callback.accessToken || !callback.refreshToken) {
      throw new Error('invalid_recovery_token');
    }

    const { data, error } = await supabaseClient.auth.setSession({
      access_token: callback.accessToken,
      refresh_token: callback.refreshToken
    });
    if (error || !data?.session) throw new Error('invalid_recovery_token');
    return data.session;
  };

  const authorizeRecovery = async () => {
    if (!supabaseClient) {
      finish('Il servizio non è disponibile. Riprova più tardi.', 'error');
      return;
    }

    try {
      const callback = readCallback();
      const session = await authorizeFromCallback(callback);
      if (!session?.user?.id) throw new Error('invalid_recovery_session');
      if (session.user.user_metadata?.ye_admin_provisioned !== true && callback.kind === 'token' && callback.callbackType === 'invite') throw new Error('invalid_invitation_account');
      recoveryAuthorized = true;
      form.hidden = false;
      description.textContent = 'Scegli una nuova password sicura per il tuo account YoungExchange.';
      setMessage('');
    } catch {
      finish('Il link di recupero non è valido, è scaduto o è già stato utilizzato. Richiedi un nuovo link.', 'error');
    }
  };

  const toggleButtons = document.querySelectorAll('[data-toggle]');
  toggleButtons.forEach(button => button.addEventListener('click', () => {
    const input = $(button.dataset.toggle);
    input.type = input.type === 'password' ? 'text' : 'password';
    button.setAttribute('aria-label', input.type === 'password' ? 'Mostra password' : 'Nascondi password');
  }));
  $('newPassword').addEventListener('input', renderRules);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!recoveryAuthorized || updateCompleted) {
      finish('Il link di recupero non è più disponibile. Richiedi un nuovo link.', 'error');
      return;
    }

    const password = $('newPassword').value;
    if (!renderRules()) {
      setMessage('La password non rispetta tutti i requisiti.', 'error');
      return;
    }
    if (password !== $('confirmPassword').value) {
      setMessage('Le password non coincidono.', 'error');
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setMessage('Aggiornamento in corso…');
    try {
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) throw error;
      updateCompleted = true;
      recoveryAuthorized = false;
      await supabaseClient.auth.signOut();
      finish('Password aggiornata correttamente. Ora puoi accedere con la nuova password.', 'success');
    } catch {
      setMessage('Non è stato possibile aggiornare la password. Il link potrebbe essere scaduto: richiedi un nuovo link.', 'error');
    } finally {
      button.disabled = false;
    }
  });

  authorizeRecovery();
})();
