/**
 * Vettore Finances - Geração de Documentos v1.9.42.0
 * Preenche modelos de documento (Configuração > Contrato) com dados reais do cliente
 */

// ========== CÁLCULO PROPORCIONAL MEI (regra do dia 15) ==========
const NOMES_MESES_MEI = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function calcularLimitesMEI(dataContratoISO) {
  if (!dataContratoISO) return null;

  const [anoStr, mesStr, diaStr] = dataContratoISO.split('-');
  const ano = parseInt(anoStr);
  const mes = parseInt(mesStr);
  const dia = parseInt(diaStr);

  const mesInicioContagem = mes; // mês de abertura conta inteiro (LC 123/2006, art. 18-A) — sem corte por dia

  if (mesInicioContagem > 12) {
    return {
      mesesRestantes: 0,
      limiteReceitasProporcional: 0,
      limiteComprasProporcional: 0,
      periodoLabel: 'Nenhum mês restante neste ano',
      dataInicioPeriodo: `${ano + 1}-01-01`
    };
  }

  const mesesRestantes = 12 - mesInicioContagem + 1;
  const limiteReceitasProporcional = 6750 * mesesRestantes;
  const limiteComprasProporcional = 5400 * mesesRestantes;
  const nomeMesInicio = NOMES_MESES_MEI[mesInicioContagem - 1];

  return {
    mesesRestantes,
    limiteReceitasProporcional,
    limiteComprasProporcional,
    periodoLabel: `${nomeMesInicio} e Dezembro de ${ano}`,
    dataInicioPeriodo: `${ano}-${String(mesInicioContagem).padStart(2, '0')}-01`
  };
}

