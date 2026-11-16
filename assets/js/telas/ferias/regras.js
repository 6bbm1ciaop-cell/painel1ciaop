/* ==========================================================================
   FÉRIAS › REGRAS DE FÉRIAS (quadro nas telas Férias por data e Férias por período)
   Máximo de militares de férias no mesmo dia:
     - total dos quadros da sede (o antigo "limite de 11 BM");
     - PEMAD + PBRESC (as 4 alas do PEMAD e o PBRESC; PEMAD ADM fora);
     - cada ala do PEMAD; cada pelotão da sede (1º ao 4º Pel); CIAD/COBOM.
   Conta FA, FP e trânsito (o filtro de tipo da tela não muda a conferência), cada militar
   uma vez por dia, sem quem é CMT Pelotão/ADM (igual ao total da tela).
   A conferência passa dia a dia pelo mês da tela ou pelo ano inteiro e lista os dias em que
   alguma regra não foi cumprida (dias seguidos com a mesma regra viram um intervalo).
   As regras ficam no Apps Script (Code.gs 5.11) e valem para todos; só o administrador altera.
   Sem o Apps Script (demonstração), ficam neste navegador.
   ========================================================================== */
(function () {
  const { FC, ehCmt } = FER;
  const ALAS = ['1ª Ala PEMAD', '2ª Ala PEMAD', '3ª Ala PEMAD', '4ª Ala PEMAD'];
  const PELS = ['1º Pel', '2º Pel', '3º Pel', '4º Pel'];
  const COBOM = 'CIAD/COBOM', PBRESC = 'PBRESC';
  // regras: chave, nome no quadro, explicação
  const DEF = [
    ['maxBM', 'Total da sede', 'todos os quadros da sede juntos (pelotões, alas, COBOM e PBRESC)'],
    ['pemadPbresc', 'PEMAD + PBRESC', 'as 4 alas do PEMAD e o PBRESC somados (sem PEMAD ADM)'],
    ['ala', 'Cada ala do PEMAD', 'em cada uma das 4 alas, separadamente'],
    ['pel', 'Cada pelotão da sede', 'em cada pelotão do 1º ao 4º, separadamente'],
    ['cobom', 'CIAD/COBOM', 'no CIAD/COBOM (sem os oficiais e o CIAD/COBOM ADM)'],
  ];
  const KEY_LOCAL = 'regras-ferias';

  /** regras em vigor: { maxBM, pemadPbresc, ala, pel, cobom } (null = sem limite) */
  function regras() {
    const salvo = DS.fonte === 'sheets' ? DS.regrasFerias : PREFS.lerJSON(KEY_LOCAL, null);
    const r = { maxBM: FC().maxBM, pemadPbresc: null, ala: null, pel: null, cobom: null };
    if (salvo) DEF.forEach(([k]) => { if (k in salvo) r[k] = salvo[k] == null || salvo[k] === '' ? null : +salvo[k]; });
    return r;
  }
  // o quadro inteiro (regras, conferência e marcas no calendário) é só do administrador (4.72)
  const podeEditar = () => DS.fonte !== 'sheets' || DS.perfil === 'admin';
  const ehAdm = podeEditar;
  async function salva(r) {
    if (DS.fonte !== 'sheets') { PREFS.gravarJSON(KEY_LOCAL, r); return; }
    const j = await DADOS.pedirApi({ acao: 'salvarRegrasFerias', regras: r });
    if (!j.ok) throw new Error(j.erro || 'não gravou');
    DS.regrasFerias = j.regrasFerias;
  }

  // quem está de férias no dia, por OBM (cada militar uma vez; sem CMT Pelotão/ADM)
  function porObmNoDia(d) {
    const out = new Map(), vistos = new Set();
    DS.feriasEm(d).forEach((f) => {
      const m = DS.militar(f.militar);
      if (!m || vistos.has(m.id) || ehCmt(f, m)) return;
      vistos.add(m.id);
      if (!out.has(m.obm)) out.set(m.obm, []);
      out.get(m.obm).push(m);
    });
    return out;
  }
  /** regras descumpridas no dia: [{ chave, grupo, n, max, mils }] */
  function violacoesDia(d, r = regras()) {
    const o = porObmNoDia(d), de = (obms) => obms.flatMap((x) => o.get(x) || []), out = [];
    const testa = (chave, grupo, mils, max) => { if (max != null && max >= 0 && mils.length > max) out.push({ chave, grupo, n: mils.length, max, mils }); };
    testa('maxBM', 'Total da sede', de(APP_CONFIG.obms.quadrosGeral), r.maxBM);
    testa('pemadPbresc', 'PEMAD + PBRESC', de([...ALAS, PBRESC]), r.pemadPbresc);
    ALAS.forEach((a) => testa('ala', a, de([a]), r.ala));
    PELS.forEach((p) => testa('pel', p, de([p]), r.pel));
    testa('cobom', COBOM, de([COBOM]), r.cobom);
    return out;
  }

  // conferência do mês (mes 0–11) ou do ano (mes = null), guardada enquanto os dados e as regras não mudam
  let memo = { db: null, k: '', v: null };
  function confere(ano, mes) {
    const r = regras(), k = JSON.stringify([ano, mes, r]);
    if (memo.db === DS.db && memo.k === k) return memo.v;
    const ini = new Date(ano, mes == null ? 0 : mes, 1), fim = mes == null ? new Date(ano, 11, 31) : new Date(ano, mes + 1, 0);
    const avisos = [], abertos = new Map(), dias = new Map();
    for (let d = new Date(ini); d <= fim; d.setDate(d.getDate() + 1)) {
      const iso = DS.iso(d), vs = violacoesDia(d, r), agora = new Set();
      if (vs.length) dias.set(iso, vs);
      vs.forEach((v) => {
        const id = v.chave + '|' + v.grupo, a = abertos.get(id);
        agora.add(id);
        if (a) { a.fim = iso; a.n = Math.max(a.n, v.n); v.mils.forEach((m) => a.mils.set(m.id, m)); }
        else { const novo = { ...v, ini: iso, fim: iso, mils: new Map(v.mils.map((m) => [m.id, m])) }; abertos.set(id, novo); avisos.push(novo); }
      });
      [...abertos.keys()].forEach((id) => { if (!agora.has(id)) abertos.delete(id); });   // intervalo acabou
    }
    avisos.sort((a, b) => a.ini.localeCompare(b.ini) || DEF.findIndex((x) => x[0] === a.chave) - DEF.findIndex((x) => x[0] === b.chave));
    const v = { avisos, dias, r };
    memo = { db: DS.db, k, v };
    return v;
  }

  // ---- quadro "Regras de férias" ----
  const st = { escopo: null, aberto: null, editando: false, ligado: null };
  // chave "Conferir regras" (lembrada neste navegador; desligada = sem avisos e sem marcas no calendário)
  const ligado = () => { if (st.ligado == null) st.ligado = PREFS.ligado('fer-regras-conferir', false); return st.ligado; };
  /** dias com regra descumprida para marcar no calendário (vazio com a chave desligada) */
  const diasMarcados = (ano, mes) => (ehAdm() && ligado() ? confere(ano, mes).dias : new Map());
  const escopo = () => { if (st.escopo == null) st.escopo = PREFS.ler('fer-regras-escopo', 'mes'); return st.escopo; };
  const aberto = () => { if (st.aberto == null) st.aberto = PREFS.ligado('fer-regras', true); return st.aberto; };
  const ordMil = (a, b) => (DS.RANK[a.posto] ?? 99) - (DS.RANK[b.posto] ?? 99) || String(a.nomeGuerra).localeCompare(String(b.nomeGuerra));
  const per = (a) => (a.ini === a.fim ? UI.data(a.ini) : `${UI.dm(a.ini)} a ${UI.data(a.fim)}`);

  /** HTML do quadro; ano/mes = mês que a tela mostra */
  function painel(ano, mes) {
    if (!ehAdm()) return '';
    const esc = UI.esc, sc = escopo(), on = ligado(), c = on ? confere(ano, sc === 'ano' ? null : mes) : { avisos: [], r: regras() }, r = c.r;
    const alvo = sc === 'ano' ? `${ano}` : `${UI.MESES[mes].toLowerCase()} de ${ano}`;
    const temRegra = DEF.some(([k]) => r[k] != null);
    const res = !on ? '' : !temRegra ? '<span class="chip">sem regras definidas</span>'
      : c.avisos.length ? `<span class="chip bad dot">${c.avisos.length} aviso${c.avisos.length > 1 ? 's' : ''} em ${esc(alvo)}</span>`
        : `<span class="chip ok dot">regras cumpridas em ${esc(alvo)}</span>`;
    const ed = st.editando && podeEditar();
    const linhasRegra = DEF.map(([k, nome, exp]) => `<div class="fr-regra"><div><b>${nome}</b><small class="muted">${exp}</small></div>${ed
      ? `<input class="input fr-num" type="number" min="0" max="200" step="1" data-regra="${k}" value="${r[k] == null ? '' : r[k]}" placeholder="sem limite" aria-label="${nome}: máximo de militares de férias no dia">`
      : `<span class="fr-val">${r[k] == null ? '<span class="muted">sem limite</span>' : `máx. <b>${r[k]}</b>`}</span>`}</div>`).join('');
    const lista = c.avisos.slice(0, 80).map((a) => {
      const mils = [...a.mils.values()].sort(ordMil).map((m) => DS.guerra(m));
      return `<li><button type="button" class="fr-aviso" data-ir="${a.ini}" title="Abrir Férias por data em ${UI.data(a.ini)}"><span class="fr-q num">${per(a)}</span><span><b>${esc(a.grupo)}</b>: ${a.ini === a.fim ? '' : 'até '}${a.n} de férias no mesmo dia (máx. ${a.max})<small class="muted">${a.ini === a.fim ? '' : 'No período: '}${esc(mils.join(', '))}</small></span></button></li>`;
    }).join('');
    return `<section class="panel cal-panel fr-painel ${aberto() ? '' : 'fechado'}"><div class="panel-h">
        <button type="button" class="cal-toggle" id="frTog" aria-expanded="${aberto()}">${ICON('chevron', 'chev')}<h3>Regras de férias</h3></button>
        <label class="fp-chave fr-chave" title="Liga ou desliga a conferência: avisos e marcas no calendário"><input type="checkbox" id="frLiga" ${on ? 'checked' : ''}><span class="fp-sw" aria-hidden="true"></span><span><b>Conferir regras</b></span></label>
        ${res}
        ${on ? `<div class="seg fr-escopo" role="group" aria-label="Conferir"><button type="button" data-escopo="mes" aria-pressed="${sc === 'mes'}">Mês</button><button type="button" data-escopo="ano" aria-pressed="${sc === 'ano'}">Ano</button></div>` : ''}
      </div>
      <div class="panel-b" ${aberto() ? '' : 'hidden'}><div class="fr-grid">
        <div class="fr-regras"><p class="muted fr-t">Máximo de militares de férias no mesmo dia (FA, FP e trânsito; sem CMT Pelotão/ADM)</p>${linhasRegra}
          ${podeEditar() ? (ed ? `<div class="btn-row"><button type="button" class="btn primary sm" id="frSalva">Salvar regras</button><button type="button" class="btn ghost sm" id="frCancela">Cancelar</button></div><p class="muted fr-t">Deixe em branco para não conferir a regra.${DS.fonte === 'sheets' ? ' Vale para todos os usuários.' : ''}</p>`
            : `<button type="button" class="btn ghost sm" id="frEdita">${ICON('edit')}<span>Alterar regras</span></button>`) : '<p class="muted fr-t">Só o administrador altera as regras.</p>'}
        </div>
        <div class="fr-avisos">${!on ? '<p class="muted">Conferência desligada. Ligue a chave <b>"Conferir regras"</b> para ver os dias em que alguma regra não foi cumprida e marcá-los em vermelho no calendário.</p>' : !temRegra ? '<p class="muted">Defina ao menos uma regra para conferir.</p>' : c.avisos.length
          ? `<p class="fr-t"><b>Dias em que alguma regra não foi cumprida</b> <span class="muted">(${esc(alvo)} · clique para abrir o dia)</span></p><ul class="fr-lista">${lista}</ul>${c.avisos.length > 80 ? `<p class="muted fr-t">… e mais ${c.avisos.length - 80}.</p>` : ''}`
          : `<p class="fr-okmsg">${ICON('check')} Nenhuma regra descumprida em ${esc(alvo)}.</p>`}</div>
      </div></div></section>`;
  }
  /** liga o quadro: rer = redesenha a tela */
  function liga(view, rer) {
    const q = (s) => view.querySelector(s);
    if (!q('.fr-painel')) return;
    q('#frTog').onclick = () => { st.aberto = !aberto(); PREFS.marcar('fer-regras', st.aberto); rer(); };
    q('#frLiga').onchange = (e) => { st.ligado = e.target.checked; PREFS.marcar('fer-regras-conferir', st.ligado); rer(); };
    view.querySelectorAll('[data-escopo]').forEach((b) => (b.onclick = () => { st.escopo = b.dataset.escopo; PREFS.gravar('fer-regras-escopo', st.escopo); rer(); }));
    view.querySelectorAll('[data-ir]').forEach((b) => (b.onclick = () => { FER.estado.dataSel = DS.parse(b.dataset.ir); if (location.hash.slice(1) === 'ferias-data') rer(); else location.hash = 'ferias-data'; }));
    if (q('#frEdita')) q('#frEdita').onclick = () => { st.editando = true; rer(); };
    if (q('#frCancela')) q('#frCancela').onclick = () => { st.editando = false; rer(); };
    if (q('#frSalva')) q('#frSalva').onclick = async (e) => {
      const r = {};
      view.querySelectorAll('[data-regra]').forEach((i) => { const v = i.value.trim(); r[i.dataset.regra] = v === '' ? null : Math.max(0, Math.min(200, Math.round(+v))); });
      const volta = UI.ocupado(e.currentTarget, 'Salvando…');
      try { await salva(r); st.editando = false; rer(); UI.toast('Regras de férias salvas'); }
      catch (x) { volta(); UI.toast('Não foi possível salvar: ' + (x.message || x), 8000); }
    };
  }

  Object.assign(FER, { regrasFerias: regras, violacoesDia, confereRegras: confere, diasRegra: diasMarcados, painelRegras: painel, ligaRegras: liga });
})();
