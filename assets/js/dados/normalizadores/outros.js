/* ==========================================================================
   NORMALIZADOR — LANÇAMENTOS (EMPENHOS_REGISTROS) E INUNDAÇÕES
   Converte as linhas da planilha ({ "TÍTULO DA COLUNA": valor }) para o
   formato interno do painel. Chamado por DS.aplicar() em dados/ds.js.
   ========================================================================== */
(function () {
  const { parse, leitor, dataISO, int, num, txt } = DADOS.util;

  /* LANÇAMENTOS DA TABELA DE EMPENHOS — aba EMPENHOS_REGISTROS (criada pelo Apps Script) */
  DADOS.NORM.registros = function (linhas) {
    const c = leitor(linhas);
    return linhas.map((r) => ({ data: dataISO(c(r, 'DATA')), tipo: txt(c(r, 'TIPO')).toLowerCase(), bm: txt(c(r, 'BM')), militar: txt(c(r, 'MILITAR')), status: txt(c(r, 'STATUS')), obs: String(c(r, 'OBS') ?? '').trim() }))
      .filter((r) => r.data && ['status', 'reforco', 'obsdia', 'obs'].includes(r.tipo));
  };

  /* INUNDAÇÕES — modelo: ANO | DATA | COTA (m) | BAIRROS ATINGIDOS */
  DADOS.NORM.inundacoes = function (linhas) {
    const c = leitor(linhas);
    return linhas.map((r) => {
      const ano = int(c(r, 'ANO')) || (parse(dataISO(c(r, 'DATA'))) || {}).getFullYear?.(); if (!ano) return null;
      return { ano, data: dataISO(c(r, 'DATA')), cota: num(c(r, 'COTA')) || 0, bairros: int(c(r, 'BAIRROS')), obs: txt(c(r, 'OBSERVAÇÕES', 'OBS')) };
    }).filter(Boolean);
  };
})();
