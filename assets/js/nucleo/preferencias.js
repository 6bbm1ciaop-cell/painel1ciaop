/* ==========================================================================
   NÚCLEO › PREFERÊNCIAS GUARDADAS NESTE NAVEGADOR (window.PREFS)
   Único ponto do painel que usa o localStorage. Se o navegador bloquear o
   armazenamento (janela anônima, política da empresa), tudo continua
   funcionando: as leituras devolvem o valor padrão e as gravações são ignoradas.

   Chaves usadas (todas começam com "painel-"):
     tema, ajuste, grupos, trilho, ultima ........ casca do app (app/*.js)
     geral-cal, cal-resumo, dc-lista, dd-consol .. painéis recolhíveis das telas
     fp-cal, fp-diaadia, fp-quadros .............. Férias por período
     fd-cal, fd-tab, fd-obm ...................... Férias por data
     he-ordem .................................... ordem dos quadros de Horas excedentes
     colunas-emb ................................. colunas de embarcação escolhidas à mão
     empenhos-v1 ................................. lançamentos dos Empenhos ainda não gravados e Observações
     semanas-v1 .................................. semanas gravadas (só sem o Apps Script 4.4)
     escala-rasc-v1 .............................. Escala mensal: alterações ainda não gravadas
     escalas-v1 .................................. Escala mensal: versões gravadas (só sem o Apps Script 4.5)
                                                    (só no modo demonstração/arquivo)
   ========================================================================== */
(function () {
  const PREFIXO = 'painel-';

  const PREFS = {
    /** Texto guardado na chave (ou "padrao" se não houver). */
    ler(chave, padrao = null) {
      try {
        const v = localStorage.getItem(PREFIXO + chave);
        return v == null ? padrao : v;
      } catch (e) {
        return padrao;
      }
    },

    /** Guarda um texto; valor vazio, null ou undefined apaga a chave. */
    gravar(chave, valor) {
      try {
        if (valor === '' || valor == null) localStorage.removeItem(PREFIXO + chave);
        else localStorage.setItem(PREFIXO + chave, String(valor));
      } catch (e) {
        /* sem armazenamento: ignora */
      }
    },

    /** Liga/desliga guardado como '1' / '0'. Sem nada guardado, devolve "padrao". */
    ligado(chave, padrao = false) {
      const v = PREFS.ler(chave);
      return v == null ? padrao : v === '1';
    },
    // guarda liga/desliga como "1"/"0"
    marcar(chave, ligado) {
      PREFS.gravar(chave, ligado ? '1' : '0');
    },

    /** Objeto/lista guardado em JSON (ou "padrao" se não houver ou estiver corrompido). */
    lerJSON(chave, padrao) {
      try {
        const v = PREFS.ler(chave);
        return v == null ? padrao : JSON.parse(v) ?? padrao;
      } catch (e) {
        return padrao;
      }
    },
    // guarda objeto/lista em JSON (null apaga)
    gravarJSON(chave, valor) {
      PREFS.gravar(chave, valor == null ? null : JSON.stringify(valor));
    },
  };

  window.PREFS = PREFS;
})();
