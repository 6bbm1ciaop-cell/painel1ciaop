/* ==========================================================================
   TELA › CONTA E ACESSO (#login)
   Quem está conectado, origem dos dados e avisos de leitura das planilhas.
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  PAGES.login = {
    title: 'Conta e acesso',
    render(view) {
      // planilhas que o painel lê (Empenhos e Inundações saíram no 4.58: essas planilhas não existem)
      const fontes = ['efetivo', 'ferias', 'licencas', 'ddqod', 'horas', 'viaturas'];
      const nomes = { efetivo: 'Efetivo', ferias: 'Férias', licencas: 'Licenças', ddqod: 'DDQOD', horas: 'Horas excedentes', viaturas: 'Viaturas' };
      view.innerHTML = `<div class="page">
        ${UI.pageHead('Conta e acesso', `Painel v${UI.esc(C.versao)}`)}
        <div class="grid g-2">
          ${UI.panel('Conta', AUTH.token ? `<div class="mil-card" style="grid-template-columns:56px minmax(0,1fr);align-items:center"><div class="photo" style="aspect-ratio:1;border-radius:50%">${AUTH.foto ? `<img src="${UI.esc(AUTH.foto)}" alt="" referrerpolicy="no-referrer">` : UI.esc(AUTH.nome[0] || '?')}</div><div><div class="mil-name">${UI.esc(AUTH.nome)}</div><div class="mil-sub">${UI.esc(AUTH.email)}</div><div class="mil-sub">Perfil: <b>${UI.esc(DS.nomePerfil || AUTH.nomePerfil || 'Consulta')}</b>${DS.perfil && DS.perfil !== 'admin' ? ' · só consulta (não altera empenhos semanais, escala nem observações)' : ''}</div></div></div>
            <div class="btn-row" style="margin-top:14px"><button class="btn" id="btnSair" type="button">${ICON('logout')}Sair</button></div>`
            : `<p>${DS.fonte === 'mock' ? 'Modo demonstração: o login é usado quando o painel estiver ligado às planilhas.' : 'Login desativado em config.js (auth.habilitado = false).'}</p>`)}
          ${UI.panel('Origem dos dados', `<dl class="kv">
              <dt>Fonte</dt><dd>${DS.fonte === 'mock' ? 'Dados fictícios de demonstração' : DS.fonte === 'arquivo' ? 'Arquivos: ' + UI.esc(DS.arquivo.nome) : 'Planilhas Google (Apps Script)'}</dd>
              <dt>Última leitura</dt><dd>${UI.data(DS.atualizadoEm)} às ${UI.hora(DS.atualizadoEm)}</dd>
              ${fontes.map((f) => `<dt>${nomes[f]}</dt><dd>${DS.ligada(f) ? UI.chip('Ligada', 'ok dot') : UI.chip('Sem planilha', '')}</dd>`).join('')}
            </dl><div class="btn-row" style="margin-top:12px"><button class="btn" id="btnRele" type="button">${ICON('reset')}Ler as planilhas agora</button></div>`)}
        </div>
        ${DS.info.length ? UI.panel('Informações da última leitura', `<ul class="notes">${DS.info.map((a) => `<li>${UI.esc(a)}</li>`).join('')}</ul>`) : ''}
        ${DS.avisos.length ? UI.panel('Avisos da última leitura', `<ul class="notes">${DS.avisos.map((a) => `<li>${UI.esc(a)}</li>`).join('')}</ul>`, { note: 'Linhas sem nº BM reconhecido ou sem data ficam fora das telas. Corrija na planilha e leia de novo.' }) : ''}
      </div>`;
      const sair = view.querySelector('#btnSair');
      if (sair) sair.onclick = () => { AUTH.sair(); location.hash = 'inicio'; location.reload(); };
      view.querySelector('#btnRele').onclick = () => APP.recarregar();
    },
  };
})();
