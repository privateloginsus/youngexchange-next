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
  let firstAccessFlow = false;

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

    if (code) return { kind: 'pkce', code, callbackType };
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
      // Confirm identity with Auth rather than trusting the callback's embedded user.
      const { data: verified, error: identityError } = await supabaseClient.auth.getUser();
      if (identityError || verified?.user?.id !== session.user.id) throw new Error('invalid_callback_identity');
      const isInvite = callback.callbackType === 'invite';
      firstAccessFlow = isInvite;
      if(isInvite){
        document.title='Certifica primo accesso | YoungExchange';
        $('resetTitle').textContent='Certifica il primo accesso';
        const submit=form.querySelector('button[type="submit"]');
        if(submit)submit.textContent='Certifica primo accesso e imposta password →';
        if(login)login.textContent='Vai a YoungExchange →';
      }
      if (isInvite) {
        if (verified.user.app_metadata?.ye_admin_provisioned !== true) throw new Error('invalid_invitation_account');
        // Do not activate a partially provisioned account.
        const [profile, wallets] = await Promise.all([
          supabaseClient.from('profiles').select('id').eq('id',session.user.id).maybeSingle(),
          supabaseClient.from('wallets').select('currency').eq('user_id',session.user.id).in('currency',['EUR','USDT','BTC','ETH'])
        ]);
        const available = new Set((wallets.data || []).map(w => w.currency));
        if (profile.error || !profile.data || wallets.error ||
            !['EUR','USDT','BTC','ETH'].every(currency => available.has(currency))) {
          throw new Error('incomplete_account');
        }
      }
      recoveryAuthorized = true;
      form.hidden = false;
      description.textContent = isInvite ? 'Il tuo invito è stato verificato. Imposta una password sicura per attivare l’accesso; la verifica del numero di telefono si completa dopo il login.' : 'Scegli una nuova password sicura per il tuo account YoungExchange.';
      setMessage('');
    } catch (error) {
      await supabaseClient.auth.signOut().catch(() => {});
      finish(error?.message === 'incomplete_account' ? 'Il conto è ancora in preparazione. Contatta l’assistenza per completare profilo e portafogli; non creare un secondo account.' : 'Il link di attivazione o recupero non è valido, è scaduto o è già stato utilizzato. Richiedi un nuovo link.', 'error');
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
      finish(firstAccessFlow ? 'Primo accesso certificato: password impostata. Ora entra in YoungExchange e completa la verifica del telefono.' : 'Password aggiornata correttamente. Ora puoi accedere con la nuova password.', 'success');
    } catch {
      setMessage('Non è stato possibile aggiornare la password. Il link potrebbe essere scaduto: richiedi un nuovo link.', 'error');
    } finally {
      button.disabled = false;
    }
  });

  authorizeRecovery();
})();
