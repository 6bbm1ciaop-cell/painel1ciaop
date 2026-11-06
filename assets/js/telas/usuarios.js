/* ==========================================================================
   TELA › USUÁRIOS E ACESSOS (#usuarios) — só o administrador
   Quem entra com a conta Google pela primeira vez fica como "pedido de acesso".
   Aqui o administrador libera (escolhendo o perfil), muda o perfil, recusa ou
   tira o acesso, e pode cadastrar um e-mail antes de a pessoa entrar.
   Perfis: Administrador (altera tudo) · CBU e Auxiliar (consultam tudo, mas não
   alteram empenhos semanais, escala nem observações).
   O cadastro fica no Apps Script (ações "usuarios" e "salvarUsuario").
   ========================================================================== */
(function () {
  const esc = (t) => UI.esc(t == null ? '' : String(t));
  const quando = (t) => (t ? `${t.slice(8, 10)}/${t.slice(5, 7)}/${t.slice(0, 4)}${t.length > 10 ? ' ' + t.slice(11, 16) : ''}` : '');
  let lista = null, perfis = { admin: 'Administrador', cbu: 'CBU', auxiliar: 'Auxiliar' }, erro = '';

  async function busca() {
    const j = await DADOS.pedirApi({ acao: 'usuarios' });
    lista = j.usuarios || []; if (j.perfis) perfis = j.perfis;
  }
  // grava e atualiza a lista (perfil: admin | cbu | auxiliar | bloqueado | remover)
  async function salva(view, email, perfil, nome, btn) {
    UI.ocupado(btn, perfil === 'remover' ? 'Apagando…' : 'Salvando…');
    try {
      const j = await DADOS.pedirApi({ acao: 'salvarUsuario', email, perfil, nome });
      lista = j.usuarios || lista;
      DS.pendentes = lista.filter((u) => u.perfil === 'pendente').length;
      if (window.APP && APP.pintaAdmin) APP.pintaAdmin();
      PAGES.usuarios.render(view);
      UI.toast({ remover: 'Cadastro apagado', bloqueado: 'Acesso recusado' }[perfil] || `${email}: ${perfis[perfil] || perfil}`);
    } catch (e) { PAGES.usuarios.render(view); UI.toast('Não foi possível salvar: ' + (e.message || e), 7000); }
  }

  const avatar = (u) => `<span class="us-av">${u.foto ? `<img src="${esc(u.foto)}" alt="" referrerpolicy="no-referrer">` : esc((u.nome || u.email || '?').trim()[0].toUpperCase())}</span>`;
  const quem = (u) => `<div class="us-quem">${avatar(u)}<div><b>${esc(u.nome || u.email)}</b>${u.nome ? `<small>${esc(u.email)}</small>` : ''}</div></div>`;
  const opcoes = (atual) => Object.entries(perfis).map(([k, v]) => `<option value="${k}" ${k === atual ? 'selected' : ''}>${esc(v)}</option>`).join('');

  PAGES.usuarios = {
    title: 'Usuários e acessos',
    render(view) {
      if (DS.fonte !== 'sheets' || DS.perfil !== 'admin') {
        view.innerHTML = `<div class="page">${UI.pageHead('Usuários e acessos', '')}${UI.panel('Somente o administrador', '<p>Esta tela é do administrador do painel (ligado às planilhas).</p>')}</div>`;
        return;
      }
      if (!lista && !erro) {
        view.innerHTML = `<div class="page">${UI.pageHead('Usuários e acessos', 'Carregando…')}</div>`;
        busca().then(() => { erro = ''; }).catch((e) => { erro = e.message || String(e); }).then(() => { if (location.hash === '#usuarios') PAGES.usuarios.render(view); });
        return;
      }
      if (erro) {
        const msg = erro; erro = '';
        view.innerHTML = `<div class="page">${UI.pageHead('Usuários e acessos', '')}${UI.panel('Não foi possível ler os usuários', `<p>${esc(msg)}</p><p class="muted" style="font-size:13.5px">Se aparecer "acao" ou "token", publique o Code.gs 4.9 no Apps Script.</p><div class="btn-row"><button class="btn" id="usTenta" type="button">${ICON('reset')}Tentar de novo</button></div>`)}</div>`;
        view.querySelector('#usTenta').onclick = () => { lista = null; PAGES.usuarios.render(view); };
        return;
      }
      const eu = String((window.AUTH && AUTH.email) || '').toLowerCase();
      const pend = lista.filter((u) => u.perfil === 'pendente').sort((a, b) => String(a.pedidoEm).localeCompare(String(b.pedidoEm)));
      const ativos = lista.filter((u) => perfis[u.perfil]).sort((a, b) => (b.principal - a.principal) || Object.keys(perfis).indexOf(a.perfil) - Object.keys(perfis).indexOf(b.perfil) || String(a.nome || a.email).localeCompare(String(b.nome || b.email), 'pt-BR'));
      const recus = lista.filter((u) => u.perfil === 'bloqueado');

      const blocoPend = pend.length ? pend.map((u) => `<li class="us-pend" data-email="${esc(u.email)}">${quem(u)}
          <span class="muted us-quando">pediu em ${esc(quando(u.pedidoEm))}</span>
          <span class="us-acoes"><label class="us-perfil"><span>Perfil</span><select class="input" data-perfil-novo>${opcoes('cbu')}</select></label>
            <button type="button" class="btn primary sm" data-liberar>${ICON('check')}<span>Liberar</span></button>
            <button type="button" class="btn ghost sm" data-recusar>Recusar</button></span></li>`).join('')
        : '<li class="muted us-vazio">Nenhum pedido esperando.</li>';

      const linhaAtivo = (u) => {
        const fixo = u.principal || u.email === eu;
        return `<tr data-email="${esc(u.email)}"><td>${quem(u)}</td>
          <td>${fixo ? `<b>${esc(perfis[u.perfil])}</b> <span class="muted">${u.principal ? '(principal)' : '(você)'}</span>` : `<select class="input us-sel" data-mudar aria-label="Perfil de ${esc(u.nome || u.email)}">${opcoes(u.perfil)}</select>`}</td>
          <td class="muted">${u.ultimoAcesso ? esc(quando(u.ultimoAcesso)) : '—'}</td>
          <td class="c">${fixo ? '' : `<button type="button" class="btn ghost sm" data-tirar title="Tira o acesso (a pessoa não consegue mais entrar)">Tirar acesso</button>`}</td></tr>`;
      };

      view.innerHTML = `<div class="page us">
        ${UI.pageHead('Usuários e acessos', 'Quem entra com a conta Google pela primeira vez aparece em "Pedidos de acesso". Administrador altera tudo; CBU e Auxiliar consultam tudo, mas não alteram empenhos semanais, escala nem observações.')}
        ${UI.panel('Pedidos de acesso', `<ul class="us-lista">${blocoPend}</ul>`, { count: pend.length ? String(pend.length) : '' })}
        ${UI.panel('Com acesso', `<div class="tbl-wrap"><table class="tbl us-tbl"><thead><tr><th>Usuário</th><th>Perfil</th><th>Último acesso</th><th></th></tr></thead><tbody>${ativos.map(linhaAtivo).join('')}</tbody></table></div>`, { count: String(ativos.length) })}
        ${UI.panel('Cadastrar um e-mail', `<form class="us-novo" id="usNovo">
            <label class="field"><span>E-mail Google</span><input class="input" type="email" id="usEmail" required placeholder="fulano@gmail.com" autocomplete="off"></label>
            <label class="field"><span>Nome (opcional)</span><input class="input" id="usNome" placeholder="Ex.: 2º Sgt Fulano" autocomplete="off"></label>
            <label class="field"><span>Perfil</span><select class="input" id="usPerfil">${opcoes('cbu')}</select></label>
            <button type="submit" class="btn primary" id="usAdd">${ICON('users')}<span>Cadastrar</span></button>
          </form>`, { note: 'A pessoa já entra liberada na primeira vez, sem precisar pedir.' })}
        ${recus.length ? UI.panel('Recusados', `<ul class="us-lista">${recus.map((u) => `<li class="us-pend" data-email="${esc(u.email)}">${quem(u)}<span class="us-acoes"><label class="us-perfil"><span>Perfil</span><select class="input" data-perfil-novo>${opcoes('cbu')}</select></label><button type="button" class="btn sm" data-liberar>Liberar</button><button type="button" class="btn ghost sm" data-apagar title="Apaga o cadastro: se a pessoa entrar de novo, vira um pedido novo">Apagar</button></span></li>`).join('')}</ul>`, { count: String(recus.length) }) : ''}
        <p class="muted" style="font-size:13px">Quem entra com usuário e senha (lista USUARIOS do Apps Script) não aparece aqui. O administrador principal é definido no Apps Script (CONFIG.EMAILS_ADMIN).</p>
      </div>`;

      const linha = (b) => b.closest('[data-email]');
      view.querySelectorAll('[data-liberar]').forEach((b) => (b.onclick = () => { const l = linha(b); salva(view, l.dataset.email, l.querySelector('[data-perfil-novo]').value, '', b); }));
      view.querySelectorAll('[data-recusar]').forEach((b) => (b.onclick = () => salva(view, linha(b).dataset.email, 'bloqueado', '', b)));
      view.querySelectorAll('[data-apagar]').forEach((b) => (b.onclick = () => salva(view, linha(b).dataset.email, 'remover', '', b)));
      view.querySelectorAll('[data-mudar]').forEach((s) => (s.onchange = () => salva(view, linha(s).dataset.email, s.value, '', s)));
      view.querySelectorAll('[data-tirar]').forEach((b) => (b.onclick = async () => {
        const l = linha(b);
        const ok = await UI.escolha('Tirar acesso', `<p>Tirar o acesso de <b>${esc(l.dataset.email)}</b>? A pessoa sai do painel no próximo clique e não consegue mais entrar (fica em "Recusados", onde dá para liberar de novo).</p>`, [['sim', 'Tirar acesso', true], ['', 'Cancelar']]);
        if (ok) salva(view, l.dataset.email, 'bloqueado', '', b);
      }));
      view.querySelector('#usNovo').onsubmit = (e) => {
        e.preventDefault();
        salva(view, view.querySelector('#usEmail').value.trim(), view.querySelector('#usPerfil').value, view.querySelector('#usNome').value.trim(), view.querySelector('#usAdd'));
      };
    },
  };
  // ao entrar de novo na tela, relê a lista (alguém pode ter pedido acesso)
  window.addEventListener('hashchange', () => { if (location.hash === '#usuarios') lista = null; });
})();
