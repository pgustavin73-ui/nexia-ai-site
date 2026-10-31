(() => {
  const dialog = document.querySelector('#authDialog');
  const form = document.querySelector('#authForm');
  const status = document.querySelector('#status');
  const title = document.querySelector('#authTitle');
  const submit = document.querySelector('#submitAuth');
  const switchMode = document.querySelector('#switchMode');
  const reset = document.querySelector('#resetPassword');
  const crmLink = document.querySelector('#crmLink');
  const logout = document.querySelector('#logout');
  let mode = 'login';
  const configured = typeof SUPABASE_PUBLISHABLE_KEY === 'string' && SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_');
  const client = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;
  function message(text, error = false) { status.textContent = text; status.style.color = error ? '#ffb4b4' : '#8de9c3'; }
  function setMode(next) {
    mode = next; title.textContent = next === 'login' ? 'Entrar' : 'Criar conta'; submit.textContent = title.textContent;
    switchMode.textContent = next === 'login' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar';
    reset.hidden = next !== 'login'; form.password.autocomplete = next === 'login' ? 'current-password' : 'new-password'; message('');
  }
  function open(next) { setMode(next); dialog.showModal(); }
  document.querySelector('#openAuth').addEventListener('click', () => open('login'));
  document.querySelector('#start').addEventListener('click', () => open('signup'));
  document.querySelector('#closeAuth').addEventListener('click', () => dialog.close());
  switchMode.addEventListener('click', () => setMode(mode === 'login' ? 'signup' : 'login'));
  async function updateSession() {
    if (!client) return;
    const { data } = await client.auth.getSession();
    const logged = !!data.session;
    crmLink.hidden = !logged; logout.hidden = !logged;
    document.querySelector('#openAuth').hidden = logged;
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!client) { message('Configure a chave pública em config.js antes de usar.', true); return; }
    submit.disabled = true; message('Aguarde...');
    const email = document.querySelector('#email').value.trim();
    const password = document.querySelector('#password').value;
    try {
      const result = mode === 'signup'
        ? await client.auth.signUp({ email, password, options: { emailRedirectTo: new URL('index.html', location.href).href } })
        : await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === 'signup' && !result.data.session) message('Confira seu e-mail e confirme o cadastro antes de entrar.');
      else { dialog.close(); await updateSession(); location.href = 'painel.html'; }
    } catch (err) { message(err.message || 'Não foi possível concluir. Tente novamente.', true); }
    finally { submit.disabled = false; }
  });
  reset.addEventListener('click', async () => {
    if (!client) { message('Configure a chave pública primeiro.', true); return; }
    const email = document.querySelector('#email').value.trim();
    if (!email) { message('Digite seu e-mail para receber o link.', true); return; }
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: new URL('redefinir-senha.html', location.href).href });
    message(error ? error.message : 'Se o e-mail estiver cadastrado, você receberá instruções.', !!error);
  });
  logout.addEventListener('click', async () => { if (client) { await client.auth.signOut(); await updateSession(); } });
  if (client) { client.auth.onAuthStateChange(() => { updateSession(); }); updateSession(); }
})();
