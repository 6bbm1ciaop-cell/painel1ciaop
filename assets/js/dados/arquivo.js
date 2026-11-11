/* ==========================================================================
   LEITURA DE ARQUIVO (.xlsx / .ods / .csv) NO NAVEGADOR
   Usado pela tela "Testar planilha". O arquivo não sai do computador:
   é lido aqui, convertido nas mesmas linhas que o Apps Script entrega
   ({ "TÍTULO DA COLUNA": valor }) e passado ao normalizador do efetivo.
   ========================================================================== */
(function () {
  const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  const pad = (n) => String(n).padStart(2, '0');
  let libPromise = null;

  // carrega a biblioteca de planilhas (SheetJS) só quando for usada
  function carregaLib() {
    if (window.XLSX) return Promise.resolve();
    if (!libPromise) libPromise = new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = XLSX_URL; s.async = true;
      s.onload = ok;
      s.onerror = () => {
        libPromise = null;
        falha(new Error('Não foi possível carregar o leitor de planilhas. Verifique a conexão e tente de novo.'));
      };
      document.head.appendChild(s);
    });
    return libPromise;
  }

  /* valor de uma célula no mesmo formato do Apps Script */
  function valor(cell) {
    if (!cell) return '';
    if (cell.t === 'n' && cell.z && XLSX.SSF.is_date(cell.z)) {
      const d = XLSX.SSF.parse_date_code(cell.v);
      if (!d) return '';
      if (d.y < 1901) return `${pad(d.H)}:${pad(d.M)}`;
      const data = `${d.y}-${pad(d.m)}-${pad(d.d)}`;
      return d.H || d.M || d.S ? `${data}T${pad(d.H)}:${pad(d.M)}:${pad(Math.floor(d.S))}` : data;
    }
    if (cell.t === 'n') return cell.z && /%/.test(cell.z) ? (cell.w || cell.v) : cell.v;
    if (cell.t === 'b') return cell.v ? 'SIM' : 'NÃO';
    if (cell.t === 'e') return '';
    return cell.v == null ? '' : String(cell.v);
  }

  // converte a aba em matriz de células
  function matriz(ws, maxLinhas) {
    if (!ws || !ws['!ref']) return [];
    const R = XLSX.utils.decode_range(ws['!ref']);
    const fim = maxLinhas ? Math.min(R.e.r, R.s.r + maxLinhas - 1) : R.e.r;
    const out = [];
    for (let r = R.s.r; r <= fim; r++) {
      const row = [];
      for (let c = R.s.c; c <= R.e.c; c++) row.push(valor(ws[XLSX.utils.encode_cell({ r, c })]));
      out.push(row);
    }
    return out;
  }

  const N = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

  /* linha dos títulos = a que tem mais textos entre as 10 primeiras */
  function linhaCabecalho(m) {
    let hi = 0, max = -1;
    m.slice(0, 10).forEach((r, i) => { const n = r.filter((v) => typeof v === 'string' && v.trim()).length; if (n > max) { max = n; hi = i; } });
    return hi;
  }

  /* que tipo de planilha é, pelos títulos das colunas */
  const TIPOS = [
    ['horas',   (h, aba) => /QUADRO PARA DASHBOARD/.test(N(aba)) || (h.has('HE') && h.has('NOME DE GUERRA') && h.has('OBM') && h.size <= 6)],
    ['ddqod',   (h) => h.has('ONDE') && h.has('PREVISTO')],
    ['ferias',  (h) => h.has('DATA INICIO') && h.has('DATA FINAL')],
    ['licencas', (h) => h.has('LICENCA OU DISPENSA') || (h.has('NUMERO DE BM') && [...h].some((x) => /DATA DE INICIO DA (LICENCA|DISPENSA)/.test(x)))],
    ['viaturas', (h, aba) => (h.has('PREFIXO') || h.has('VIATURA')) && h.has('PLACA') && (h.has('SITUACAO') || h.has('OBM'))],
    ['efetivo', (h) => h.has('NOME DO MILITAR') && (h.has('CARIMBO DE DATA HORA') || h.has('FOTO') || h.has('CPF') || h.has('POSTO GRADUACAO'))],
  ];
  const NOMES_TIPO = { efetivo: 'Efetivo (Respostas)', ferias: 'Férias', ddqod: 'DDQOD', horas: 'Horas excedentes', viaturas: 'Viaturas', licencas: 'Licenças e dispensas' };

  // lê um arquivo .xlsx/.ods/.csv e devolve as linhas
  async function ler(file) {
    if (!/\.(xlsx|xlsm|xls|ods|csv)$/i.test(file.name)) throw new Error('Use um arquivo .xlsx, .ods ou .csv exportado do Google Planilhas.');
    await carregaLib();
    const buf = await file.arrayBuffer();
    const csv = /\.csv$/i.test(file.name);
    const wb = csv
      ? XLSX.read(new TextDecoder('utf-8').decode(buf), { type: 'string', raw: true })
      : XLSX.read(buf, { type: 'array', cellNF: true, cellDates: false });

    // identifica cada aba pelos títulos
    const abas = wb.SheetNames.map((nome) => {
      const topo = matriz(wb.Sheets[nome], 10);
      const h = topo.length ? new Set(topo[linhaCabecalho(topo)].map(N).filter(Boolean)) : new Set();
      const t = TIPOS.find(([, f]) => f(h, nome));
      return { nome, tipo: t ? t[0] : null };
    });
    const preferidas = (window.APP_CONFIG && APP_CONFIG.abas) || {};
    // 1º a aba com o nome configurado (ex.: "PLANO ADAPTADO"); senão a primeira aba reconhecida
    let alvo = abas.find((a) => a.tipo && preferidas[a.tipo] && N(preferidas[a.tipo]) === N(a.nome))
      || abas.find((a) => Object.entries(preferidas).some(([t, n]) => N(n) === N(a.nome) && (a.tipo = t)))
      || abas.find((a) => a.tipo);
    if (!alvo) throw new Error(`Não reconheci "${file.name}". O painel aceita a planilha Respostas (efetivo), o Plano de Férias, o DDQOD, o Controle de horas, Viaturas e Licenças/dispensas.`);

    const m = matriz(wb.Sheets[alvo.nome]);
    const hi = linhaCabecalho(m);
    const cab = m[hi].map((h) => String(h).replace(/\s+/g, ' ').trim());
    const linhas = m.slice(hi + 1)
      .filter((r) => r.some((v) => v !== '' && v != null))
      .map((r) => {
        const o = {};
        cab.forEach((h, i) => { if (!h) return; const v = r[i]; if (o[h] === undefined || (v !== '' && v != null)) o[h] = v; });
        return o;
      });
    return { nome: file.name, tipo: alvo.tipo, tipoNome: NOMES_TIPO[alvo.tipo], aba: alvo.nome, linhas };
  }

  window.ARQUIVO = { ler };
})();
