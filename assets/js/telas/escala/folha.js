/* ==========================================================================
   TELA › ESCALA MENSAL › FOLHA A4 (ESC.folha, ESC.encaixa, ESC.imprimir)
   As 3 folhas em A4 paisagem, no formato da escala enviada pela Cia:
     1) quadro de dias, pelotões, PEMAD, pilotos de RPA, legenda e assinatura;
     2) observações gerais (retorno de férias), PBRESC e prescrições;
     3) COBOM/CIAD, legenda dos despachantes, faxina e limpeza de viaturas.
   Usada na prévia da tela (aba "Folha") e na impressão / PDF.
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  const E = () => C.escalaMensal;
  const esc = (s) => UI.esc(s);
  const dd = (n) => String(n).padStart(2, '0');
  const MESES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const porExtenso = (iso) => { const d = DS.parse(iso); return d ? `${dd(d.getDate())} de ${MESES_L[d.getMonth()]} de ${d.getFullYear()}` : ''; };
  const txt = (s) => esc(s).replace(/\n/g, '<br>');

  // cabeçalho dos dias (2 linhas: número e dia da semana)
  const cabDias = (M, rotulo, rotulo2 = '') => `<tr><th class="ef-l" ${rotulo2 ? '' : 'rowspan="2"'}>${rotulo}</th>${M.dias.map((x) => `<th class="${x.fds ? 'fds' : ''}">${x.n}</th>`).join('')}</tr>
    <tr>${rotulo2 ? `<th class="ef-l">${rotulo2}</th>` : ''}${M.dias.map((x) => `<th class="ef-sem ${x.fds ? 'fds' : ''}">${x.sem}</th>`).join('')}</tr>`;
  const celulas = (M, vals) => vals.map((v, i) => `<td class="${M.dias[i].fds ? 'fds' : ''}">${esc(v)}</td>`).join('');

  function topoVersao(M, info) {
    return `<div class="ef-versao">VERSÃO Nº ${esc(info.versaoTxt || dd(info.versao))}${info.rascunho ? ' · RASCUNHO (alterações não gravadas)' : ''}</div>`;
  }
  function assinatura(M) {
    return `<div class="ef-ass"><div class="ef-local">${esc(M.textos.local)}, ${porExtenso(M.textos.data)}</div>
      <div class="ef-nome">${esc(M.textos.assinatura)}</div><div class="ef-nome">${esc(M.textos.cargo)}</div></div>`;
  }

  /* quadros de pelotão/ala lado a lado, com a coluna "Quant" à esquerda */
  function quadros(M, obms, minimo, ala) {
    const n = Math.max(minimo, ...obms.map((o) => M.quadros[o].linhas.length));
    const quant = `<div class="ef-q"><div class="ef-tit">Quant</div><table class="ef-quant">${Array.from({ length: n }, (_, i) => `<tr><td>${i + 1}</td></tr>`).join('')}</table></div>`;
    const col = (o) => {
      const q = M.quadros[o], c = q.cont;
      const linhas = Array.from({ length: n }, (_, i) => {
        const l = q.linhas[i];
        // linha sem militar: mesmas colunas e bordas das demais
        if (!l) return '<tr class="vazia"><td class="ef-posto">-</td><td class="ef-nm">-</td><td class="ef-f">-</td><td class="ef-f">-</td></tr>';
        // o afastamento fica num trecho à parte: se não couber, só ele diminui (ESC.encaixa)
        // .ef-w: nome (sempre no tamanho normal) + afastamento, que diminui ou quebra em 2 linhas (ESC.encaixa)
        const af = l.afast ? `<span class="ef-af">- ${esc(l.afast)}</span>` : '';
        const nome = l.tipo === 'extra' ? `<td colspan="2" class="ef-extra ef-nm"><div class="ef-w"><span class="ef-n">${esc(l.nome)}</span>${af}</div></td>`
          : `<td class="ef-posto">${esc(l.posto)}</td><td class="ef-nm"><div class="ef-w"><span class="ef-n">${esc(l.nome)}</span>${af}</div></td>`;
        return `<tr class="${l.tom ? 't-' + l.tom : ''}">${nome}<td class="ef-f">${esc(l.func)}</td><td class="ef-f">${esc(l.mot)}</td></tr>`;
      }).join('');
      const pe = ala
        ? `<tr class="ef-pe"><td colspan="2">${dd(c.sgt + c.ten)} Sgt ;${dd(c.cbsd)} Cb/Sd</td><td>${dd(c.ml)} ML</td><td>${dd(c.mp)} MP</td></tr>`
        : `<tr class="ef-pe"><td colspan="2" class="ef-sao">${q.sao.texto ? 'SAO: ' + esc(q.sao.texto) : ''}</td><td>${dd(c.ml)} ML</td><td>${dd(c.mp)} MP</td></tr>
           <tr class="ef-pe"><td>${dd(c.ten)} Ten</td><td>${dd(c.sgt)} Sub Ten / Sgt</td><td colspan="2">${dd(c.cbsd)} Cb/Sd</td></tr>`;
      return `<div class="ef-q"><div class="ef-tit">${esc(q.titulo)}</div><table class="ef-tab"><colgroup><col class="c-posto"><col><col class="c-f"><col class="c-f"></colgroup>${linhas}${pe}</table></div>`;
    };
    return `<div class="ef-quadros">${quant}${obms.map(col).join('')}</div>`;
  }

  function pagina1(M, info) {
    const brasao = C.unidade.brasao ? `<img class="ef-brasao" src="${esc(C.unidade.brasao)}" alt="">` : '';
    const grade = [1, 2, 3, 4].map((p) => `<tr><th class="ef-l">${p}º Pel</th>${celulas(M, M.grade[p].map((c) => c.v))}</tr>`).join('');
    const leg = E().legenda.map(([s, t]) => `<td><b>${esc(s)}</b>: ${esc(t)}</td>`).join('');
    return `<section class="ef-pag"><div class="ef-in">
      ${topoVersao(M, info)}
      <div class="ef-topo"><h1>${esc(M.textos.titulo)}</h1>${brasao || '<span></span>'}<h1>- ${esc(M.nome.split(' de ')[0])} -</h1></div>
      <table class="ef-dias">${cabDias(M, 'DIA')}${grade}</table>
      <div class="ef-faixa">${esc(M.textos.cmtCia)}</div>
      ${quadros(M, ESC.PELS, E().linhasPelotao, false)}
      <div class="ef-faixa">${esc(M.textos.pemad)}</div>
      ${quadros(M, ESC.ALAS, E().linhasAla, true)}
      <div class="ef-faixa">Pilotos de RPA/Drone</div>
      <div class="ef-quadros ef-rpa"><div></div>${[1, 2, 3, 4].map((c) => `<div class="ef-caixa">${esc(M.rpa[c].texto)}</div>`).join('')}</div>
      <table class="ef-legenda"><tr>${leg}</tr></table>
      ${assinatura(M)}
    </div></section>`;
  }

  function pagina2(M, info) {
    const pb = M.pbresc;
    return `<section class="ef-pag"><div class="ef-in">
      ${topoVersao(M, info)}
      <div class="ef-faixa">Retorno de Militares após férias - Observações Gerais</div>
      <div class="ef-obs">${[1, 2, 3, 4].map((c) => `<div><div class="ef-tit">${esc(M.obs[c].titulo)}</div><div class="ef-caixa ef-texto ef-fixa">${txt(M.obs[c].texto)}</div></div>`).join('')}</div>
      <div class="ef-faixa">PBRESC - Pelotão de Busca, Resgate e Salvamento com Cães</div>
      <table class="ef-dias ef-pb">${cabDias(M, 'EQUIPE')}${pb.linhas.map((l) => `<tr><th class="ef-l ef-nome-l">${esc((l.eq ? l.eq + ') ' : '') + l.nome)}</th>${celulas(M, l.cel.map((c) => c.v))}</tr>`).join('')}</table>
      <div class="ef-duas"><div><div class="ef-tit">Prescrições Gerais do PBRESC</div><div class="ef-caixa ef-texto ef-fixa">${txt(pb.prescricoes)}</div></div>
        <div><div class="ef-tit">Observações</div><div class="ef-caixa ef-texto ef-fixa">${txt(pb.obs)}</div></div></div>
      ${assinatura(M)}
    </div></section>`;
  }

  function pagina3(M, info) {
    const cb = M.cobom, T = M.textos;
    const linhasT = cb.turnos.map((t, i) => `${i && i === cb.turnos.length - 1 ? `<tr class="ef-sep"><td colspan="${M.dias.length + 1}"></td></tr>` : ''}<tr><th class="ef-l">${esc(t.t)}</th>${celulas(M, t.cel)}</tr>`).join('');
    const leg = cb.legenda.map((x) => `<div class="ef-leg"><b>${esc(x.letra)}</b><span>${esc(x.nome)}</span></div>`).join('');
    const vtr = (lista) => lista.map(([iso, v]) => `<tr><td>${UI.dm(iso)}</td><td>${esc(v)}</td></tr>`).join('');
    return `<section class="ef-pag"><div class="ef-in">
      ${topoVersao(M, info)}
      <div class="ef-faixa">${esc(T.cobom)}</div>
      <table class="ef-dias ef-cb">${cabDias(M, 'DIA', 'Turno')}${linhasT}</table>
      <div class="ef-duas"><div><div class="ef-tit">Despachante / Teleatendente</div><div class="ef-caixa ef-legcb" style="grid-template-rows: repeat(${Math.max(1, Math.ceil(cb.legenda.length / 3))}, auto)">${leg}</div></div>
        <div><div class="ef-tit">Observações</div><div class="ef-caixa ef-texto ef-fixa">${txt(cb.obs)}</div></div></div>
      <div class="ef-fx">
        <div><div class="ef-faixa">${esc(T.faxinaTitulo)}</div><div class="ef-caixa ef-texto">${txt(T.faxina)}</div></div>
        <div><div class="ef-faixa">${esc(T.limpezaTitulo)}</div><div class="ef-lv"><div class="ef-caixa ef-texto">${txt(T.limpeza)}</div>
          <div class="ef-vtr"><table><tr><th colspan="2">Viaturas para limpeza – Sede</th></tr>${vtr(M.viaturas.sede)}</table>
            <table><tr><th colspan="2">Viaturas para limpeza – PEMAD/PBRESC</th></tr>${vtr(M.viaturas.pemad)}</table></div></div></div>
      </div>
      ${assinatura(M)}
    </div></section>`;
  }

  Object.assign(ESC, {
    /** HTML das 3 folhas. info = { versao, rascunho } */
    folha(M, info) { return `<div class="ef">${pagina1(M, info)}${pagina2(M, info)}${pagina3(M, info)}</div>`; },

    /** Diminui o conteúdo de cada folha que passar do tamanho A4 (precisa estar visível na página). */
    encaixa(raiz) {
      /* nome + férias/licença que não cabe na célula (o nome fica no tamanho normal e a altura da linha nunca muda):
         1º diminui a letra só do afastamento; se ainda não couber, o afastamento quebra em 2 linhas, com letra menor.
         Folga de 4% na largura: a impressão às vezes desenha o texto um pouco mais largo que a tela. */
      const r = document.createRange();
      raiz.querySelectorAll('.ef-af').forEach((af) => {
        const w = af.parentNode;
        af.classList.remove('quebra'); af.style.fontSize = '';
        const escala = w.getBoundingClientRect().width / (w.offsetWidth || 1);       // prévia reduzida na tela
        const limite = parseFloat(getComputedStyle(w).maxHeight) * escala;           // altura útil da célula
        // espaço que sobra para o afastamento ao lado do nome
        const n = w.querySelector('.ef-n'), gap = parseFloat(getComputedStyle(w).columnGap) || 0;
        const livre = () => w.getBoundingClientRect().width - n.getBoundingClientRect().width - gap * escala;
        const cabe = () => {
          r.selectNodeContents(af);
          const t = r.getBoundingClientRect();
          return t.width <= livre() * (af.classList.contains('quebra') ? 1.0 : 0.96) + 0.3 && t.height <= limite * 0.98;
        };
        if (cabe()) return;
        for (let pt = 6.3; pt >= 5.1; pt -= 0.3) { af.style.fontSize = pt.toFixed(1) + 'pt'; if (cabe()) return; }
        af.classList.add('quebra');
        for (let pt = 5.4; pt >= 3.3; pt -= 0.3) { af.style.fontSize = pt.toFixed(1) + 'pt'; if (cabe()) return; }
      });
      // quadros de texto de altura fixa (observações, prescrições): com texto demais, só a letra daquele quadro diminui
      raiz.querySelectorAll('.ef-fixa').forEach((q) => {
        q.style.fontSize = '';
        const base = parseFloat(getComputedStyle(q).fontSize) * 0.75;           // px → pt
        for (let pt = base - 0.2; q.scrollHeight > q.clientHeight + 1 && pt >= 3.6; pt -= 0.2) q.style.fontSize = pt.toFixed(1) + 'pt';
      });
      raiz.querySelectorAll('.ef-pag').forEach((p) => {
        const inn = p.querySelector('.ef-in');
        inn.style.transform = ''; inn.style.width = '';
        const cs = getComputedStyle(p);
        const alt = p.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        // reduz a escala (e alarga na mesma proporção) até a altura caber na folha
        let z = 1;
        for (let i = 0; i < 6; i++) {
          inn.style.width = 100 / z + '%';
          const h = inn.offsetHeight;
          if (h * z <= alt + 0.5) break;
          z = Math.min(z * 0.995, alt / h);
        }
        if (z < 1) inn.style.transform = `scale(${z})`; else inn.style.width = '';
      });
    },

    /** Imprime só as folhas (A4 paisagem): use "Salvar como PDF" para gerar o arquivo. */
    /** Mostra as 3 folhas em tela cheia (sem gerar PDF), com zoom: ajustar à largura, − e +. Esc ou "Fechar" sai. */
    telaCheia(M, info) {
      document.getElementById('escCheia')?.remove();
      const box = document.createElement('div');
      box.id = 'escCheia';
      box.className = 'es-cheia';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'Escala em tela cheia');
      box.innerHTML = `<div class="es-cheia-bar"><b>Escala – ${esc(M.nome)}</b>
          <span class="es-cheia-z"><button type="button" class="btn sm ghost" data-z="-" aria-label="Diminuir" title="Diminuir">−</button><span id="ecZ">100%</span><button type="button" class="btn sm ghost" data-z="+" aria-label="Aumentar" title="Aumentar">+</button>
            <button type="button" class="btn sm ghost" data-z="largura" title="Ajustar à largura da tela">Largura</button><button type="button" class="btn sm ghost" data-z="folha" title="Uma folha inteira na tela">Folha inteira</button></span>
          <button type="button" class="btn sm" id="ecFechar">${ICON('x')}<span>Fechar</span></button></div>
        <div class="es-cheia-c"><div class="es-cheia-w">${ESC.folha(M, info)}</div></div>`;
      document.body.appendChild(box);
      document.documentElement.classList.add('es-cheia-on');
      const c = box.querySelector('.es-cheia-c'), w = box.querySelector('.es-cheia-w'), ef = w.querySelector('.ef');
      let modo = 'largura', s = 1;
      const aplica = () => {
        ef.style.transform = '';
        const pag = ef.querySelector('.ef-pag');
        if (modo === 'largura') s = (c.clientWidth - 32) / ef.offsetWidth;
        else if (modo === 'folha') s = Math.min((c.clientWidth - 32) / ef.offsetWidth, (c.clientHeight - 24) / pag.offsetHeight);
        s = Math.max(0.2, Math.min(4, s));
        ef.style.transform = `scale(${s})`;
        w.style.width = ef.offsetWidth * s + 'px';
        w.style.height = ef.offsetHeight * s + 'px';
        box.querySelector('#ecZ').textContent = Math.round(s * 100) + '%';
      };
      ESC.encaixa(ef);
      aplica();
      const img = ef.querySelector('img'); if (img && !img.complete) img.addEventListener('load', () => { ESC.encaixa(ef); aplica(); });
      box.querySelectorAll('[data-z]').forEach((b) => (b.onclick = () => {
        const z = b.dataset.z;
        if (z === '+' || z === '-') { modo = 'livre'; s *= z === '+' ? 1.2 : 1 / 1.2; } else modo = z;
        aplica();
      }));
      const redimensiona = () => { if (modo !== 'livre') aplica(); };
      window.addEventListener('resize', redimensiona);
      const tecla = (e) => { if (e.key === 'Escape' && !document.fullscreenElement) fecha(); };
      document.addEventListener('keydown', tecla);
      // Esc na tela cheia do navegador sai dela: fecha a visualização junto (um Esc só)
      let cheio = false;
      const mudouTela = () => { if (document.fullscreenElement === box) cheio = true; else if (cheio) fecha(); else aplica(); };
      document.addEventListener('fullscreenchange', mudouTela);
      function fecha() {
        window.removeEventListener('resize', redimensiona);
        document.removeEventListener('keydown', tecla);
        document.removeEventListener('fullscreenchange', mudouTela);
        document.documentElement.classList.remove('es-cheia-on');
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        box.remove();
      }
      box.querySelector('#ecFechar').onclick = fecha;
      // tela cheia de verdade (esconde as barras do navegador), quando o navegador deixa
      if (box.requestFullscreen) box.requestFullscreen().then(() => setTimeout(() => { if (modo !== 'livre') aplica(); }, 150)).catch(() => {});
    },

    imprimir(M, info) {
      document.getElementById('escPrint')?.remove();
      const box = document.createElement('div');
      box.id = 'escPrint';
      box.innerHTML = ESC.folha(M, info);
      document.body.appendChild(box);
      const pag = document.createElement('style');
      pag.id = 'escPagina';
      pag.textContent = '@page { size: A4 landscape; margin: 0; }';
      document.head.appendChild(pag);
      document.body.classList.add('imprimindo-escala');
      const fim = () => { document.body.classList.remove('imprimindo-escala'); box.remove(); pag.remove(); window.removeEventListener('afterprint', fim); };
      window.addEventListener('afterprint', fim);
      // espera o brasão carregar e encaixa as folhas antes de abrir a impressão
      const img = box.querySelector('img');
      const vai = () => { ESC.encaixa(box); setTimeout(() => window.print(), 50); };
      if (img && !img.complete) { img.onload = img.onerror = vai; } else vai();
    },
  });
})();
