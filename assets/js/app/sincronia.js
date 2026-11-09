/* ==========================================================================
   APP › SINCRONIA — várias pessoas usando o painel ao mesmo tempo
   Enquanto a tela de Empenhos semanais ou de Escala mensal está aberta, confere
   a cada minuto (e ao voltar para a aba do navegador) se outra pessoa gravou
   uma semana ou uma versão da escala. Se gravou:
     - semana: passa a mostrar a gravação nova (os lançamentos ainda não gravados
       deste navegador continuam por cima) e avisa;
     - escala: mostra a versão nova; se houver alterações não gravadas aqui, elas
       continuam e, ao gravar, são juntadas às da outra pessoa (editor.js).
   Não redesenha a tela no meio de uma digitação ou com uma janela aberta:
   espera a próxima conferência.
   Precisa do Code.gs 4.7 (ação "meta").
   ========================================================================== */
(function () {
  const INTERVALO = 60000;
  const TELAS = ['empenhos', 'escala-mensal'];

  /** Confere as versões gravadas no Apps Script e atualiza o que mudou.
      Devolve { semanas: [{ seg, antes, agora }], escalas: [{ mes, agora }] } ou null (sem Apps Script 4.7). */
  DS.sincroniza = async function () {
    if (this.fonte !== 'sheets' || !this.gravVersoes || !this.semServidor || !this.escServidor) return null;
    const j = await DADOS.pedirApi({ acao: 'meta' });
    const mud = { semanas: [], escalas: [] };
    const vS = j.semanas || {}, res = this.semResumo;
    // versão conhecida: a da semana carregada ou, nas antigas (Code.gs 5.4), a do resumo
    const conhecida = (seg) => (this.semServidor[seg] || (res && res[seg]) || null);
    for (const seg of new Set([...Object.keys(vS), ...Object.keys(this.semServidor), ...Object.keys(res || {})])) {
      const a = conhecida(seg), n = vS[seg];
      if ((a ? a.versao || 0 : 0) === (n ? n.versao : 0)) continue;
      if (!this.semServidor[seg] && res) {            // semana antiga não carregada: só atualiza o resumo
        if (n) res[seg] = n; else delete res[seg];
        continue;
      }
      const agora = n ? (await DADOS.pedirApi({ acao: 'semana', seg })).semana || null : null;
      this.trocaGravacao(seg, agora);
      mud.semanas.push({ seg, antes: a && a.dias ? a : null, agora });
    }
    const vE = j.escalas || {};
    new Set([...Object.keys(vE), ...Object.keys(this.escServidor)]).forEach((mes) => {
      const a = this.escServidor[mes], n = vE[mes];
      if ((a ? a.versao : 0) === (n ? n.versao : 0)) return;
      if (n) this.escServidor[mes] = n; else delete this.escServidor[mes];
      delete this._escCache[mes];
      mud.escalas.push({ mes, agora: n || null });
    });
    return mud;
  };

  let ultima = 0, rodando = false, redesenhar = null;
  const rota = () => (location.hash || '').slice(1);
  // alguém digitando, com o dedo na tela ou com uma janela aberta: não redesenha agora
  function ocupado() {
    const sh = document.getElementById('sheet');
    if (sh && !sh.hidden) return true;
    const a = document.activeElement, view = document.getElementById('view');
    return !!(a && view && view.contains(a) && a.matches('input, textarea, select, [contenteditable], td.pc, table.es-planilha'));
  }
  function redesenha() {
    const id = rota(), view = document.getElementById('view');
    if (!PAGES[id] || !view) return;
    const y = window.scrollY;
    const rolagens = [...view.querySelectorAll('[data-scroll], .st-scroll')].map((s) => [s.dataset.scroll || s.id, s.scrollLeft]);
    PAGES[id].render(view);
    rolagens.forEach(([k, x]) => { const s = view.querySelector(`[data-scroll="${k}"]`) || (k && document.getElementById(k)); if (s) s.scrollLeft = x; });
    window.scrollTo(0, y);
    UI.carregaFotos(view);
  }
  const intervalo = (seg) => { const a = DS.parse(seg), b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6); return `${UI.dm(a)} a ${UI.dm(b)}`; };

  async function confere(forcar) {
    const id = rota();
    if (rodando || !DS.db || document.hidden || !TELAS.includes(id)) return;
    if (!forcar && Date.now() - ultima < INTERVALO - 2000) return;
    // redesenho que ficou para depois (a pessoa estava digitando)
    if (redesenhar && redesenhar === id && !ocupado()) { redesenhar = null; redesenha(); }
    rodando = true; ultima = Date.now();
    let mud = null;
    try { mud = await DS.sincroniza(); } catch (e) {
      // sessão encerrada (tempo máximo, acesso retirado): volta para a entrada; sem rede: tenta na próxima
      if (['NAO_AUTENTICADO', 'TOKEN_INVALIDO', 'ACESSO_NEGADO', 'SESSAO_EXPIRADA'].includes(e.codigo) && APP.sessaoEncerrada) { rodando = false; APP.sessaoEncerrada(e.message); return; }
    } finally { rodando = false; }
    if (!mud || (!mud.semanas.length && !mud.escalas.length)) return;
    const agora = rota();
    if (agora === 'empenhos' && mud.semanas.length) {
      const s = mud.semanas[0];
      const diasDe = (seg) => Array.from({ length: 7 }, (_, i) => { const d = DS.parse(seg); d.setDate(d.getDate() + i); return DS.iso(d); });
      const conf = mud.semanas.reduce((n, x) => n + DS.conflitosSemana(x.antes, x.agora, diasDe(x.seg)).length, 0);
      const hm = s.agora && s.agora.gravadoEm ? ` às ${s.agora.gravadoEm.slice(11, 16)}` : '';
      UI.toast(`${mud.semanas.length === 1 ? `A semana de ${intervalo(s.seg)} foi ${s.agora ? `gravada${hm}` : 'desfeita'}` : `${mud.semanas.length} semanas foram gravadas`} por outra pessoa; a tela foi atualizada.${conf ? ` ${conf} lançamento(s) seu(s) ainda não gravado(s) mexe(m) nos mesmos militares: ao gravar, você escolhe qual fica.` : ''}`, 9000);
    } else if (agora === 'escala-mensal' && mud.escalas.length) {
      const e = mud.escalas[0];
      UI.toast(e.agora ? `Outra pessoa gravou a versão da escala de ${ESC.nomeMes(e.mes)}${e.agora.gravadoEm ? ` às ${e.agora.gravadoEm.slice(11, 16)}` : ''}. ${DS.escalaRascunho(e.mes) ? 'Suas alterações não gravadas continuam e serão juntadas às dela ao gravar.' : 'A tela foi atualizada.'}` : `Uma versão da escala de ${ESC.nomeMes(e.mes)} foi excluída por outra pessoa.`, 9000);
    } else return;
    if (ocupado()) redesenhar = agora; else redesenha();
  }

  setInterval(() => confere(false), 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) confere(Date.now() - ultima > 15000); });
  // ao abrir a tela, confere logo (os dados podem ter sido lidos há muito tempo)
  window.addEventListener('hashchange', () => { if (TELAS.includes(rota())) setTimeout(() => confere(true), 600); });
  APP.confereGravacoes = confere;
  // semana antiga buscada sob demanda (Calendário amplo, Início, Geral): redesenha a tela, se ninguém estiver mexendo
  DS.aoCarregarSemana = () => { if (ocupado()) redesenhar = rota(); else redesenha(); };
})();
