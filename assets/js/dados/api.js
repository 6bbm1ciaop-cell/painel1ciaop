/* ==========================================================================
   DADOS › API — comunicação com o Apps Script (back-end)
   Toda chamada ao Apps Script passa por DADOS.pedirApi({ acao, ... }).
   Sem "acao", o Apps Script devolve todas as planilhas (dados + avisos).
   Ações: login, loginGoogle, usuarios, salvarUsuario, foto, salvarRegistro… (ver apps-script/Code.gs → responder_).
   Erros saem com .codigo: CONFIG, REDE, FORMATO, NAO_AUTENTICADO, TOKEN_INVALIDO, ACESSO_NEGADO.
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;

  /** Envia um pedido ao Apps Script e devolve o JSON da resposta (lança erro se ok = false). */
  DADOS.pedirApi = async function (extra = {}) {
    if (!C.appsScriptUrl) throw Object.assign(new Error('Informe a URL do Apps Script em config.js (appsScriptUrl).'), { codigo: 'CONFIG' });
    let resp;
    try {
      // text/plain evita a verificação prévia de CORS; o Apps Script lê o corpo em doPost
      resp = await fetch(C.appsScriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ token: window.AUTH ? AUTH.token : '' }, extra)) });
    } catch (e) {
      throw Object.assign(new Error('Sem resposta do Apps Script. Confira a URL, a implantação ("Qualquer pessoa") e a conexão.'), { codigo: 'REDE' });
    }
    let j;
    try { j = await resp.json(); } catch (e) { throw Object.assign(new Error('O Apps Script não devolveu JSON. Verifique se a implantação está como "App da Web" e acesso "Qualquer pessoa".'), { codigo: 'FORMATO' }); }
    if (!j.ok) {
      const cod = String(j.erro || '').split(':')[0];
      const msg = { NAO_AUTENTICADO: 'Entre para continuar.', TOKEN_INVALIDO: 'Sua sessão expirou. Entre novamente.', ACESSO_NEGADO: `O acesso do e-mail ${String(j.erro).split(':')[1] || ''} ao painel foi retirado pelo administrador.` }[cod] || j.erro;
      throw Object.assign(new Error(msg), { codigo: cod });
    }
    if (window.AUTH) AUTH.renova();   // o Apps Script renovou a sessão
    return j;
  };
})();
