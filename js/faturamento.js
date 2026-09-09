/**
 * Vettore Finances - Faturamento do Cliente v1.9.35.0
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

// ========== IMPORTAÇÃO DE PDF (Parser Robusto v1.9.35.0) ==========
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
  statusEl.textContent = '⏳ Analisando PDF...';

  try {
    const arrayBuffer = await file.arrayBuffer();
    const resultado = await ParserExtratos.processar(arrayBuffer);

    if (!resultado.sucesso) {
      statusEl.textContent = `❌ Erro ao ler PDF: ${resultado.erro}`;
      return;
    }

    const { banco, mes, ano, agencia, conta, linhas } = resultado;

    if (linhas.length === 0) {
      statusEl.textContent = `⚠️ Nenhuma linha foi reconhecida no PDF. Adicione manualmente.`;
      return;
    }

    // 1. Atualizar select de ano
    const selectAno = document.getElementById('selectAnoFaturamento');
    selectAno.value = ano;

    // 2. Atualizar botões de mês
    const btns = document.querySelectorAll('#mesesTabsFaturamento .sub-tab-btn');
    btns.forEach((btn, idx) => {
      btn.classList.remove('active');
      if (idx === mes - 1) btn.classList.add('active');
    });
    FATURAMENTO_MES_ATUAL = mes;

    // 3. Atualizar dados da conta no cliente
    await atualizarDadosContaCliente(agencia, conta, banco);

    // 4. Salvar linhas no BD
    const linhasParaSalvar = linhas.map(l => ({
      unidade_id: unidadeAtivaCliente,
      cliente_tipo: FATURAMENTO_CLIENTE_ATUAL.tipo,
      cliente_id: FATURAMENTO_CLIENTE_ATUAL.id,
      ano,
      mes,
      data: l.data,
      banco,
      classificacao: l.classificacao,
      plano_contas: null,
      descricao: l.descricao,
      tipo: null,
      entrada: l.entrada,
      saida: l.saida
    }));

    for (const linha of linhasParaSalvar) {
      await SupabaseAPI.insert('faturamento_lancamentos', linha);
    }

    // 5. Recarregar e exibir linhas
    await carregarMesFaturamento();

    statusEl.textContent = `✅ ${linhas.length} linha(s) importada(s) | ${banco} | ${mes}/${ano}`;
    statusEl.style.color = 'var(--destaque)';

  } catch (error) {
    console.error('❌ Erro ao processar PDF:', error);
    statusEl.textContent = `❌ Erro: ${error.message}`;
  }
}

async function atualizarDadosContaCliente(agencia, conta, banco) {
  if (!agencia && !conta) return;

  const tabela = FATURAMENTO_CLIENTE_ATUAL.tipo === 'PF' ? 'clientes_pf' : 'clientes_pj';
  const dados = {};
  if (agencia) dados.agencia = agencia;
  if (conta) dados.conta = conta;
  if (banco) dados.banco = banco;

  try {
    await SupabaseAPI.update(tabela, FATURAMENTO_CLIENTE_ATUAL.id, dados);
  } catch (e) {
    console.warn('⚠️ Não atualizou dados da conta:', e);
  }
}
