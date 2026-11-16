/* ==========================================================================
   NORMALIZADOR — VIATURAS
   Converte as linhas da planilha ({ "TÍTULO DA COLUNA": valor }) para o
   formato interno do painel. Chamado por DS.aplicar() em dados/ds.js.
   ========================================================================== */
(function () {
  const { C, OBM_ORDEM, N, leitor, dataISO, int, num, txt, obmCanon } = DADOS.util;

  /* VIATURAS — planilha "VIATURAS 1ª CIA. OP", aba VIATURAS:
     OBM | TIPO (sigla: UR, ASL, ABTS…) | PREFIXO (nº: 1033) | PLACA | ANO | OBSERVAÇÕES | MARCA/MODELO | SITUAÇÃO (OK/BAIXADA) | …
     Também aceita o modelo antigo (PREFIXO "UR-1234" com a sigla junto, KM, PRÓXIMA REVISÃO, ÚLTIMA VISTORIA). */
  DADOS.NORM.viaturas = function (linhas, ctx) {
    const c = leitor(linhas);
    // nome de cada sigla: config.js → viaturas.siglas
    const SIGLAS = (C.viaturas && C.viaturas.siglas) || {};
    const quadros = (C.viaturas && C.viaturas.quadros) || [];
    const ign = []; let vazias = 0;
    const out = linhas.map((r, i) => {
      let pref = c(r, 'PREFIXO', 'VIATURA');
      pref = typeof pref === 'number' ? String(Math.round(pref)) : txt(pref).replace(/\.0+$/, '');
      const tipoCol = txt(c(r, 'TIPO')).replace(/\s+/g, ' ').toUpperCase();
      const placa = txt(c(r, 'PLACA')).replace(/\s+/g, '');
      if (!pref && !placa) { vazias++; return null; }
      // sigla: coluna TIPO quando for uma sigla; senão o começo do prefixo ("UR-1234")
      const siglaTipo = /^[A-Z]{1,5}$/.test(tipoCol) ? tipoCol : '';
      const siglaPref = (pref.match(/^([A-Za-z]{1,5})[-\s]?\d/) || [])[1];
      const sigla = siglaTipo || (siglaPref ? siglaPref.toUpperCase() : '');
      const prefixo = siglaPref ? pref.toUpperCase().replace(/^([A-Z]+)[-\s]?/, '$1 ') : (sigla ? `${sigla} ${pref}` : pref);
      const s = N(c(r, 'SITUAÇÃO', 'STATUS'));
      const obmTxt = txt(c(r, 'OBM', 'FRAÇÃO', 'LOCAL')).replace(/\s+/g, ' ');
      // OBM: nome do painel; se não for uma OBM conhecida, usa o quadro da carta de situação (ex.: "7º Pel SJE" → 7º Pel São João Ev.)
      const canon = obmCanon(obmTxt);
      const q = quadros.find((x) => (x.obms || []).includes(canon) || (x.chaves || []).some((k) => N(obmTxt).includes(N(k))));
      const obm = OBM_ORDEM.includes(canon) ? canon : q ? q.nome : canon;
      let ano = c(r, 'ANO'); ano = ano === '' || ano == null ? '' : String(int(ano) || '').slice(0, 4);
      if (!s) ign.push(i + 2);
      return { id: 'v' + i, prefixo, sigla: sigla || 'S/T', tipo: siglaTipo ? (SIGLAS[sigla] || '') : txt(c(r, 'TIPO', 'DESCRIÇÃO')) || SIGLAS[sigla] || '', placa, obm, obmTxt,
        marca: txt(c(r, 'MARCA/MODELO', 'MARCA', 'MODELO')).replace(/\s+/g, ' '),
        situacao: /BAIX|INOPER/.test(s) ? 'Baixada' : /MANUT|OFICINA/.test(s) ? 'Manutenção' : 'Operante',
        obs: txt(c(r, 'OBSERVAÇÕES', 'OBSERVAÇÃO', 'OBS')),
        km: num(c(r, 'KM', 'HODÔMETRO')), proxRevisao: num(c(r, 'PRÓXIMA REVISÃO', 'REVISÃO')), ano, ultimaVistoria: dataISO(c(r, 'ÚLTIMA VISTORIA', 'VISTORIA')) };
    }).filter(Boolean);
    if (ctx) ctx.relViaturas = { linhas: linhas.length, validas: out.length, vazias, semSituacao: ign, semTipo: out.filter((v) => v.sigla === 'S/T').map((v) => v.prefixo) };
    return out;
  };
})();
