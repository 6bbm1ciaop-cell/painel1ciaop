/* ==========================================================================
   TELA › ESCALA MENSAL › GRADE COMO PLANILHA (ESC.planilha)
   As grades do PBRESC e do COBOM funcionam como uma planilha (Excel / Google):
     - clique escolhe a célula; arrastar ou Shift + setas seleciona várias;
     - setas, Tab e Enter andam pelas células; Ctrl + setas vão até a borda;
     - começar a digitar escreve na célula (as setas passam a andar dentro do texto);
       Enter ou Tab confirma, Esc desiste; F2 ou duplo clique edita sem apagar;
     - Delete/Backspace apagam as células selecionadas;
     - Ctrl+C / Ctrl+X / Ctrl+V copiam, recortam e colam (também de/para o Excel e o
       Google Planilhas); um valor só, colado numa seleção, preenche todas as células;
     - Ctrl+Z desfaz; Ctrl+A seleciona a grade toda; clique no dia ou no turno
       seleciona a coluna ou a linha.
   Células: <td class="pc" data-r data-c data-ed [data-auto]>valor</td> dentro de
   <table class="es-planilha" data-grade="pb|cb" data-foco="grade-pb|cb" tabindex="0">.
   As alterações voltam para o editor em lote: opts.aplicar([{ ed, v, auto }]).
   ========================================================================== */
