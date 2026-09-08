/**
 * Vettore Finances - Geração de Documentos v1.9.24.0
 * Preenche modelos de documento (Configuração > Contrato) com dados reais do cliente
 */

// ========== VALOR POR EXTENSO (PT-BR) ==========
function valorPorExtenso(valor) {
  valor = parseFloat(valor) || 0;
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezA19 = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function tresDigitos(n) {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    let partes = [];
    const c = Math.floor(n / 100);
    const resto = n % 100;
    if (c > 0) partes.push(centenas[c]);
    if (resto > 0) {
      if (resto < 10) partes.push(unidades[resto]);
      else if (resto < 20) partes.push(dezA19[resto - 10]);
      else {
        const d = Math.floor(resto / 10);
        const u = resto % 10;
        partes.push(dezenas[d] + (u > 0 ? ' e ' + unidades[u] : ''));
      }
    }
    return partes.join(' e ');
  }

  function numeroPorExtenso(n) {
    if (n === 0) return 'zero';
    let grupos = [];
    const milhoes = Math.floor(n / 1000000);
    const milhares = Math.floor((n % 1000000) / 1000);
    const resto = n % 1000;

    if (milhoes > 0) grupos.push(tresDigitos(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões'));
    if (milhares > 0) grupos.push(tresDigitos(milhares) + ' mil');
    if (resto > 0) grupos.push(tresDigitos(resto));

    return grupos.join(' e ');
  }

  const inteiroExtenso = numeroPorExtenso(inteiro);
  const inteiroLabel = inteiro === 1 ? 'real' : 'reais';
  let resultado = `${inteiroExtenso} ${inteiroLabel}`;

  if (centavos > 0) {
    const centavosExtenso = numeroPorExtenso(centavos);
    const centavosLabel = centavos === 1 ? 'centavo' : 'centavos';
    resultado += ` e ${centavosExtenso} ${centavosLabel}`;
  }

  return resultado;
}

// ========== FORMATADORES AUXILIARES ==========
function formatarDataBRDoc(iso) {
  if (!iso) return '-';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarDataExtensoDoc(dataObj) {
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  return `${dataObj.getDate()} de ${meses[dataObj.getMonth()]} de ${dataObj.getFullYear()}`;
}

// ========== MONTAGEM DOS DADOS PARA O MERGE ==========
async function montarDadosDocumento(pjId) {
  const pj = (await SupabaseAPI.get('clientes_pj')).find(p => p.id === pjId);
  if (!pj) throw new Error('Cliente PJ não encontrado');

  const unidades = await SupabaseAPI.get('unidades');
  const unidade = unidades.find(u => u.id === pj.unidade_id);

  const vinculos = await SupabaseAPI.get('clientes_pf_pj');
  const vinculoPF = vinculos.find(v => v.pj_id === pjId);
  let pf = null;
  if (vinculoPF) {
    const todosPF = await SupabaseAPI.get('clientes_pf');
    pf = todosPF.find(p => p.id === vinculoPF.pf_id);
  }

  // Cláusula de serviços: baseada nos servicos_contratados (Fiscal/Contábil/Departamento Pessoal)
  const servicosContratados = pj.servicos_contratados || [];
  const obrigacoes = await SupabaseAPI.get('contrato_obrigacoes');

  let servicosTitulo = servicosContratados.length > 0 ? `SERVIÇO ${servicosContratados.join(' / ').toUpperCase()}` : 'SERVIÇOS CONTÁBEIS';

  let clausulaDetalhada = '';
  servicosContratados.forEach(secao => {
    const registro = obrigacoes.find(o => o.regime === pj.regime_tributario && o.secao === secao);
    const linhas = registro?.conteudo ? registro.conteudo.split('\n').filter(l => l.trim()) : [];
    const itens = linhas.map(l => {
      const [rotulo, ...resto] = l.split('|');
      const texto = resto.join('|');
      return texto ? `${rotulo}: ${texto}` : rotulo;
    }).join('; ');
    clausulaDetalhada += `${secao.toUpperCase()}: ${itens || 'A definir.'}\n\n`;
  });
  if (!clausulaDetalhada) clausulaDetalhada = 'Serviços a definir conforme regime tributário do cliente.';

  const enderecoEmpresa = [pj.endereco_empresa, pj.municipio_empresa ? `${pj.municipio_empresa}${pj.estado_empresa ? '-' + pj.estado_empresa : ''}` : null]
    .filter(Boolean).join(', ');

  const enderecoContratada = [unidade?.rua, unidade?.numero ? `Nº ${unidade.numero}` : null, unidade?.bairro, unidade?.cidade, unidade?.estado, unidade?.cep ? `CEP: ${unidade.cep}` : null]
    .filter(Boolean).join(', ');

  const valor = parseFloat(pj.valor_contrato) || 0;
  const hoje = new Date();

  return {
    razao_social: pj.razao_social || '',
    endereco_empresa: enderecoEmpresa || '-',
    cnpj: pj.cnpj || '-',
    nome_representante: pf?.nome || '-',
    cpf_representante: pf?.cpf || '-',
    servicos_titulo: servicosTitulo,
    clausula_servicos_detalhada: clausulaDetalhada.trim(),
    data_inicio_contrato: formatarDataBRDoc(pj.data_contrato),
    prazo_finalizacao: pj.final_contrato ? `Até ${formatarDataBRDoc(pj.final_contrato)}` : 'Indeterminado',
    prazo_finalizacao_lower: pj.final_contrato ? `determinado, até ${formatarDataBRDoc(pj.final_contrato)}` : 'indeterminado',
    valor_honorarios: valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    valor_honorarios_extenso: valorPorExtenso(valor),
    banco_contratada: unidade?.banco || '-',
    agencia_contratada: unidade?.agencia || '-',
    conta_contratada: unidade?.conta || '-',
    cnpj_contratada: unidade?.cnpj || '-',
    razaosocial_contratada: unidade?.razaosocial || unidade?.nomefranquia || '-',
    endereco_contratada: enderecoContratada || '-',
    cidade_contratada: unidade?.cidade || '-',
    estado_contratada: unidade?.estado || '-',
    email_contratante: pj.email || '-',
    email_contratada: unidade?.email || '-',
    whatsapp_contratante: pj.whatsapp || '-',
    whatsapp_contratada: unidade?.telefone || '-',
    cidade_data_assinatura: `${unidade?.cidade || '-'} - ${unidade?.estado || '-'}, ${formatarDataExtensoDoc(hoje)}`
  };
}

function preencherModelo(conteudo, dados) {
  let resultado = conteudo;
  Object.entries(dados).forEach(([chave, valor]) => {
    resultado = resultado.split(`{{${chave}}}`).join(valor);
  });
  return resultado;
}

// ========== UI: GERAR DOCUMENTO ==========
let PJ_ID_DOCUMENTO_ATUAL = null;

async function abrirSeletorDocumento(pjId) {
  PJ_ID_DOCUMENTO_ATUAL = pjId;
  const modelos = await SupabaseAPI.get('contrato_modelos_documentos');

  const opcoes = modelos.map(m => `<option value="${m.tipo}">${m.nome}</option>`).join('');

  const container = document.getElementById('areaGerarDocumento');
  container.innerHTML = `
    <div style="display:flex; gap:8px; align-items:flex-end;">
      <div class="form-group" style="flex:1; margin:0;">
        <label>Tipo de Documento</label>
        <select id="selectTipoDocumento">
          <option value="">Selecione...</option>
          ${opcoes}
        </select>
      </div>
      <button class="btn-primary" onclick="gerarDocumentoSelecionado()" style="padding:10px 16px;">Gerar</button>
    </div>
    <div id="resultadoDocumentoGerado" style="margin-top:16px;"></div>
  `;
  container.style.display = 'block';
}

async function gerarDocumentoSelecionado() {
  const tipo = document.getElementById('selectTipoDocumento').value;
  if (!tipo) {
    alert('⚠️ Selecione um tipo de documento');
    return;
  }
  if (!PJ_ID_DOCUMENTO_ATUAL) return;

  const modelos = await SupabaseAPI.get('contrato_modelos_documentos');
  const modelo = modelos.find(m => m.tipo === tipo);

  if (!modelo || !modelo.conteudo || !modelo.conteudo.trim()) {
    document.getElementById('resultadoDocumentoGerado').innerHTML = `
      <p style="color:var(--alerta); font-size:13px;">⚠️ Esse modelo ainda não tem texto cadastrado. Cadastre em Configuração > Contrato > Modelos de Documentos.</p>
    `;
    return;
  }

  const dados = await montarDadosDocumento(PJ_ID_DOCUMENTO_ATUAL);
  const textoFinal = preencherModelo(modelo.conteudo, dados);

  document.getElementById('resultadoDocumentoGerado').innerHTML = `
    <div style="border:1px solid var(--linha); border-radius:6px; padding:20px; background:white; max-height:500px; overflow-y:auto; white-space:pre-wrap; font-family:'IBM Plex Mono', monospace; font-size:12px; line-height:1.6;" id="textoDocumentoGerado">${textoFinal.replace(/</g, '&lt;')}</div>
    <div style="display:flex; gap:8px; margin-top:12px;">
      <button class="btn-primary" onclick="imprimirDocumentoGerado('${modelo.nome.replace(/'/g, "\\'")}')">🖨️ Gerar PDF / Imprimir</button>
      <button class="btn-danger" onclick="copiarDocumentoGerado()">📋 Copiar Texto</button>
    </div>
  `;
}

function copiarDocumentoGerado() {
  const texto = document.getElementById('textoDocumentoGerado').innerText;
  navigator.clipboard.writeText(texto).then(() => alert('✅ Texto copiado!'));
}

function imprimirDocumentoGerado(nomeDocumento) {
  const texto = document.getElementById('textoDocumentoGerado').innerText;
  const janela = window.open('', '_blank');
  janela.document.write(`
    <html>
      <head>
        <title>${nomeDocumento}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; padding: 40px; white-space: pre-wrap; }
        </style>
      </head>
      <body>${texto.replace(/</g, '&lt;')}</body>
    </html>
  `);
  janela.document.close();
  janela.focus();
  setTimeout(() => janela.print(), 300);
}
