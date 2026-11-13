/* ==========================================================================
   INTERFACE › QUADRO DE OBSERVAÇÕES editável (DDQOD, Viaturas, Férias por data)
   Com o Apps Script 4.2+: guardado nele, vale para todos e só o administrador
   vê o botão Editar. Antes disso: aba EMPENHOS_REGISTROS ou este navegador
   (DS.obsTela / DS.salvarObsTela em dados/registros.js).
   Uso: html += UI.obsQuadro('tela', { titulo, placeholder }); depois UI.ligaObs(view, 'tela').
   ========================================================================== */
(function () {
  const { esc } = UI;
  Object.assign(UI, {
    _obs: {},
    // HTML do quadro (modo leitura ou edição)
    obsQuadro(tela, opts) {
      const ob = (UI._obs[tela] = UI._obs[tela] || { editando: false, rascunho: null, salvando: false, opts: {} });
      if (opts) ob.opts = opts;
      const { titulo = 'Observações', placeholder = '' } = ob.opts;
      const reg = DS.obsTela(tela), txt = reg ? reg.obs : '';
      const pode = DS.podeEditarObs();   // com o Apps Script 4.2+, só o administrador altera
      if (!pode) ob.editando = false;
      const corpo = ob.editando
        ? `<textarea class="obs-txt" rows="5" maxlength="2000" aria-label="${esc(titulo)}" placeholder="${esc(placeholder)}">${esc(ob.rascunho ?? txt)}</textarea>
          <div class="btn-row"><button type="button" class="btn primary obs-salvar" ${ob.salvando ? 'disabled' : ''}>${ob.salvando ? 'Salvando…' : 'Salvar'}</button><button type="button" class="btn ghost obs-cancelar">Cancelar</button></div>`
        : txt ? `<div class="obs-view">${esc(txt)}</div>` : `<p class="muted" style="font-size:13.5px">Nenhuma observação.${pode ? ' Clique em Incluir para escrever.' : ''}</p>`;
      const quando = reg && reg.status ? reg.status.slice(8, 10) + '/' + reg.status.slice(5, 7) + '/' + reg.status.slice(0, 4) + reg.status.slice(10) : '';
      return `<section class="panel obs-q" data-obs-tela="${esc(tela)}"><div class="panel-h"><h3>${esc(titulo)}</h3>${ob.editando || !pode ? '' : `<button type="button" class="btn ghost obs-editar">${txt ? 'Editar' : '+ Incluir'}</button>`}</div>
        <div class="panel-b">${corpo}</div>${quando && !ob.editando ? `<div class="panel-note">Atualizado em ${esc(quando)}${DS.obsCompartilhadas() ? ' · vale para todos os usuários' : ''}</div>` : ''}</section>`;
    },
    // liga os botões Incluir/Editar/Salvar/Cancelar do quadro
    ligaObs(root, tela) {
      const ob = UI._obs[tela], box = root.querySelector(`[data-obs-tela="${tela}"]`);
      if (!ob || !box) return;
      const redesenha = () => {
        const b = root.querySelector(`[data-obs-tela="${tela}"]`);
        if (!b) return;
        b.outerHTML = UI.obsQuadro(tela);
        UI.ligaObs(root, tela);
      };
      const q = (c) => box.querySelector(c);
      if (q('.obs-editar')) q('.obs-editar').onclick = (e) => { e.stopPropagation(); ob.editando = true; ob.rascunho = null; redesenha(); };
      const ta = q('.obs-txt');
      if (ta) {
        ta.oninput = () => { ob.rascunho = ta.value; };
        if (!ob.salvando) { ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length); }
      }
      if (q('.obs-cancelar')) q('.obs-cancelar').onclick = (e) => {
        e.stopPropagation();
        Object.assign(ob, { editando: false, rascunho: null });
        redesenha();
      };
      if (q('.obs-salvar')) q('.obs-salvar').onclick = async (e) => {
        e.stopPropagation(); ob.salvando = true; ob.rascunho = ta.value; redesenha();
        try { await DS.salvarObsTela(tela, ob.rascunho); Object.assign(ob, { editando: false, rascunho: null }); UI.toast('Observações salvas'); }
        catch (err) { UI.toast('Não foi possível salvar: ' + (err.message || err)); }
        ob.salvando = false; redesenha();
      };
    },
  });
})();
