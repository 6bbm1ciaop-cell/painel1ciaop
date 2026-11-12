/* ==========================================================================
   LOGIN — conta Google e/ou usuário e senha (config.js → auth.modo)
   - Google: o botão "Fazer login com o Google" entrega uma credencial que o
     Apps Script confere. E-mail liberado pelo administrador → sessão; e-mail
     novo → o pedido de acesso fica esperando o administrador (tela "Usuários
     e acessos") e a pessoa vê o aviso de pedido enviado. No primeiro acesso a
     pessoa se identifica (Nº BM, posto/graduação e nome de guerra), que vão
     para a aba LOGINS PAINEL da planilha Respostas.
   - Usuário e senha: conferidos pelo Apps Script (a senha não fica no site).
   Nos dois casos o Apps Script devolve uma sessão (token) de até 6 h, renovada
   a cada uso, que vai junto em cada pedido. Guardada neste navegador (vale para
   todas as abas; "Sair" encerra em todas). Sem uso por 6 h, pede login de novo.
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  const KEY_S = 'painel-sessao';
  // este navegador entrou por último com uma conta de administrador: o Google pode entrar sozinho
  const KEY_AUTO = 'painel-auto-google';
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* */ } };
  const modo = () => C.auth.modo || 'senha';

  let gisPromise = null;
  // carrega o script de login do Google
  function carregaGis() {
    if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
    if (!gisPromise) gisPromise = new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = ok; s.onerror = () => { gisPromise = null; falha(new Error('Não foi possível carregar o login do Google. Verifique a conexão.')); };
      document.head.appendChild(s);
    });
    return gisPromise;
  }

  // pedido ao Apps Script antes de haver sessão (login)
  async function pede(corpo) {
    if (!C.appsScriptUrl) throw new Error('Informe a URL do Apps Script em config.js (appsScriptUrl).');
    let r, j;
    try {
      r = await fetch(C.appsScriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(corpo) });
    } catch (e) {
      // o navegador bloqueia a resposta quando o Google devolve uma página de erro (sem dados) em vez do JSON do painel
      throw Object.assign(new Error('O Apps Script não respondeu com os dados do painel. Normalmente é a implantação sem o código atual ou sem "Qualquer pessoa". Clique em "Testar conexão" e me mande o que aparecer.'), { diag: true });
    }
    const t = await r.text();
    try { j = JSON.parse(t); } catch (e) { throw Object.assign(new Error('O Apps Script respondeu, mas não com os dados do painel (' + t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) + '). Clique em "Testar conexão".'), { diag: true }); }
    return j;
  }

  // meses da escala que já vêm junto com os dados do login (Code.gs 5.10)
  const mesesEsc = () => { try { return window.DS && DS.mesesEscalaInicio ? DS.mesesEscalaInicio() : []; } catch (e) { return []; } };

  const AUTH = {
    token: null, email: '', nome: '', foto: '', perfil: '', nomePerfil: '', expira: 0, seg: 21600,
    inicio: 0, limiteHoras: 0,   // hora do login e tempo máximo da sessão (0 = sem limite: administrador)
    motivo: '',                  // por que a sessão guardada não valeu (mostrado na tela de entrada)
    /** mostra o formulário de usuário e senha? */
    porSenha: () => modo() !== 'google',
    /** mostra o botão do Google? (precisa do auth.clientId) */
    porGoogle: () => modo() !== 'senha' && !!C.auth.clientId,
    exigido() { return C.fonteDados === 'sheets' && C.auth.habilitado; },

    // recupera a sessão guardada nesta aba do navegador
    restaurar() {
      try {
        const s = JSON.parse(localStorage.getItem(KEY_S) || sessionStorage.getItem(KEY_S) || 'null');
        if (s && s.token && s.limiteHoras && s.inicio && Date.now() > s.inicio + s.limiteHoras * 3600e3) {
          this.motivo = `A sessão passou de ${s.limiteHoras} horas. Entre novamente.`;
          this.sair(); return false;
        }
        if (s && s.token && s.expira > Date.now() + 60000) { this.guarda(s, false); return true; }
      } catch (e) { /* sem armazenamento */ }
      return false;
    },
    // guarda a sessão devolvida pelo Apps Script
    // dados do painel que vieram junto com o login (Code.gs 5.2): usados uma vez, na abertura
    pacote: null,
    tomaPacote() { const p = this.pacote; this.pacote = null; return p && p.ok ? p : null; },
    guarda(j, gravar = true) {
      if (gravar) this.pacote = j.pacote || null;
      Object.assign(this, { token: j.token, email: j.usuario || j.email || '', nome: j.nome || j.usuario || '', foto: j.foto || '', perfil: j.perfil || '', nomePerfil: j.nomePerfil || '', expira: gravar ? Date.now() + (j.sessaoSeg || 21600) * 1000 - 60000 : j.expira, seg: j.sessaoSeg || j.seg || 21600, inicio: gravar ? Date.now() : (j.inicio || Date.now()), limiteHoras: +j.limiteHoras || 0 });   // início pelo relógio deste computador (o Apps Script confere pelo dele)
      if (!gravar) return;
      this.motivo = '';
      // login automático do Google só para administrador (CBU e Auxiliar sempre clicam no botão)
      if (this.email.includes('@')) lsSet(KEY_AUTO, this.perfil === 'admin' ? '1' : null);
      try { localStorage.setItem(KEY_S, JSON.stringify({ token: this.token, usuario: this.email, nome: this.nome, foto: this.foto, perfil: this.perfil, nomePerfil: this.nomePerfil, expira: this.expira, seg: this.seg, inicio: this.inicio, limiteHoras: this.limiteHoras })); } catch (e) { /* */ }
    },
    // o Apps Script renova a sessão a cada pedido: acompanha aqui
    renova() {
      if (!this.token) return;
      this.expira = Date.now() + this.seg * 1000 - 60000;
      try { const s = JSON.parse(localStorage.getItem(KEY_S) || 'null'); if (s && s.token === this.token) { s.expira = this.expira; localStorage.setItem(KEY_S, JSON.stringify(s)); } } catch (e) { /* */ }
    },

    /* login por usuário e senha */
    async entrar(usuario, senhaTxt) {
      const j = await pede({ acao: 'login', usuario, senha: senhaTxt, comDados: true, compacto: true, escalasMeses: mesesEsc() });
      if (!j.ok && j.erro === 'NAO_AUTENTICADO') throw Object.assign(new Error('A implantação do Apps Script está com um código antigo (sem o login por senha). Publique a versão mais nova do Code.gs.'), { diag: true });
      if (!j.ok) throw new Error(j.erro === 'LOGIN_INVALIDO' ? 'Usuário ou senha incorretos.' : j.erro === 'LOGIN_DESATIVADO' ? 'O login por usuário e senha está desligado no Apps Script (MODO_LOGIN). Entre com a conta Google.' : String(j.erro));
      this.guarda(j);
    },

    /* login Google: o Apps Script confere a credencial e o cadastro (aba LOGINS PAINEL) */
    async entrarGoogle(credencial) {
      const j = await pede({ acao: 'loginGoogle', credencial, site: location.origin + location.pathname, comDados: true, compacto: true, escalasMeses: mesesEsc() });
      this.resposta(j, credencial);
    },
    /* primeiro acesso: manda a identificação (Nº BM, posto/graduação, nome de guerra) junto com o pedido */
    async pedirAcesso(credencial, d) {
      const j = await pede({ acao: 'pedirAcesso', credencial, bm: d.bm, posto: d.posto, guerra: d.guerra, site: location.origin + location.pathname, comDados: true, compacto: true, escalasMeses: mesesEsc() });
      if (!j.ok && /acao/i.test(String(j.erro))) throw Object.assign(new Error('O Apps Script publicado ainda não tem o pedido de acesso com identificação. Publique o Code.gs 5.6.'), { diag: true });
      if (!j.ok && j.erro === 'TOKEN_INVALIDO') throw new Error('A confirmação do Google expirou. Clique em "Usar outra conta" e entre de novo.');
      this.resposta(j, credencial);
    },
    // resposta do login Google: sessão, ou um erro com o que a tela precisa (cadastro, pendente)
    resposta(j, credencial) {
      if (j.ok) { this.guarda(j); return; }
      const cod = String(j.erro || '').split(':')[0];
      if (cod === 'CADASTRO') throw Object.assign(new Error('Identifique-se para pedir acesso'), { cadastro: true, credencial, email: j.email, nome: j.nome, sugestao: j.sugestao || {}, postos: j.postos || [] });
      if (cod === 'PENDENTE') throw Object.assign(new Error('Pedido de acesso enviado'), { pendente: true, email: j.email, nome: j.nome, admins: j.admins || [], dados: j.dados || null });
      if (cod === 'ACESSO_NEGADO') throw new Error(`O acesso do e-mail ${String(j.erro).split(':')[1] || ''} ao painel não foi liberado pelo administrador.`);
      if (cod === 'TOKEN_INVALIDO') throw new Error('O Google não confirmou a conta. Tente de novo.');
      if (cod === 'LOGIN_DESATIVADO') throw new Error('O login com a conta Google está desligado no Apps Script (MODO_LOGIN).');
      if (cod === 'NAO_AUTENTICADO' || /acao/i.test(String(j.erro))) throw Object.assign(new Error('O Apps Script publicado ainda não tem o login Google. Publique o Code.gs mais novo.'), { diag: true });
      throw new Error(String(j.erro));
    },

    // encerra a sessão (neste navegador e no Apps Script)
    sair() {
      if (this.token && C.appsScriptUrl) {
        try { fetch(C.appsScriptUrl, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ acao: 'sair', token: this.token }) }).catch(() => {}); } catch (e) { /* */ }
      }
      this.token = null; this.inicio = 0; this.limiteHoras = 0; this.email = this.nome = this.foto = this.perfil = this.nomePerfil = ''; this.expira = 0;
      try { localStorage.removeItem(KEY_S); sessionStorage.removeItem(KEY_S); sessionStorage.removeItem('painel-token'); localStorage.removeItem('painel-dados-guardados'); } catch (e) { /* */ }   // dados guardados saem junto
      if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
    },
    valido() { return !!this.token && this.expira > Date.now() + 60000; },

    /* desenha o botão "Fazer login com o Google" dentro de el.
       aoEntrar() quando liberado; aoErro(e) quando não (e.cadastro = primeiro acesso, falta a identificação;
       e.pendente = pedido aguardando o administrador) */
    async botao(el, aoEntrar, aoErro) {
      if (!C.auth.clientId) throw new Error('Preencha auth.clientId em config.js.');
      await carregaGis();
      google.accounts.id.initialize({
        client_id: C.auth.clientId,
        callback: async (r) => {
          el.classList.add('entrando');
          try { await this.entrarGoogle(r.credential); aoEntrar(); }
          catch (e) { el.classList.remove('entrando'); aoErro(e); }
        },
        auto_select: lsGet(KEY_AUTO) === '1',   // entra sozinho só quem entrou por último como administrador
        cancel_on_tap_outside: false,
        use_fedcm_for_prompt: true,
      });
      const escuro = (document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')) === 'dark';
      google.accounts.id.renderButton(el, { theme: escuro ? 'filled_black' : 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', locale: 'pt-BR', width: 280 });
      if (lsGet(KEY_AUTO) === '1') google.accounts.id.prompt();   // CBU e Auxiliar: só pelo botão
    },
  };

  // saiu em outra aba: esta volta para a tela de entrada
  try {
    addEventListener('storage', (e) => { if (e.key === KEY_S && !e.newValue && AUTH.token) { AUTH.token = null; location.reload(); } });
  } catch (e) { /* */ }

  window.AUTH = AUTH;
})();