(function () {
  // seleção e "desfazer" de cada grade continuam valendo depois de redesenhar a tela
  const estado = { sel: {}, desfazer: {}, foco: null, arrastando: false };
  // copiar/colar de cada grade (os eventos chegam pelo documento, para a grade com o foco)
  const acoes = new WeakMap();
  document.addEventListener('pointerup', () => { estado.arrastando = false; });

  // a grade que está com o foco (pelo teclado ou pelo clique) recebe copiar/colar
  document.addEventListener('focusin', (e) => {
    if (!e.target.closest || (!e.target.closest('.es-planilha') && !e.target.closest('.pl-ed'))) estado.foco = null;
  });
  ['copy', 'cut', 'paste'].forEach((tipo) => document.addEventListener(tipo, (e) => {
    const a = acoes.get(document.activeElement);
    if (a) a[tipo](e);
  }));

  function ligar(tabela, opts) {
    const grade = tabela.dataset.grade;
    const wrap = tabela.parentNode;
    const cel = new Map();
    let nR = 0, nC = 0;
    tabela.querySelectorAll('td.pc').forEach((td) => {
      const r = +td.dataset.r, c = +td.dataset.c;
      cel.set(r + '|' + c, td);
      nR = Math.max(nR, r + 1); nC = Math.max(nC, c + 1);
    });
    if (!nR || !nC) return;
    const td = (r, c) => cel.get(r + '|' + c);
    const valor = (r, c) => { const t = td(r, c); return t ? t.textContent : ''; };
    const limita = (v, max) => Math.max(0, Math.min(max - 1, v));
    let s = estado.sel[grade] || { ar: 0, ac: 0, fr: 0, fc: 0 };
    s = { ar: limita(s.ar, nR), ac: limita(s.ac, nC), fr: limita(s.fr, nR), fc: limita(s.fc, nC) };
    estado.sel[grade] = s;
    const faixa = () => ({ r0: Math.min(s.ar, s.fr), r1: Math.max(s.ar, s.fr), c0: Math.min(s.ac, s.fc), c1: Math.max(s.ac, s.fc) });

    // desenha a seleção (sem redesenhar a tela)
    function pinta(rolar) {
      const f = faixa();
      cel.forEach((t) => {
        const r = +t.dataset.r, c = +t.dataset.c;
        t.classList.toggle('sel', r >= f.r0 && r <= f.r1 && c >= f.c0 && c <= f.c1);
        t.classList.toggle('ativa', r === s.fr && c === s.fc);
      });
      if (rolar) { const a = td(s.fr, s.fc); if (a) a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    }
    const vai = (r, c, estende) => {
      s.fr = limita(r, nR); s.fc = limita(c, nC);
      if (!estende) { s.ar = s.fr; s.ac = s.fc; }
      pinta(true);
    };

    // grava um lote de alterações (guarda o que havia antes para o Ctrl+Z)
    function grava(lista) {
      const ops = lista.filter((o) => o.td && o.v !== o.td.textContent);
      if (!ops.length) return;
      const pilha = (estado.desfazer[grade] = estado.desfazer[grade] || []);
      pilha.push(ops.map((o) => ({ ed: o.td.dataset.ed, v: o.td.textContent, auto: o.td.dataset.auto })));
      if (pilha.length > 50) pilha.shift();
      // mostra já na tela (o redesenho vem logo depois)
      ops.forEach((o) => { o.td.textContent = o.v; });
      opts.aplicar(ops.map((o) => ({ ed: o.td.dataset.ed, v: o.v, auto: o.td.dataset.auto })));
    }
    const normaliza = (t, v) => (t && t.dataset.ed.endsWith('|nome') ? v : String(v).toUpperCase()).trim();

    /* ---------- edição dentro da célula ---------- */
    let editor = null;
    function edita(inicial, manter) {
      const t = td(s.fr, s.fc); if (!t) return;
      fecha(false);
      const inp = document.createElement('input');
      inp.className = 'pl-ed' + (t.dataset.ed.endsWith('|nome') ? ' nome' : '');
      inp.autocomplete = 'off';
      inp.value = manter ? t.textContent : inicial;
      // posição da célula dentro da área que rola (vale também para a coluna do nome, que fica fixa)
      const rt = t.getBoundingClientRect(), rw = wrap.getBoundingClientRect();
      const esc = rt.width / (t.offsetWidth || 1);   // zoom da tela ("Ajustar layout")
      inp.style.left = (rt.left - rw.left) / esc + wrap.scrollLeft + 'px'; inp.style.top = (rt.top - rw.top) / esc + wrap.scrollTop + 'px';
      inp.style.width = Math.max(t.offsetWidth, t.dataset.ed.endsWith('|nome') ? 170 : 44) + 'px';
      inp.style.height = t.offsetHeight + 'px';
      wrap.appendChild(inp);
      editor = { inp, t };
      estado.foco = grade;
      inp.focus({ preventScroll: true });
      const n = inp.value.length; inp.setSelectionRange(n, n);
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); fecha(true); vai(s.fr + (e.shiftKey ? -1 : 1), s.fc); tabela.focus({ preventScroll: true }); }
        else if (e.key === 'Tab') { e.preventDefault(); fecha(true); vai(s.fr, s.fc + (e.shiftKey ? -1 : 1)); tabela.focus({ preventScroll: true }); }
        else if (e.key === 'Escape') { e.preventDefault(); fecha(false); tabela.focus({ preventScroll: true }); }
        e.stopPropagation();   // setas andam dentro do texto
      });
      inp.addEventListener('blur', () => { if (editor && editor.inp === inp) fecha(true); });
    }
    function fecha(confirma) {
      if (!editor) return;
      const { inp, t } = editor;
      editor = null;
      const v = normaliza(t, inp.value);
      inp.remove();
      if (confirma) grava([{ td: t, v }]);
    }

    /* ---------- copiar, recortar, colar, desfazer ---------- */
    const tsv = () => { const f = faixa(), l = []; for (let r = f.r0; r <= f.r1; r++) { const x = []; for (let c = f.c0; c <= f.c1; c++) x.push(valor(r, c)); l.push(x.join('\t')); } return l.join('\n'); };
    function limpa() { const f = faixa(), ops = []; for (let r = f.r0; r <= f.r1; r++) for (let c = f.c0; c <= f.c1; c++) ops.push({ td: td(r, c), v: '' }); grava(ops); }
    function cola(texto) {
      const linhas = String(texto).replace(/\r/g, '').replace(/\n+$/, '').split('\n').map((l) => l.split('\t'));
      if (!linhas.length) return;
      const f = faixa(), ops = [];
      if (linhas.length === 1 && linhas[0].length === 1) {
        // um valor só: preenche toda a seleção
        for (let r = f.r0; r <= f.r1; r++) for (let c = f.c0; c <= f.c1; c++) ops.push({ td: td(r, c), v: normaliza(td(r, c), linhas[0][0]) });
      } else {
        linhas.forEach((l, i) => l.forEach((v, j) => { const t = td(f.r0 + i, f.c0 + j); if (t) ops.push({ td: t, v: normaliza(t, v) }); }));
        // a seleção passa a cobrir o que foi colado
        s.ar = f.r0; s.ac = f.c0; s.fr = limita(f.r0 + linhas.length - 1, nR); s.fc = limita(f.c0 + Math.max(...linhas.map((l) => l.length)) - 1, nC);
      }
      grava(ops); pinta(false);
    }
    function desfaz() {
      const pilha = estado.desfazer[grade] || [];
      const ultimo = pilha.pop(); if (!ultimo) return;
      ultimo.forEach((o) => { const t = [...cel.values()].find((x) => x.dataset.ed === o.ed); if (t) t.textContent = o.v; });
      opts.aplicar(ultimo);
    }

    acoes.set(tabela, {
      copy(e) { e.preventDefault(); e.clipboardData.setData('text/plain', tsv()); },
      cut(e) { e.preventDefault(); e.clipboardData.setData('text/plain', tsv()); limpa(); },
      paste(e) { e.preventDefault(); cola(e.clipboardData.getData('text/plain')); },
    });

    /* ---------- teclado ---------- */
    tabela.addEventListener('keydown', (e) => {
      if (editor) return;
      const ctrl = e.ctrlKey || e.metaKey, k = e.key;
      const passo = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
      if (passo) {
        e.preventDefault();
        if (ctrl) vai(passo[0] ? (passo[0] < 0 ? 0 : nR - 1) : s.fr, passo[1] ? (passo[1] < 0 ? 0 : nC - 1) : s.fc, e.shiftKey);
        else vai(s.fr + passo[0], s.fc + passo[1], e.shiftKey);
      } else if (k === 'Tab') { e.preventDefault(); vai(s.fr, s.fc + (e.shiftKey ? -1 : 1)); }
      else if (k === 'Enter') { e.preventDefault(); vai(s.fr + (e.shiftKey ? -1 : 1), s.fc); }
      else if (k === 'Home') { e.preventDefault(); vai(ctrl ? 0 : s.fr, 0, e.shiftKey); }
      else if (k === 'End') { e.preventDefault(); vai(ctrl ? nR - 1 : s.fr, nC - 1, e.shiftKey); }
      else if (k === 'F2') { e.preventDefault(); edita('', true); }
      else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); limpa(); }
      else if (k === 'Escape') { s.ar = s.fr; s.ac = s.fc; pinta(false); }
      else if (ctrl && (k === 'z' || k === 'Z')) { e.preventDefault(); desfaz(); }
      else if (ctrl && (k === 'a' || k === 'A')) { e.preventDefault(); s.ar = 0; s.ac = 0; s.fr = nR - 1; s.fc = nC - 1; pinta(false); }
      else if (k.length === 1 && !ctrl && !e.altKey) { e.preventDefault(); edita(k, false); }
    });
    tabela.addEventListener('focus', () => { estado.foco = grade; });

    /* ---------- mouse e toque ---------- */
    let moveu = false, toque = null;
    tabela.addEventListener('pointerdown', (e) => {
      const t = e.target.closest('td.pc');
      if (t) {
        if (editor && editor.t === t) return;
        fecha(true);
        if (e.pointerType === 'touch') {
          // no celular: não trava a rolagem; um toque (sem arrastar) abre a célula para digitar
          toque = t; moveu = false;
          return;
        }
        e.preventDefault();
        tabela.focus({ preventScroll: true });
        vai(+t.dataset.r, +t.dataset.c, e.shiftKey);
        estado.arrastando = true; moveu = false;
        return;
      }
      // cabeçalho do dia: seleciona a coluna; nome do turno: seleciona a linha
      const col = e.target.closest('[data-col]'), lin = e.target.closest('[data-lin]');
      if (col || lin) {
        e.preventDefault(); fecha(true); tabela.focus({ preventScroll: true });
        if (col) { s.ac = +col.dataset.col; s.fc = s.ac; s.ar = 0; s.fr = nR - 1; } else { s.ar = +lin.dataset.lin; s.fr = s.ar; s.ac = 0; s.fc = nC - 1; }
        pinta(false);
      }
    });
    tabela.addEventListener('pointerover', (e) => {
      if (!estado.arrastando) return;
      const t = e.target.closest('td.pc');
      if (t && (+t.dataset.r !== s.fr || +t.dataset.c !== s.fc)) { moveu = true; vai(+t.dataset.r, +t.dataset.c, true); }
    });
    tabela.addEventListener('pointercancel', () => { toque = null; });   // virou rolagem
    tabela.addEventListener('pointerup', (e) => {
      const t = e.target.closest('td.pc');
      if (toque && t === toque) { vai(+t.dataset.r, +t.dataset.c, false); edita('', true); }
      toque = null;
    });
    tabela.addEventListener('dblclick', (e) => { if (e.target.closest('td.pc')) edita('', true); });

    pinta(false);
    if (estado.foco === grade && !document.activeElement.closest('.pl-ed')) tabela.focus({ preventScroll: true });
  }

  ESC.planilha = {
    /** Liga todas as grades-planilha da tela. aplicar(ops) grava as alterações no rascunho. */
    ligar(raiz, aplicar) { raiz.querySelectorAll('table.es-planilha').forEach((t) => ligar(t, { aplicar })); },
    /** Esquece seleção e "desfazer" (ao trocar de mês). */
    zera() { estado.sel = {}; estado.desfazer = {}; },
  };
})();
