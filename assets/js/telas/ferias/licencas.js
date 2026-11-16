/* ==========================================================================
   TELA › LICENÇAS E DISPENSAS (#licencas)
   Tabela com abas Todas/Licenças/Dispensas (abre em "Em vigor hoje") e painel do
   militar com dias licenciado/dispensado por ano e itens da dispensa.
   ========================================================================== */
(function () {
  const n = UI.norm;
  const { tabs, situacao, sit } = FER;
  /* ---------- licenças ---------- */
  /* ---------- licenças e dispensas (modelo do Data Studio) ---------- */
  const sl = { obm: '', posto: '', q: '', ano: '', sit: 'vigor', sel: null, mil: null, anoMil: null, aba: 'todas' };   // abre mostrando quem está em vigor hoje
  // em vigor hoje?
  const vigor = (l) => { const h = DS.iso(DS.hoje()); return l.inicio <= h && l.fim >= h; };
  // dias de um afastamento que caem dentro do ano (ex.: dispensa até 2050 conta só os dias do ano escolhido)
  const diasNoAno = (l, ano) => {
    const a = DS.parse(`${ano}-01-01`), b = DS.parse(`${ano}-12-31`);
    const i = DS.parse(l.inicio) > a ? DS.parse(l.inicio) : a, f = DS.parse(l.fim) < b ? DS.parse(l.fim) : b;
    return f >= i ? Math.round((f - i) / 864e5) + 1 : 0;
  };
  // lista dos itens da dispensa
  const itensHtml = (l) => (l.itens && l.itens.length ? `<ul class="ld-itens">${l.itens.map((x) => `<li>${UI.esc(x)}</li>`).join('')}</ul>` : '<p class="muted" style="font-size:13px">Itens não informados no formulário.</p>');
  // painel do militar: dias de licença e de dispensa no ano + cada afastamento
  function painelMilitar(todas, mid, regSel) {
    const m = DS.militar(mid);
    if (!m) return `<div class="ld-vazio">${ICON('user')}<p>Clique em um militar em qualquer tabela para ver quantos dias ele esteve licenciado ou dispensado no ano e os itens da dispensa.</p></div>`;
    const ano = sl.anoMil || +(sl.ano || DS.hoje().getFullYear());
    const dele = todas.filter((l) => l.militar === mid);
    const noAno = dele.filter((l) => diasNoAno(l, ano) > 0).sort((a, b) => a.inicio.localeCompare(b.inicio));
    const lic = noAno.filter((l) => l.categoria !== 'Dispensa'), dsp = noAno.filter((l) => l.categoria === 'Dispensa');
    const soma = (ls) => ls.reduce((s, l) => s + diasNoAno(l, ano), 0);
    const anos = [...new Set(dele.flatMap((l) => {
      const out = [];
      for (let y = +l.inicio.slice(0, 4); y <= Math.min(+l.fim.slice(0, 4), DS.hoje().getFullYear() + 1); y++) out.push(y);
      return out;
    }))].sort();
    const reg = regSel && regSel.militar === mid ? regSel : null;
    return `<div class="ld">
      <div class="ld-cab"><div><div class="mil-name" style="font-size:17px">${UI.esc(DS.guerra(m))}</div><div class="mil-sub">${UI.esc(m.obm || '')}${m.nBM ? ' / BM ' + UI.esc(m.nBM) : ''}</div></div>
        <div class="ld-ano"><button type="button" class="icon-btn" data-ano="${ano - 1}" aria-label="Ano anterior">${ICON('chevronL')}</button><b>${ano}</b><button type="button" class="icon-btn" data-ano="${ano + 1}" aria-label="Próximo ano">${ICON('chevron')}</button></div></div>
      <div class="ld-tot">
        <div class="lt lic"><small>Licenciado em ${ano}</small><b class="num">${soma(lic)}</b><span>dia(s) · ${lic.length} licença(s)</span></div>
        <div class="lt dsp"><small>Dispensado em ${ano}</small><b class="num">${soma(dsp)}</b><span>dia(s) · ${dsp.length} dispensa(s)</span></div>
      </div>
      ${noAno.length ? `<div><h4 class="fp-h">Afastamentos em ${ano}</h4><ul class="ld-lista">${noAno.map((l) => `<li class="${l.categoria === 'Dispensa' ? 'd' : 'l'} ${reg && reg.id === l.id ? 'on' : ''}"><button type="button" data-reg="${l.id}"><span><b>${UI.esc(l.tipo)}</b>${vigor(l) ? ' <em class="ld-sim">em vigor</em>' : ''}<small>${UI.dm(l.inicio)}/${l.inicio.slice(2, 4)} a ${UI.dm(l.fim)}/${l.fim.slice(2, 4)}${l.dias !== diasNoAno(l, ano) ? ` · total ${UI.num(l.dias)} d` : ''}</small></span><span class="num">${diasNoAno(l, ano)} d</span></button></li>`).join('')}</ul></div>`
        : `<p class="muted" style="font-size:13px">Sem licenças ou dispensas em ${ano}.${anos.length ? ` Anos com registro: ${anos.join(', ')}.` : ''}</p>`}
      ${reg ? `<div class="ld-reg"><h4 class="fp-h">${reg.categoria === 'Dispensa' ? 'Itens da dispensa' : 'Detalhes da licença'} <span class="muted">${UI.dm(reg.inicio)} a ${UI.data(reg.fim)}</span></h4>
          ${reg.categoria === 'Dispensa' ? itensHtml(reg) : ''}
          <dl class="kv">${reg.aposTermino ? `<dt>Após o término</dt><dd>${UI.esc(reg.aposTermino)}</dd>` : ''}${reg.ata ? `<dt>Nº da ata</dt><dd class="num">${UI.esc(reg.ata)}</dd>` : ''}<dt>Dias (total)</dt><dd>${UI.num(reg.dias)}</dd></dl></div>` : ''}
    </div>`;
  }
  PAGES.licencas = {
    title: 'Licenças e dispensas',
    render(view) {
      const todas = DS.licencas().map((l) => ({ ...l, m: DS.militar(l.militar) || {} }));
      const anoF = sl.ano ? +sl.ano : null;
      const anos = [...new Set(todas.map((l) => l.inicio.slice(0, 4)))].sort().reverse();
      const rows = todas.filter((l) => (!sl.obm || l.m.obm === sl.obm) && (!sl.posto || l.m.posto === sl.posto) && (!anoF || diasNoAno(l, anoF) > 0)
        && (!sl.sit || (sl.sit === 'vigor' ? vigor(l) : situacao(l)[0] === sl.sit)) && (!sl.q || n((l.m.nome || '') + ' ' + (l.m.nomeGuerra || '') + ' ' + (l.m.nBM || '')).includes(n(sl.q))))
        .sort((a, b) => (vigor(b) - vigor(a)) || b.inicio.localeCompare(a.inicio));
      const lic = rows.filter((l) => l.categoria !== 'Dispensa'), disp = rows.filter((l) => l.categoria === 'Dispensa');
      const dias = (ls) => ls.reduce((s, l) => s + (anoF ? diasNoAno(l, anoF) : (l.dias || 0)), 0);
      const nMil = (ls) => new Set(ls.map((l) => l.militar)).size;
      if (!sl.mil && !sl._limpo) { const d0 = disp.find(vigor) || lic.find(vigor); if (d0) { sl.mil = d0.militar; sl.sel = d0.id; } }
      const regSel = todas.find((l) => l.id === sl.sel);
      const obms = DS.obms().filter((o) => todas.some((l) => l.m.obm === o));
      const lista = sl.aba === 'lic' ? lic : sl.aba === 'disp' ? disp : rows;
      view.innerHTML = `<div class="page">
        ${UI.pageHead('Licenças e dispensas – 1ª Cia Op', 'Clique em um militar para ver os dias licenciado ou dispensado no ano e os itens da dispensa. Em vigor hoje em destaque.', UI.linkPlanilha('licencas'))}
        ${tabs('licencas')}
        <div class="filters">
          ${UI.select('lObm', 'OBM', obms, sl.obm)}${UI.select('lPosto', 'Posto/graduação', DS.postos(), sl.posto)}
          ${UI.input('lQ', 'Nome do militar', sl.q, { placeholder: 'Nome, guerra ou nº BM' })}
          ${UI.select('lAno', 'Ano', anos, sl.ano)}
          ${UI.select('lSit', 'Situação', [['vigor', 'Em vigor hoje'], ['Agendada', 'Agendada'], ['Concluída', 'Concluída']], sl.sit)}
          ${UI.btnLimpar('lLimpar')}
        </div>
        <div class="ld-grid">
          <section class="panel"><div class="panel-h ld-h">
              <div class="seg" role="tablist" aria-label="Tipo">${[['todas', `Todas (${rows.length})`], ['lic', `Licenças (${lic.length})`], ['disp', `Dispensas (${disp.length})`]].map(([k, t]) => `<button type="button" role="tab" data-aba="${k}" aria-selected="${sl.aba === k}">${t}</button>`).join('')}</div>
              <div class="ld-hojes">${[['lic', 'Licenciados hoje', lic.filter(vigor).length], ['disp', 'Dispensados hoje', disp.filter(vigor).length]].map(([k, t, v]) => `<button type="button" class="ld-hoje ${v ? 'tem' : ''} ${sl.sit === 'vigor' && sl.aba === k ? 'on' : ''}" data-hoje="${k}" title="Mostrar só quem está ${k === 'lic' ? 'licenciado' : 'dispensado'} hoje">${t} <b>${v}</b></button>`).join('')}</div></div>
            <div id="lTbl"></div></section>
          <section class="panel ld-painel"><div class="panel-h"><h3>Militar selecionado</h3>${sl.mil ? '<button type="button" class="icon-btn" id="lDesel" aria-label="Limpar seleção">' + ICON('x') + '</button>' : ''}</div><div class="panel-b" id="lDet">${painelMilitar(todas, sl.mil, regSel)}</div></section>
        </div>
      </div>`;
      UI.table(view.querySelector('#lTbl'), {
        cols: [
          { key: 'obm', label: 'OBM', render: (l) => UI.obm(l.m.obm || l.obmTxt), sort: (l) => DS.ordem(l.m.obm) },
          { key: 'nome', label: 'Militar', cls: 'name', render: (l) => `<b>${UI.esc(DS.guerra(l.m))}</b>`, sort: (l) => l.m.nomeGuerra },
          { key: 'tipo', label: 'Tipo', render: (l) => `<span class="ld-tipo ${l.categoria === 'Dispensa' ? 'd' : 'l'}">${UI.esc(l.tipo)}</span>` },
          { key: 'inicio', label: 'Início', render: (l) => `<span class="num">${UI.data(l.inicio)}</span>` },
          { key: 'fim', label: 'Término', render: (l) => `<span class="num">${UI.data(l.fim)}</span>` },
          { key: 'dias', label: anoF ? `Dias em ${anoF}` : 'Dias', cls: 'n', render: (l) => UI.num(anoF ? diasNoAno(l, anoF) : l.dias), sort: (l) => (anoF ? diasNoAno(l, anoF) : l.dias) },
          ...(sl.aba === 'disp' ? [{ key: 'itens', label: 'Itens', cls: 'n', render: (l) => l.itens.length || '–', sort: (l) => l.itens.length }] : []),
          { key: 'hoje', label: 'Hoje', cls: 'c', render: (l) => (vigor(l) ? '<b class="ld-sim">SIM</b>' : '<span class="muted">não</span>'), sort: (l) => (vigor(l) ? 0 : 1) },
        ],
        rows: lista, compact: true, maxH: true, onRow: (id) => abre(id), selected: sl.sel, rowCls: (l) => (vigor(l) ? 'ld-vigor' : '') + (l.militar === sl.mil ? ' ld-mesmo' : ''), empty: 'Não há dados',
      });
      const rer = () => { const y = window.scrollY; PAGES.licencas.render(view); window.scrollTo({ top: y }); };
      function abre(id) {
        const l = todas.find((x) => x.id === id); if (!l) return;
        sl.sel = id; if (sl.mil !== l.militar) { sl.mil = l.militar; sl.anoMil = anoF || +l.inicio.slice(0, 4); }
        if (innerWidth <= 1100) { UI.sheet('Militar', painelMilitar(todas, sl.mil, l)); ligaPainel(document.getElementById('sheet')); return; }
        rer();
      }
      function ligaPainel(root) {
        root.querySelectorAll('[data-ano]').forEach((b) => (b.onclick = () => {
          sl.anoMil = +b.dataset.ano;
          if (innerWidth <= 1100) {
            UI.sheet('Militar', painelMilitar(todas, sl.mil, todas.find((x) => x.id === sl.sel)));
            ligaPainel(document.getElementById('sheet'));
          } else rer();
        }));
        root.querySelectorAll('[data-reg]').forEach((b) => (b.onclick = () => {
          sl.sel = b.dataset.reg;
          if (innerWidth <= 1100) {
            UI.sheet('Militar', painelMilitar(todas, sl.mil, todas.find((x) => x.id === sl.sel)));
            ligaPainel(document.getElementById('sheet'));
          } else rer();
        }));
      }
      ligaPainel(view);
      const ds = view.querySelector('#lDesel'); if (ds) ds.onclick = () => {
        sl.mil = null;
        sl.sel = null;
        sl.anoMil = null;
        sl._limpo = true;
        rer();
      };
      view.querySelectorAll('[data-aba]').forEach((b) => (b.onclick = () => { sl.aba = b.dataset.aba; rer(); }));
      view.querySelectorAll('[data-hoje]').forEach((b) => (b.onclick = () => {
        const k = b.dataset.hoje;
        if (sl.sit === 'vigor' && sl.aba === k) { sl.aba = 'todas'; } else { sl.sit = 'vigor'; sl.aba = k; }
        rer();
      }));
      const map = { lObm: 'obm', lPosto: 'posto', lAno: 'ano', lSit: 'sit' };
      Object.keys(map).forEach((k) => (view.querySelector('#' + k).onchange = (e) => {
        sl[map[k]] = e.target.value;
        if (k === 'lAno') sl.anoMil = e.target.value ? +e.target.value : null;
        rer();
      }));
      UI.ligaBusca(view, 'lQ', sl, rer);
      view.querySelector('#lLimpar').onclick = () => { Object.assign(sl, { obm: '', posto: '', q: '', ano: '', sit: '', aba: 'todas' }); rer(); };
    },
  };
})();
