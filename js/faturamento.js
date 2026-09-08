/**
 * Vettore Finances - Faturamento do Cliente v1.9.34.0
 */

let FATURAMENTO_CLIENTE_ATUAL = null; // { tipo: 'PF'|'PJ', id, nome }
let FATURAMENTO_MES_ATUAL = 1;
let FATURAMENTO_LINHAS_CACHE = [];

// ========== SELEÇÃO DE CLIENTE ==========
async function popularListaClientesFaturamento() {
  const datalist = document.getElementById('listaClientesFaturamento');
  if (!datalist) return;

  const pfs = (await SupabaseAPI.get('clientes_pf')).filter(p => p.unidade_id === unidadeAtivaCliente);
  const pjs = (await SupabaseAPI.get('clientes_pj')).filter(p => p.unidade_id === unidadeAtivaCliente);

  const opcoes = [
    ...pfs.map(p => `${p.nome} (PF)`),
    ...pjs.map(p => `${p.razao_social} (PJ)`)
  ];

  datalist.innerHTML = opcoes.map(o => `<option value="${o}">`).join('');
}

async function selecionarClienteFaturamento() {
  const valor = document.getElementById('inputBuscaFaturamento').value.trim();
  const area = document.getElementById('areaFaturamentoCliente');

  const matchPF = valor.match(/^(.*) \(PF\)$/);
  const matchPJ = valor.match(/^(.*) \(PJ\)$/);

  if (!matchPF && !matchPJ) {
    area.style.display = 'none';
    FATURAMENTO_CLIENTE_ATUAL = null;
    return;
  }

  if (matchPF) {
    const pfs = (await SupabaseAPI.get('clientes_pf')).filter(p => p.unidade_id === unidadeAtivaCliente);
    const pf = pfs.find(p => p.nome === matchPF[1]);
    if (!pf) { area.style.display = 'none'; return; }
    FATURAMENTO_CLIENTE_ATUAL = { tipo: 'PF', id: pf.id, nome: pf.nome };
  } else {
    const pjs = (await SupabaseAPI.get('clientes_pj')).filter(p => p.unidade_id === unidadeAtivaCliente);
    const pj = pjs.find(p => p.razao_social === matchPJ[1]);
    if (!pj) { area.style.display = 'none'; return; }
    FATURAMENTO_CLIENTE_ATUAL = { tipo: 'PJ', id: pj.id, nome: pj.razao_social };
  }

  area.style.display = 'block';

  // Popular select de Ano (últimos 3 + próximo)
  const selectAno = document.getElementById('selectAnoFaturamento');
  const anoAtual = new Date().getFullYear();
  selectAno.innerHTML = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1].map(a => `<option value="${a}">${a}</option>`).join('');
  selectAno.value = anoAtual;

  FATURAMENTO_MES_ATUAL = 1;
  document.querySelectorAll('#mesesTabsFaturamento .sub-tab-btn').forEach((btn, i) => btn.classList.toggle('active', i === 0));
  document.getElementById('conteudoMesFaturamento').style.display = 'block';
  document.getElementById('conteudoRelatorioFaturamento').style.display = 'none';

  await carregarMesFaturamento();
}

// ========== NAVEGAÇÃO ENTRE MESES ==========
function selecionarMesFaturamento(mes, btnClicado) {
  document.querySelectorAll('#mesesTabsFaturamento .sub-tab-btn').forEach(btn => btn.classList.remove('active'));
  if (btnClicado) btnClicado.classList.add('active');

  FATURAMENTO_MES_ATUAL = mes;

  if (mes === 'relatorio') {
    document.getElementById('conteudoMesFaturamento').style.display = 'none';
    document.getElementById('conteudoRelatorioFaturamento').style.display = 'block';
    return;
  }

  document.getElementById('conteudoMesFaturamento').style.display = 'block';
  document.getElementById('conteudoRelatorioFaturamento').style.display = 'none';
  carregarMesFaturamento();
}

// ========== CARREGAR/RENDERIZAR TABELA DO MÊS ==========
async function carregarMesFaturamento() {
  if (!FATURAMENTO_CLIENTE_ATUAL || FATURAMENTO_MES_ATUAL === 'relatorio') return;

  const ano = parseInt(document.getElementById('selectAnoFaturamento').value);

  const todos = await SupabaseAPI.get('faturamento_lancamentos');
  const linhas = todos.filter(l =>
    l.cliente_tipo === FATURAMENTO_CLIENTE_ATUAL.tipo &&
    l.cliente_id === FATURAMENTO_CLIENTE_ATUAL.id &&
    l.ano === ano &&
    l.mes === FATURAMENTO_MES_ATUAL
  ).sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  FATURAMENTO_LINHAS_CACHE = linhas;
  renderizarTabelaFaturamento();
}

