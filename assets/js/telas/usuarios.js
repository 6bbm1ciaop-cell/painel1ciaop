/* ==========================================================================
   TELA › USUÁRIOS E ACESSOS (#usuarios) — só o administrador
   Quem entra com a conta Google pela primeira vez fica como "pedido de acesso".
   Aqui o administrador libera (escolhendo o perfil), muda o perfil, recusa ou
   tira o acesso, e pode cadastrar um e-mail antes de a pessoa entrar.
   Perfis: Administrador (altera tudo) · CBU e Auxiliar (consultam tudo, mas não
   alteram empenhos semanais, escala nem observações).
   O cadastro fica na planilha Respostas, aba LOGINS PAINEL (Code.gs 5.6, ações
   "usuarios" e "salvarUsuario"): e-mail, Nº BM, posto/graduação, nome de guerra e
   perfil. O que o administrador digitar direto na aba também vale (botão Atualizar).
   ========================================================================== */
(function () {
  const esc = (t) => UI.esc(t == null ? '' : String(t));
  const quando = (t) => (t ? `${t.slice(8, 10)}/${t.slice(5, 7)}/${t.slice(0, 4)}${t.length > 10 ? ' ' + t.slice(11, 16) : ''}` : '');
  let lista = null, perfis = { admin: 'Administrador', cbu: 'CBU', auxiliar: 'Auxiliar' }, erro = '', lidaEm = 0, buscando = false;
  let postos = ['Cel', 'Ten Cel', 'Maj', 'Cap', '1º Ten', '2º Ten', 'Asp', 'Sub Ten', '1º Sgt', '2º Sgt', '3º Sgt', 'Cb', 'Sd'];
  // guarda a lista (aqui e no DS, que já a recebe junto com os dados quando quem entra é administrador)
  function guarda(l, p, ps) {
    lista = l || []; if (p) perfis = p; if (ps && ps.length) postos = ps; lidaEm = Date.now();
    DS.usuarios = lista; DS.pendentes = lista.filter((u) => u.perfil === 'pendente').length;
    if (window.APP && APP.pintaAdmin) APP.pintaAdmin();
  }
  // atualizar = relê a aba LOGINS PAINEL agora (pega o que foi digitado direto na planilha)
  async function busca(atualizar) {
    const j = await DADOS.pedirApi({ acao: 'usuarios', atualizar: !!atualizar });
    guarda(j.usuarios, j.perfis, j.postos);
  }
  /* a tela abre na hora com a lista que já está na memória e confere no Apps Script em segundo
     plano (alguém pode ter pedido acesso); só redesenha se algo mudou e ninguém estiver mexendo */
  function confereFundo(view) {
    if (buscando || Date.now() - lidaEm < 15000) return;
    buscando = true;
    const antes = JSON.stringify(lista);
    busca().then(() => {
      const ocupado = (document.getElementById('sheet') && !document.getElementById('sheet').hidden) || (document.activeElement && view.contains(document.activeElement) && document.activeElement.matches('input, select'));
      if (location.hash === '#usuarios' && JSON.stringify(lista) !== antes && !ocupado) PAGES.usuarios.render(view, true);
    }).catch(() => { /* sem rede agora: fica a lista que já está na tela */ }).then(() => { buscando = false; });
  }
  // grava e atualiza a lista (perfil: admin | cbu | auxiliar | bloqueado | remover | '' = mantém;
  // dados = { bm, posto, guerra } para corrigir a identificação)
  async function salva(view, email, perfil, dados, btn) {
    const volta = UI.ocupado(btn, perfil === 'remover' ? 'Apagando…' : 'Salvando…');
    try {
      const j = await DADOS.pedirApi({ acao: 'salvarUsuario', email, perfil, dados: dados || undefined });
      guarda(j.usuarios || lista, j.perfis, j.postos);
      PAGES.usuarios.render(view);
      UI.toast({ remover: 'Cadastro apagado', bloqueado: 'Acesso recusado', '': 'Identificação salva' }[perfil] || `${email}: ${perfis[perfil] || perfil}`);
      return true;
    } catch (e) { volta(); PAGES.usuarios.render(view); UI.toast('Não foi possível salvar: ' + (e.message || e), 7000); return false; }
  }

  // nome para mostrar: posto + nome de guerra (o que a pessoa informou); senão, o nome da conta Google
  const ident = (u) => [u.posto, u.guerra].filter(Boolean).join(' ');
  // confere o Nº BM com o efetivo (planilha Respostas)
  function noEfetivo(u) {
    const bm = String(u.bm || '').replace(/\D/g, '');
    if (!bm || !DS.db || !DS.db.militares) return null;
    return DS.db.militares.find((m) => String(m.nBM || '').replace(/\D/g, '') === bm) || false;
  }
  function confere(u) {
    if (u.principal && !u.bm) return '';
    if (!u.bm) return '<span class="chip warn us-chk" title="Sem Nº BM: clique no lápis para completar">sem Nº BM</span>';
    const m = noEfetivo(u);
    if (m === null) return '';
    if (!m) return '<span class="chip warn us-chk" title="Este Nº BM não aparece no efetivo (planilha Respostas)">BM fora do efetivo</span>';
    const igual = m.posto === u.posto && String(m.nomeGuerra || '').toUpperCase().includes(String(u.guerra || '').toUpperCase().split(' ')[0]);
    return igual ? `<span class="chip ok us-chk" title="Confere com o efetivo: ${esc(m.posto + ' ' + m.nomeGuerra)}">confere com o efetivo</span>`
      : `<span class="chip warn us-chk" title="No efetivo este Nº BM é ${esc(m.posto + ' ' + m.nomeGuerra)}">no efetivo: ${esc(m.posto + ' ' + m.nomeGuerra)}</span>`;
  }
  const avatar = (u) => `<span class="us-av">${u.foto ? `<img src="${esc(u.foto)}" alt="" referrerpolicy="no-referrer">` : esc((ident(u) ? (u.guerra || u.posto) : (u.nome || u.email || '?')).trim()[0].toUpperCase())}</span>`;
  const quem = (u) => `<div class="us-quem">${avatar(u)}<div><b>${esc(ident(u) || u.nome || u.email)}${u.bm ? ` <span class="us-bm">Nº BM ${esc(u.bm)}</span>` : ''}</b>
      <small>${esc(u.email)}${ident(u) && u.nome && u.nome !== u.email ? ` · Google: ${esc(u.nome)}` : ''}</small>${confere(u) ? `<span>${confere(u)}</span>` : ''}</div>
      <button type="button" class="icon-btn us-edit" data-editar title="Corrigir Nº BM, posto/graduação e nome de guerra" aria-label="Corrigir identificação de ${esc(u.email)}">${ICON('edit')}</button></div>`;
  const opPostos = (atual) => `<option value="">—</option>${postos.map((p) => `<option ${p === atual ? 'selected' : ''}>${esc(p)}</option>`).join('')}`;
  const camposIdent = (u, pre) => `
      <label class="field"><span>Nº BM</span><input class="input" id="${pre}BM" maxlength="15" inputmode="numeric" placeholder="123.456-7" value="${esc(u.bm || '')}" autocomplete="off"></label>
      <label class="field"><span>Posto / graduação</span><select class="input" id="${pre}Posto">${opPostos(u.posto || '')}</select></label>
      <label class="field"><span>Nome de guerra</span><input class="input" id="${pre}Guerra" maxlength="40" placeholder="SILVA" value="${esc(u.guerra || '')}" autocomplete="off" style="text-transform:uppercase"></label>`;
  const lerIdent = (raiz, pre) => ({ bm: raiz.querySelector(`#${pre}BM`).value.trim(), posto: raiz.querySelector(`#${pre}Posto`).value, guerra: raiz.querySelector(`#${pre}Guerra`).value.trim().toUpperCase() });
  // janela para corrigir a identificação
  function editar(view, u) {
    UI.sheet('Identificação', `<form class="us-ed" id="usEd"><p class="muted" style="margin:0">${esc(u.email)}</p>${camposIdent(u, 'ed')}
        <div class="btn-row"><button type="submit" class="btn primary" id="edOk">Salvar</button><button type="button" class="btn ghost" data-close>Cancelar</button></div></form>`);
    const f = document.getElementById('usEd');
    f.querySelector('#edBM').focus();
    f.onsubmit = async (e) => { e.preventDefault(); if (await salva(view, u.email, '', lerIdent(f, 'ed'), f.querySelector('#edOk'))) UI.fechaSheet(); };
  }
  const opcoes = (atual) => Object.entries(perfis).map(([k, v]) => `<option value="${k}" ${k === atual ? 'selected' : ''}>${esc(v)}</option>`).join('');

  PAGES.usuarios = {
    title: 'Usuários e acessos',
    render(view, deFundo) {
      if (DS.fonte !== 'sheets' || DS.perfil !== 'admin') {
        view.innerHTML = `<div class="page">${UI.pageHead('Usuários e acessos', '')}${UI.panel('Somente o administrador', '<p>Esta tela é do administrador do painel (ligado às planilhas).</p>')}</div>`;
        return;
      }
      if (!lista && DS.usuarios) { lista = DS.usuarios; if (DS.perfisNomes) perfis = DS.perfisNomes; lidaEm = DS.atualizadoEm ? +DS.atualizadoEm : 0; }
      if (lista && !erro && !deFundo) confereFundo(view);
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
      const pend = lista.filter((u) => u.perfil === 'pendente' && !u.principal).sort((a, b) => String(a.pedidoEm).localeCompare(String(b.pedidoEm)));
      const ativos = lista.filter((u) => perfis[u.perfil]).sort((a, b) => (b.principal - a.principal) || Object.keys(perfis).indexOf(a.perfil) - Object.keys(perfis).indexOf(b.perfil) || String(ident(a) || a.nome || a.email).localeCompare(String(ident(b) || b.nome || b.email), 'pt-BR'));
      const recus = lista.filter((u) => u.perfil === 'bloqueado');

      const blocoPend = pend.length ? pend.map((u) => `<li class="us-pend" data-email="${esc(u.email)}">${quem(u)}
          <span class="muted us-quando">${u.pedidoEm ? `pediu em ${esc(quando(u.pedidoEm))}` : 'cadastrado na planilha'}</span>
          <span class="us-acoes"><label class="us-perfil"><span>Perfil</span><select class="input" data-perfil-novo>${opcoes('cbu')}</select></label>
            <button type="button" class="btn primary sm" data-liberar>${ICON('check')}<span>Liberar</span></button>
            <button type="button" class="btn ghost sm" data-recusar>Recusar</button></span></li>`).join('')
        : '<li class="muted us-vazio">Nenhum pedido esperando.</li>';

      const linhaAtivo = (u) => {
        const fixo = u.principal || u.email === eu;
        return `<tr data-email="${esc(u.email)}"><td>${quem(u)}</td>
          <td>${fixo ? `<b>${esc(perfis[u.perfil])}</b> <span class="muted">${u.principal ? '(principal)' : '(você)'}</span>` : `<select class="input us-sel" data-mudar aria-label="Perfil de ${esc(ident(u) || u.nome || u.email)}">${opcoes(u.perfil)}</select>`}</td>
          <td class="muted">${u.ultimoAcesso ? esc(quando(u.ultimoAcesso)) : '—'}</td>
          <td class="c">${fixo ? '' : `<button type="button" class="btn ghost sm" data-tirar title="Tira o acesso (a pessoa não consegue mais entrar)">Tirar acesso</button>`}</td></tr>`;
      };

      view.innerHTML = `<div class="page us">
        ${UI.pageHead('Usuários e acessos', 'Quem entra com a conta Google pela primeira vez informa Nº BM, posto/graduação e nome de guerra e aparece em "Pedidos de acesso". Administrador altera tudo; CBU e Auxiliar consultam tudo, mas não alteram empenhos semanais, escala nem observações.', `<button class="btn" id="usAtualiza" type="button" title="Lê a aba LOGINS PAINEL agora (pega o que foi digitado direto na planilha)">${ICON('reset')}<span>Atualizar</span></button>`)}
        ${UI.panel('Pedidos de acesso', `<ul class="us-lista">${blocoPend}</ul>`, { count: pend.length ? String(pend.length) : '' })}
        ${UI.panel('Com acesso', `<div class="tbl-wrap"><table class="tbl us-tbl"><thead><tr><th>Usuário</th><th>Perfil</th><th>Último acesso</th><th></th></tr></thead><tbody>${ativos.map(linhaAtivo).join('')}</tbody></table></div>`, { count: String(ativos.length) })}
        ${UI.panel('Cadastrar um e-mail', `<form class="us-novo" id="usNovo">
            <label class="field"><span>E-mail Google</span><input class="input" type="email" id="usEmail" required placeholder="fulano@gmail.com" autocomplete="off"></label>
            ${camposIdent({}, 'us')}
            <label class="field"><span>Perfil</span><select class="input" id="usPerfil">${opcoes('cbu')}</select></label>
            <button type="submit" class="btn primary" id="usAdd">${ICON('users')}<span>Cadastrar</span></button>
          </form>`, { note: 'A pessoa já entra liberada na primeira vez, sem precisar pedir. Também dá para cadastrar direto na planilha Respostas, aba LOGINS PAINEL.' })}
        ${recus.length ? UI.panel('Recusados', `<ul class="us-lista">${recus.map((u) => `<li class="us-pend" data-email="${esc(u.email)}">${quem(u)}<span class="us-acoes"><label class="us-perfil"><span>Perfil</span><select class="input" data-perfil-novo>${opcoes('cbu')}</select></label><button type="button" class="btn sm" data-liberar>Liberar</button><button type="button" class="btn ghost sm" data-apagar title="Apaga o cadastro: se a pessoa entrar de novo, vira um pedido novo">Apagar</button></span></li>`).join('')}</ul>`, { count: String(recus.length) }) : ''}
        <p class="muted" style="font-size:13px">O cadastro fica na planilha Respostas, aba LOGINS PAINEL: o que for digitado lá vale em até 10 minutos, ou na hora com o botão Atualizar. Na coluna PERFIL use Administrador, CBU, Auxiliar, Pendente ou Recusado. O administrador principal é definido no Apps Script (CONFIG.EMAILS_ADMIN).</p>
      </div>`;

      const linha = (b) => b.closest('[data-email]');
      view.querySelectorAll('[data-liberar]').forEach((b) => (b.onclick = () => { const l = linha(b); salva(view, l.dataset.email, l.querySelector('[data-perfil-novo]').value, null, b); }));
      view.querySelectorAll('[data-recusar]').forEach((b) => (b.onclick = () => salva(view, linha(b).dataset.email, 'bloqueado', null, b)));
      view.querySelectorAll('[data-apagar]').forEach((b) => (b.onclick = () => salva(view, linha(b).dataset.email, 'remover', null, b)));
      view.querySelectorAll('[data-mudar]').forEach((s) => (s.onchange = () => salva(view, linha(s).dataset.email, s.value, null, s)));
      view.querySelectorAll('[data-editar]').forEach((b) => (b.onclick = () => { const u = lista.find((x) => x.email === linha(b).dataset.email); if (u) editar(view, u); }));
      view.querySelector('#usAtualiza').onclick = async (e) => {
        const volta = UI.ocupado(e.currentTarget, 'Lendo…');
        try { await busca(true); PAGES.usuarios.render(view); UI.toast('Lista lida da planilha agora'); }
        catch (x) { volta(); UI.toast('Não foi possível ler: ' + (x.message || x), 7000); }
      };
      view.querySelectorAll('[data-tirar]').forEach((b) => (b.onclick = async () => {
        const l = linha(b);
        const ok = await UI.escolha('Tirar acesso', `<p>Tirar o acesso de <b>${esc(l.dataset.email)}</b>? A pessoa sai do painel no próximo clique e não consegue mais entrar (fica em "Recusados", onde dá para liberar de novo).</p>`, [['sim', 'Tirar acesso', true], ['', 'Cancelar']]);
        if (ok) salva(view, l.dataset.email, 'bloqueado', null, b);
      }));
      view.querySelector('#usNovo').onsubmit = (e) => {
        e.preventDefault();
        salva(view, view.querySelector('#usEmail').value.trim(), view.querySelector('#usPerfil').value, lerIdent(view, 'us'), view.querySelector('#usAdd'));
      };
    },
  };
  // ao entrar de novo, a tela abre com a lista guardada e confere em segundo plano (confereFundo)
})();