function formatarMoedaSimples(valor) {
  return parseFloat(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
function estadoExtenso(uf) {
  const estados = {
    AC:'Acre', AL:'Alagoas', AP:'Amapá', AM:'Amazonas', BA:'Bahia', CE:'Ceará', DF:'Distrito Federal',
    ES:'Espírito Santo', GO:'Goiás', MA:'Maranhão', MT:'Mato Grosso', MS:'Mato Grosso do Sul',
    MG:'Minas Gerais', PA:'Pará', PB:'Paraíba', PR:'Paraná', PE:'Pernambuco', PI:'Piauí',
    RJ:'Rio de Janeiro', RN:'Rio Grande do Norte', RS:'Rio Grande do Sul', RO:'Rondônia',
    RR:'Roraima', SC:'Santa Catarina', SP:'São Paulo', SE:'Sergipe', TO:'Tocantins'
  };
  return estados[(uf || '').toUpperCase()] || uf || '-';
}

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

  // Cálculo proporcional MEI
  const limitesMEI = calcularLimitesMEI(pj.data_contrato) || {
    mesesRestantes: 12, limiteReceitasProporcional: 81000, limiteComprasProporcional: 64800,
    periodoLabel: 'Janeiro e Dezembro de ' + hoje.getFullYear(), dataInicioPeriodo: `${hoje.getFullYear()}-01-01`
  };

  const todosExtratosMovimento = (await SupabaseAPI.get('extratos')).filter(e => e.unidade_id === pj.unidade_id && e.cliente === pj.razao_social);
  const todosBoletosMovimento = (await SupabaseAPI.get('boletos')).filter(b => b.unidade_id === pj.unidade_id && b.cliente === pj.razao_social);

  const receitasExtrato = todosExtratosMovimento
    .filter(e => parseFloat(e.valor) > 0 && e.data >= limitesMEI.dataInicioPeriodo)
    .reduce((soma, e) => soma + parseFloat(e.valor), 0);
  const receitasBoleto = todosBoletosMovimento
    .filter(b => (b.situacao || '').toUpperCase().includes('LIQUIDADO') && b.data_vencimento >= limitesMEI.dataInicioPeriodo)
    .reduce((soma, b) => soma + parseFloat(b.valor), 0);
  const receitasRealizadas = receitasExtrato + receitasBoleto;


  return {
    franquia_nome: unidade?.nomefranquia || '-',
    data_hora_geracao: hoje.toLocaleString('pt-BR'),
    data_atual_extenso: formatarDataExtensoDoc(hoje),
    cidade_estado_franquia: `${unidade?.cidade || '-'}/${estadoExtenso(unidade?.estado)}`,
    cidade_franquia: unidade?.cidade || '-',
    estado_franquia_extenso: estadoExtenso(unidade?.estado),
    razao_social: pj.razao_social || '',
    endereco_empresa: enderecoEmpresa || '-',
    cnpj: pj.cnpj || '-',
    cnae: pj.cnae || '-',
    capital_social: pj.capital_social || '-',
    senha_gov: pj.senha_gov || '-',
    observacoes: pj.observacoes || '-',
    porte_regime_natureza: [pj.porte, pj.regime_tributario, pj.natureza_juridica].filter(Boolean).join(' - ') || '-',
    nome_representante: pf?.nome || '-',
    cpf_representante: pf?.cpf || '-',
    nacionalidade_representante: pf?.nacionalidade || '-',
    estado_civil_representante: pf?.estado_civil || '-',
    profissao_representante: pf?.profissao || '-',
    telefone_representante: pf?.telefone || '-',
    email_representante: pf?.email || '-',
    data_nascimento_representante: pf?.data_nascimento ? formatarDataBRDoc(pf.data_nascimento) : '-',
    endereco_representante: pf?.endereco || '-',
    servicos_titulo: servicosTitulo,
    mei_periodo_label: limitesMEI.periodoLabel,
    mei_limite_receitas_proporcional: formatarMoedaSimples(limitesMEI.limiteReceitasProporcional),
    mei_limite_compras_proporcional: formatarMoedaSimples(limitesMEI.limiteComprasProporcional),
    mei_receitas_realizadas: receitasRealizadas > 0 ? formatarMoedaSimples(receitasRealizadas) : null,
    mei_receitas_status: receitasRealizadas > 0 ? `R$ ${formatarMoedaSimples(receitasRealizadas)}` : 'Sem movimento',
    mei_compras_status: 'Sem movimento',
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
    email_contratante: pj.email || '-',
    email_contratada: unidade?.email || '-',
    whatsapp_contratante: pj.whatsapp || '-',
    whatsapp_contratada: unidade?.telefone || '-',
    cidade_data_assinatura: `${unidade?.cidade || '-'} - ${estadoExtenso(unidade?.estado)}, ${formatarDataExtensoDoc(hoje)}`,
    estado_contratada: estadoExtenso(unidade?.estado)
  };
}

function preencherModelo(conteudo, dados) {
  let resultado = conteudo;
  Object.entries(dados).forEach(([chave, valor]) => {
    resultado = resultado.split(`{{${chave}}}`).join(valor);
  });
  return resultado;
}

// ========== UI: GERAR DOCUMENTO DIRETO NO CADASTRO PJ ==========
let PJ_ID_DOCUMENTO_FORM = null;

async function popularSelectDocumentosPJForm(pjId) {
  PJ_ID_DOCUMENTO_FORM = pjId;
  const area = document.getElementById('areaDocumentosPJ');
  const select = document.getElementById('selectTipoDocumentoPJForm');
  if (!area || !select) return;

  const modelos = await SupabaseAPI.get('contrato_modelos_documentos');
  select.innerHTML = '<option value="">Selecione...</option>' +
    modelos.map(m => `<option value="${m.tipo}">${m.nome}</option>`).join('');

  area.style.display = 'block';
  document.getElementById('avisoDocumentoPJForm').style.display = 'none';
}

async function baixarDocumentoPJForm(formato) {
  const tipo = document.getElementById('selectTipoDocumentoPJForm').value;
  const aviso = document.getElementById('avisoDocumentoPJForm');
  aviso.style.display = 'none';

  if (!tipo) {
    aviso.textContent = '⚠️ Selecione um tipo de documento';
    aviso.style.display = 'block';
    return;
  }
  if (!PJ_ID_DOCUMENTO_FORM) return;

  const modelos = await SupabaseAPI.get('contrato_modelos_documentos');
  const modelo = modelos.find(m => m.tipo === tipo);

  if (!modelo || !modelo.conteudo || !modelo.conteudo.trim()) {
    aviso.textContent = '⚠️ Esse modelo ainda não tem texto cadastrado. Cadastre em Configurações > Contrato > Modelos de Documentos.';
    aviso.style.display = 'block';
    return;
  }

  const dados = await montarDadosDocumento(PJ_ID_DOCUMENTO_FORM);
  const textoFinal = preencherModelo(modelo.conteudo, dados);
  const nomeArquivo = `${modelo.nome} - ${dados.razao_social}`.replace(/[\\/:*?"<>|]/g, '');

  if (formato === 'pdf') {
    baixarComoPDF(textoFinal, modelo.nome, dados);
  } else {
    baixarComoWord(textoFinal, nomeArquivo, dados);
  }
}

async function obterAparenciaDocumento() {
  const configs = await SupabaseAPI.get('configuracoes_sistema');
  return {
    topo: configs.find(c => c.chave === 'documento_timbrado_topo')?.valor || '',
    rodape: configs.find(c => c.chave === 'documento_timbrado_rodape')?.valor || '',
    fonte: configs.find(c => c.chave === 'documento_fonte')?.valor || "'Times New Roman', serif",
    tamanho: configs.find(c => c.chave === 'documento_fonte_tamanho')?.valor || '12'
  };
}

function medirImagem(base64) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 1, height: 1 });
    img.src = base64;
  });
}

