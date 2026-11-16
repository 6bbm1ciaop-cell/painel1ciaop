/* ==========================================================================
   NORMALIZADOR — LICENÇAS E DISPENSAS
   Converte as linhas da planilha ({ "TÍTULO DA COLUNA": valor }) para o
   formato interno do painel. Chamado por DS.aplicar() em dados/ds.js.
   ========================================================================== */
(function () {
  const { parse, vazio, leitor, dataISO, int, txt, titulo } = DADOS.util;

  /* LICENÇAS E DISPENSAS — planilha "LICENÇAS E DISPENSAS POR MOTIVO DE SAÚDE – 6º BBM 1ª CIA. OPERACIONAL (respostas)",
     aba LICENÇASDISPENSAS: NÚMERO DE BM | NOME DO MILITAR | POSTO/GRADUAÇÃO | OBM | LICENÇA OU DISPENSA |
     DATA DE INÍCIO/TÉRMINO DA LICENÇA/DISPENSA | DIAS… (TOTAL) | ITENS DA DISPENSA | APÓS TÉRMINO… | Nº DA ATA
     Também aceita o modelo simples: NÚMERO DE BM | TIPO | DATA INÍCIO | DATA FINAL | DIAS | PUBLICAÇÃO */
  DADOS.NORM.licencas = function (linhas, ctx) {
    const c = leitor(linhas);
    // itens da dispensa: separa "XIX – tiro, XX – uso e manuseio de armamento" e completa numerais soltos ("XII") com a descrição vista em outras respostas
    const RX_ITEM = /,\s*(?=[IVXL]{1,6}\s*(?:[–\-:(]|,|$))/;
    const desc = new Map();
    const itensDe = (v) => txt(v).split(/\s*[;\n]\s*/).flatMap((p) => p.split(RX_ITEM)).map((x) => x.trim().replace(/\s+/g, ' ').replace(/[.;,]$/, '')).filter(Boolean);
    linhas.forEach((r) => itensDe(c(r, 'ITENS DA DISPENSA', '~ITENS')).forEach((it) => {
      const m = it.match(/^([IVXL]{1,6})\s*[–-]\s*([^:]+?)(?::|$)/); if (m && !desc.has(m[1])) desc.set(m[1], m[2].trim());
    }));
    const completa = (it) => {
      const m = it.match(/^([IVXL]{1,6})\s*(\(.*\))?$/i);
      return m && desc.has(m[1].toUpperCase()) ? `${m[1].toUpperCase()} – ${desc.get(m[1].toUpperCase())}${m[2] ? ' ' + m[2].replace(/\s+/g, '') : ''}` : it;
    };
    return linhas.map((r, i) => {
      const bm = c(r, 'NÚMERO DE BM', 'Nº BM'), nome = c(r, 'NOME DO MILITAR', 'NOME DE GUERRA');
      const tipo = txt(c(r, 'LICENÇA OU DISPENSA', 'TIPO', 'MOTIVO')).replace(/\s+/g, ' ');
      // a coluna encontrada primeiro pode estar vazia nesta linha: tenta as alternativas uma a uma
      const um = (...nomes) => { for (const n of nomes) { const v = c(r, n); if (!vazio(v)) return v; } return ''; };
      const inicio = dataISO(um('DATA DE INÍCIO DA LICENÇA/DISPENSA', 'DATA DE INÍCIO DA DISPENSA', 'DATA INÍCIO', 'INÍCIO'));
      const fim = dataISO(um('DATA DE TÉRMINO DA LICENÇA/DISPENSA', 'DATA DE TÉRMINO DA DISPENSA', 'DATA FINAL', 'TÉRMINO', 'FIM'));
      if ((vazio(bm) && vazio(nome)) || !inicio) { if (!vazio(bm) || !vazio(nome)) ctx.aviso('licenças', i); return null; }
      const m = ctx.acha(bm, nome) || ctx.avulso({ nBM: bm, posto: c(r, 'POSTO/GRADUAÇÃO'), nome, guerra: '', obm: c(r, 'OBM') }, 'licencas');
      const dispensa = /DISPENS/i.test(tipo);
      const itens = itensDe(c(r, 'ITENS DA DISPENSA', '~ITENS')).map(completa).filter((x) => dispensa || !/^(outro|licen[cç]a)$/i.test(x));
      return {
        id: 'l' + i, militar: m.id, tipo: titulo(tipo || 'Licença'), categoria: dispensa ? 'Dispensa' : 'Licença',
        inicio, fim: fim || inicio,
        dias: int(um('DIAS DE LICENÇA/DISPENSA (TOTAL)', 'DIAS DE DISPENSA (TOTAL)', 'DIAS')) || Math.round((parse(fim || inicio) - parse(inicio)) / 864e5) + 1,
        itens, aposTermino: txt(um('APÓS TÉRMINO DA LICENÇA/DISPENSA', 'APÓS TÉRMINO')),
        ata: txt(um('Nº DA ATA', 'NÚMERO DA ATA DE DISPENSA', 'NÚMERO DA ATA DE LICENÇA')).replace(/\.0+$/, ''),
        documento: txt(c(r, 'PUBLICAÇÃO', 'DOCUMENTO', 'BI')), obmTxt: txt(c(r, 'OBM')),
      };
    }).filter(Boolean)
      // mesmo militar, mesmo tipo e mesmas datas lançado mais de uma vez no formulário: vale só a resposta mais recente
      .reduceRight((acc, l) => {
        const k = [l.militar, l.categoria, l.inicio, l.fim].join('|');
        if (!acc.vistos.has(k)) { acc.vistos.add(k); acc.lista.unshift(l); } else ctx.licRepetidas = (ctx.licRepetidas || 0) + 1;
        return acc;
      }, { vistos: new Set(), lista: [] }).lista;
  };
})();