function renderizarTabelaFaturamento() {
  const tbody = document.getElementById('tbodyFaturamentoMes');
  const TIPOS = ['PIX', 'BANCO', 'FORNECEDOR', 'IMPOSTO', 'OUTROS', 'TELEFONE/CELULAR'];

  let totalCredito = 0, totalDebito = 0;

  if (FATURAMENTO_LINHAS_CACHE.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--tinta-40);">Nenhum lançamento nesse mês. Anexe um PDF ou adicione uma linha manual.</td></tr>';
  } else {
    tbody.innerHTML = FATURAMENTO_LINHAS_CACHE.map(l => {
      totalCredito += parseFloat(l.entrada) || 0;
      totalDebito += parseFloat(l.saida) || 0;
      return `
        <tr>
          <td><input type="date" value="${l.data || ''}" onchange="atualizarLinhaFaturamento(${l.id}, 'data', this.value)"></td>
          <td><input type="text" value="${l.banco || ''}" onchange="atualizarLinhaFaturamento(${l.id}, 'banco', this.value)" style="width:100px;"></td>
          <td>
            <select onchange="atualizarLinhaFaturamento(${l.id}, 'classificacao', this.value)">
              <option value="">Selecione...</option>
              <option value="ENTRADA" ${l.classificacao === 'ENTRADA' ? 'selected' : ''}>Entrada</option>
              <option value="SAÍDA" ${l.classificacao === 'SAÍDA' ? 'selected' : ''}>Saída</option>
            </select>
          </td>
          <td><input type="text" value="${l.plano_contas || ''}" onchange="atualizarLinhaFaturamento(${l.id}, 'plano_contas', this.value)" style="width:120px;"></td>
          <td><input type="text" value="${l.descricao || ''}" onchange="atualizarLinhaFaturamento(${l.id}, 'descricao', this.value)" style="width:220px;"></td>
          <td>
            <select onchange="atualizarLinhaFaturamento(${l.id}, 'tipo', this.value)">
              <option value="">Selecione...</option>
              ${TIPOS.map(t => `<option value="${t}" ${l.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </td>
          <td><input type="text" value="${l.entrada || ''}" onchange="atualizarLinhaFaturamento(${l.id}, 'entrada', this.value)" style="width:90px; text-align:right;"></td>
          <td><input type="text" value="${l.saida || ''}" onchange="atualizarLinhaFaturamento(${l.id}, 'saida', this.value)" style="width:90px; text-align:right;"></td>
          <td style="text-align:center;"><button class="action-button delete" onclick="deletarLinhaFaturamento(${l.id})">🗑️</button></td>
        </tr>
      `;
    }).join('');
  }

  document.getElementById('cardCreditoFaturamento').textContent = totalCredito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  document.getElementById('cardDebitoFaturamento').textContent = totalDebito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function atualizarLinhaFaturamento(id, campo, valor) {
  const dados = { [campo]: valor || null };
  if (campo === 'entrada' || campo === 'saida') {
    dados[campo] = valor ? parseFloat(valor.replace(',', '.')) : null;
  }
  await SupabaseAPI.update('faturamento_lancamentos', id, dados);
  await carregarMesFaturamento();
}

async function deletarLinhaFaturamento(id) {
  if (!confirm('Deletar esse lançamento?')) return;
  await SupabaseAPI.delete('faturamento_lancamentos', id);
  await carregarMesFaturamento();
}

async function adicionarLinhaManualFaturamento() {
  if (!FATURAMENTO_CLIENTE_ATUAL) return;
  const ano = parseInt(document.getElementById('selectAnoFaturamento').value);

  await SupabaseAPI.insert('faturamento_lancamentos', {
    unidade_id: unidadeAtivaCliente,
    cliente_tipo: FATURAMENTO_CLIENTE_ATUAL.tipo,
    cliente_id: FATURAMENTO_CLIENTE_ATUAL.id,
    ano,
    mes: FATURAMENTO_MES_ATUAL,
    data: null,
    banco: null,
    classificacao: null,
    plano_contas: null,
    descricao: '',
    tipo: null,
    entrada: null,
    saida: null
  });

  await carregarMesFaturamento();
}

// ========== IMPORTAÇÃO DE PDF (best-effort, sempre revisável) ==========
async function processarPdfFaturamento(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';

  if (!FATURAMENTO_CLIENTE_ATUAL) {
    alert('⚠️ Selecione um cliente primeiro');
    return;
  }

  const statusEl = document.getElementById('statusImportacaoPdf');
  statusEl.style.display = 'block';
  statusEl.textContent = '⏳ Lendo o PDF...';

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const linhasExtraidas = [];

    for (let numPagina = 1; numPagina <= pdf.numPages; numPagina++) {
      const page = await pdf.getPage(numPagina);
      const textContent = await page.getTextContent();

      // Agrupar itens de texto por linha (mesma posição Y aproximada)
      const porLinha = {};
      textContent.items.forEach(item => {
        const y = Math.round(item.transform[5]);
        if (!porLinha[y]) porLinha[y] = [];
        porLinha[y].push(item.str);
      });

      Object.keys(porLinha)
        .sort((a, b) => b - a) // Y maior = mais acima na página
        .forEach(y => {
          const linhaTexto = porLinha[y].join(' ').replace(/\s+/g, ' ').trim();
          if (linhaTexto) linhasExtraidas.push(linhaTexto);
        });
    }

    // Tentar reconhecer Data + Valor em cada linha
    const regexData = /\b(\d{2}\/\d{2}\/\d{4})\b/;
    const regexValor = /(-?R?\$?\s?\d{1,3}(?:\.\d{3})*,\d{2})/g;

    const ano = parseInt(document.getElementById('selectAnoFaturamento').value);
    let reconhecidas = 0;
    let naoReconhecidas = 0;
    const linhasParaSalvar = [];

    linhasExtraidas.forEach(linha => {
      const matchData = linha.match(regexData);
      const matchesValor = [...linha.matchAll(regexValor)];

      if (!matchData || matchesValor.length === 0) {
        naoReconhecidas++;
        return;
      }

      const dataBR = matchData[1];
      const [dia, mes, anoData] = dataBR.split('/');
      const dataISO = `${anoData}-${mes}-${dia}`;

      const valorTexto = matchesValor[matchesValor.length - 1][0];
      const negativo = valorTexto.trim().startsWith('-');
      const valorNumero = parseFloat(valorTexto.replace(/[R$\s.]/g, '').replace(',', '.').replace('-', ''));

      if (isNaN(valorNumero) || valorNumero === 0) {
        naoReconhecidas++;
        return;
      }

      // Descrição = linha sem a data e sem o valor
      let descricao = linha.replace(matchData[0], '').replace(valorTexto, '').replace(/\s+/g, ' ').trim();

      linhasParaSalvar.push({
        unidade_id: unidadeAtivaCliente,
        cliente_tipo: FATURAMENTO_CLIENTE_ATUAL.tipo,
        cliente_id: FATURAMENTO_CLIENTE_ATUAL.id,
        ano: parseInt(anoData) || ano,
        mes: parseInt(mes),
        data: dataISO,
        banco: null,
        classificacao: negativo ? 'SAÍDA' : 'ENTRADA',
        plano_contas: null,
        descricao: descricao || '(descrição não reconhecida)',
        tipo: null,
        entrada: negativo ? null : valorNumero,
        saida: negativo ? valorNumero : null
      });
      reconhecidas++;
    });

    if (linhasParaSalvar.length === 0) {
      statusEl.textContent = `⚠️ Não consegui reconhecer nenhuma linha automaticamente nesse PDF (pode ser um PDF escaneado/imagem). Adicione as linhas manualmente.`;
      return;
    }

    for (const linha of linhasParaSalvar) {
      await SupabaseAPI.insert('faturamento_lancamentos', linha);
    }

    statusEl.textContent = `✅ ${reconhecidas} linha(s) importada(s) automaticamente. ${naoReconhecidas} linha(s) do PDF não foram reconhecidas (confira o PDF original e adicione manualmente se precisar). Revise os valores antes de fechar o mês — a extração automática pode errar.`;

    await carregarMesFaturamento();
  } catch (error) {
    console.error('❌ Erro ao processar PDF:', error);
    statusEl.textContent = `❌ Erro ao ler o PDF: ${error.message}. Tente adicionar as linhas manualmente.`;
  }
}