async function baixarComoPDF(texto, nomeDocumento, dados) {
  const aparencia = await obterAparenciaDocumento();
  const rodapeTexto = dados
    ? `${dados.razaosocial_contratada} — ${dados.endereco_contratada} — CNPJ: ${dados.cnpj_contratada}`
    : '';

  const PAGE_WIDTH = 595.28; // A4 em pt
  const tamanhoFonte = parseInt(aparencia.tamanho) || 12;

  let alturaTopo = 0;
  let alturaRodape = 0;

  if (aparencia.topo) {
    const dim = await medirImagem(aparencia.topo);
    alturaTopo = PAGE_WIDTH * (dim.height / dim.width);
  }
  if (aparencia.rodape) {
    const dim = await medirImagem(aparencia.rodape);
    alturaRodape = PAGE_WIDTH * (dim.height / dim.width);
  }

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, alturaTopo > 0 ? alturaTopo + 15 : 40, 40, alturaRodape > 0 ? alturaRodape + 25 : 40],

    header: aparencia.topo ? {
      image: aparencia.topo,
      width: PAGE_WIDTH
    } : undefined,

    footer: aparencia.rodape ? function() {
      return {
        stack: [
          { text: rodapeTexto, alignment: 'center', fontSize: 8, bold: true, margin: [0, 0, 0, 2] },
          { image: aparencia.rodape, width: PAGE_WIDTH }
        ]
      };
    } : undefined,

    content: texto.split('\n').map((linha, i) => {
      if (i === 0) {
        return { text: linha === '' ? ' ' : linha, fontSize: 14, bold: true, alignment: 'center', margin: [0, 0, 0, 10] };
      }
      return { text: linha === '' ? ' ' : linha, fontSize: tamanhoFonte, margin: [0, 0, 0, 2] };
    }),

    defaultStyle: {
      font: 'Roboto'
    }
  };

  pdfMake.createPdf(docDefinition).download(`${nomeDocumento}.pdf`);
}

async function base64ParaUint8Array(base64DataUrl) {
  const res = await fetch(base64DataUrl);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

function extensaoImagem(base64DataUrl) {
  const m = base64DataUrl.match(/^data:image\/(\w+);/);
  const ext = m ? m[1].toLowerCase() : 'png';
  if (ext === 'jpeg') return 'jpg';
  return ext; // 'png', 'jpg', 'gif', 'bmp'
}

function nomeFontePlano(fonteCss) {
  return (fonteCss || 'Times New Roman').split(',')[0].replace(/'/g, '').trim();
}

async function baixarComoWord(texto, nomeArquivo, dados) {
  const aparencia = await obterAparenciaDocumento();
  const rodapeTexto = dados
    ? `${dados.razaosocial_contratada} — ${dados.endereco_contratada} — CNPJ: ${dados.cnpj_contratada}`
    : '';

  const PAGE_WIDTH_PX = 750; // largura útil aproximada (A4, margens padrão, 96dpi)
  const fonteNome = nomeFontePlano(aparencia.fonte);
  const tamanhoMeioPontos = (parseInt(aparencia.tamanho) || 12) * 2; // docx usa "half-points"

  const headerChildren = [];
  if (aparencia.topo) {
    const bytes = await base64ParaUint8Array(aparencia.topo);
    const dim = await medirImagem(aparencia.topo);
    const altura = PAGE_WIDTH_PX * (dim.height / dim.width);
    headerChildren.push(new docx.Paragraph({
      children: [new docx.ImageRun({
        data: bytes,
        type: extensaoImagem(aparencia.topo),
        transformation: { width: PAGE_WIDTH_PX, height: altura }
      })]
    }));
  }

  const footerChildren = [];
  if (aparencia.rodape) {
    footerChildren.push(new docx.Paragraph({
      alignment: docx.AlignmentType.CENTER,
      children: [new docx.TextRun({ text: rodapeTexto, size: 16, font: fonteNome, bold: true })]
    }));
    const bytes = await base64ParaUint8Array(aparencia.rodape);
    const dim = await medirImagem(aparencia.rodape);
    const altura = PAGE_WIDTH_PX * (dim.height / dim.width);
    footerChildren.push(new docx.Paragraph({
      children: [new docx.ImageRun({
        data: bytes,
        type: extensaoImagem(aparencia.rodape),
        transformation: { width: PAGE_WIDTH_PX, height: altura }
      })]
    }));
  }

  const corpoParagrafos = texto.split('\n').map((linha, i) => {
    if (i === 0) {
      return new docx.Paragraph({
        alignment: docx.AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new docx.TextRun({ text: linha, font: fonteNome, size: 28, bold: true })]
      });
    }
    return new docx.Paragraph({
      children: [new docx.TextRun({ text: linha, font: fonteNome, size: tamanhoMeioPontos })]
    });
  });

  const doc = new docx.Document({
    sections: [{
      headers: aparencia.topo ? { default: new docx.Header({ children: headerChildren }) } : undefined,
      footers: aparencia.rodape ? { default: new docx.Footer({ children: footerChildren }) } : undefined,
      children: corpoParagrafos
    }]
  });

  const blob = await docx.Packer.toBlob(doc);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${nomeArquivo}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
  DADOS_DOCUMENTO_ATUAL = dados;
  const textoFinal = preencherModelo(modelo.conteudo, dados);
  const nomeArquivoWord = `${modelo.nome} - ${dados.razao_social}`.replace(/[\\/:*?"<>|]/g, '');

  document.getElementById('resultadoDocumentoGerado').innerHTML = `
    <div style="border:1px solid var(--linha); border-radius:6px; padding:20px; background:white; max-height:500px; overflow-y:auto; white-space:pre-wrap; font-family:'IBM Plex Mono', monospace; font-size:12px; line-height:1.6;" id="textoDocumentoGerado">${textoFinal.replace(/</g, '&lt;')}</div>
    <div style="display:flex; gap:8px; margin-top:12px;">
      <button class="btn-primary" onclick="imprimirDocumentoGerado('${modelo.nome.replace(/'/g, "\\'")}')">🖨️ Gerar PDF / Imprimir</button>
      <button class="btn-primary" onclick="baixarComoWord(document.getElementById('textoDocumentoGerado').innerText, '${nomeArquivoWord.replace(/'/g, "\\'")}', DADOS_DOCUMENTO_ATUAL)">📝 Baixar Word</button>
      <button class="btn-danger" onclick="copiarDocumentoGerado()">📋 Copiar Texto</button>
    </div>
  `;
}

function copiarDocumentoGerado() {
  const texto = document.getElementById('textoDocumentoGerado').innerText;
  navigator.clipboard.writeText(texto).then(() => alert('✅ Texto copiado!'));
}

let DADOS_DOCUMENTO_ATUAL = null;

function imprimirDocumentoGerado(nomeDocumento) {
  const texto = document.getElementById('textoDocumentoGerado').innerText;
  baixarComoPDF(texto, nomeDocumento, DADOS_DOCUMENTO_ATUAL);
}
