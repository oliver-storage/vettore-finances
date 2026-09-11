/**
 * Vettore Finances - Módulo Clientes (PF/PJ) v1.9.74.0
 * Lista unificada com filtros + modal de cadastro/edição
 */

let unidadeAtivaCliente = null;
let PF_CACHE = [];
let PJ_CACHE = [];
let palavrasChaveAtuais = [];
let valoresPorAnoAtuais = [];
let pfVinculadosAtuais = [];
let pjVinculadosAtuais = [];
let servicosContratadosAtuais = [];
let CONTRATO_OBRIGACOES_CACHE = [];
const SECOES_SERVICO = ['Fiscal', 'Contábil', 'Departamento Pessoal'];

function adicionarPalavraChaveTemp() {
  const input = document.getElementById('inputNovaPalavraChave');
  const valor = input.value.trim().toUpperCase();
  if (!valor) return;
  if (palavrasChaveAtuais.includes(valor)) {
    alert('⚠️ Esta palavra-chave já foi adicionada');
    return;
  }
  palavrasChaveAtuais.push(valor);
  input.value = '';
  renderizarChipsPalavraChave();
}

function removerPalavraChaveTemp(valor) {
  palavrasChaveAtuais = palavrasChaveAtuais.filter(p => p !== valor);
  renderizarChipsPalavraChave();
}

function renderizarChipsPalavraChave() {
  const container = document.getElementById('chipsPalavrasChave');
  if (!container) return;
  container.innerHTML = palavrasChaveAtuais.map(p => `
    <div style="display:inline-flex; align-items:center; gap:6px; background:var(--papel); border:1px solid var(--linha); padding:6px 10px; border-radius:16px; font-size:12px; color:var(--tinta);">
      ${p}
      <span onclick="removerPalavraChaveTemp('${p}')" style="cursor:pointer; color:var(--alerta); font-weight:bold;">×</span>
    </div>
  `).join('') || '<span style="color:var(--tinta-40); font-size:12px;">Nenhuma palavra-chave</span>';
}

// ========== VALORES POR ANO (HONORÁRIOS) ==========
function toggleValoresPorAno() {
  const area = document.getElementById('areaValoresPorAno');
  area.style.display = area.style.display === 'none' ? 'block' : 'none';
}

function renderizarValoresPorAno() {
  const tbody = document.getElementById('tbodyValoresPorAno');
  if (!tbody) return;

  const ordenados = [...valoresPorAnoAtuais].sort((a, b) => a.ano - b.ano);

  if (ordenados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--tinta-40); font-size:12px;">Nenhum valor por ano cadastrado</td></tr>';
    return;
  }

  tbody.innerHTML = ordenados.map(v => `
    <tr>
      <td>${v.ano}</td>
      <td>${parseFloat(v.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
      <td style="font-size:11px; color:${v.origem === 'manual' ? 'var(--marca)' : 'var(--tinta-40)'};">${v.origem === 'manual' ? 'Manual' : 'Automático'}</td>
      <td><button type="button" class="btn-danger" onclick="removerValorAno(${v.ano})" style="padding:4px 8px; font-size:11px;">×</button></td>
    </tr>
  `).join('');
}

function adicionarValorAno() {
  const ano = parseInt(document.getElementById('inputNovoAnoValor').value);
  const valorTexto = document.getElementById('inputNovoValorAno').value.trim();
  const valor = parseFloat(valorTexto.replace(/\./g, '').replace(',', '.'));

  if (!ano || isNaN(valor)) {
    alert('⚠️ Preencha Ano e Valor');
    return;
  }

  valoresPorAnoAtuais = valoresPorAnoAtuais.filter(v => v.ano !== ano);
  valoresPorAnoAtuais.push({ ano, valor, origem: 'manual' });

  document.getElementById('inputNovoAnoValor').value = '';
  document.getElementById('inputNovoValorAno').value = '';
  renderizarValoresPorAno();
}

function removerValorAno(ano) {
  valoresPorAnoAtuais = valoresPorAnoAtuais.filter(v => v.ano !== ano);
  renderizarValoresPorAno();
}

async function atualizarValoresAutomaticamente() {
  const razaoSocial = document.getElementById('pjRazaoSocial').value.trim();
  const dataContrato = document.getElementById('pjDataContrato').value;
  const inicioCobranca = document.getElementById('pjInicioCobranca').value;

  if (!razaoSocial) {
    alert('⚠️ Preencha a Razão Social primeiro');
    return;
  }

  const anoInicio = inicioCobranca ? parseInt(inicioCobranca.split('-')[0]) : (dataContrato ? parseInt(dataContrato.split('-')[0]) : null);
  if (!anoInicio) {
    alert('⚠️ Preencha Data do Contrato ou Início da Cobrança primeiro, pra saber a partir de qual ano calcular');
    return;
  }

  const anoAtual = new Date().getFullYear();
  const todosBoletos = (await SupabaseAPI.get('boletos')).filter(b => b.cliente === razaoSocial);
  const todosExtratosCliente = (await SupabaseAPI.get('extratos')).filter(e => e.cliente === razaoSocial);
  const correcoes = await SupabaseAPI.get('contrato_correcao_anual');

  for (let ano = anoInicio; ano <= anoAtual; ano++) {
    const jaTemValor = valoresPorAnoAtuais.find(v => v.ano === ano);
    if (jaTemValor) continue; // já tem valor (manual ou automático), não sobrescreve

    // 1) Buscar valor real pago nesse ano (boletos liquidados + entradas no extrato)
    const boletosDoAno = todosBoletos.filter(b =>
      (b.situacao || '').toUpperCase().includes('LIQUIDADO') &&
      b.data_liquidacao &&
      b.data_liquidacao.slice(0, 4) === String(ano)
    );
    const extratosDoAno = todosExtratosCliente.filter(e =>
      parseFloat(e.valor) > 0 &&
      e.data &&
      e.data.slice(0, 4) === String(ano)
    );

    const valoresDoAno = [
      ...boletosDoAno.map(b => parseFloat(b.valor)),
      ...extratosDoAno.map(e => parseFloat(e.valor))
    ];

    if (valoresDoAno.length > 0) {
      // Valor mais frequente pago naquele ano
      const contagem = {};
      valoresDoAno.forEach(v => {
        contagem[v] = (contagem[v] || 0) + 1;
      });
      const valorMaisFrequente = parseFloat(Object.entries(contagem).sort((a, b) => b[1] - a[1])[0][0]);
      valoresPorAnoAtuais.push({ ano, valor: valorMaisFrequente, origem: 'automatico' });
      continue;
    }

    // 2) Sem dado real: aplicar % de correção sobre o último ano conhecido
    const anoAnterior = ano - 1;
    const valorAnterior = valoresPorAnoAtuais.find(v => v.ano === anoAnterior);

    if (valorAnterior) {
      const correcaoDoAno = correcoes.find(c => c.ano === ano);
      const percentual = correcaoDoAno ? parseFloat(correcaoDoAno.percentual) : 0;
      const novoValor = valorAnterior.valor * (1 + percentual / 100);
      valoresPorAnoAtuais.push({ ano, valor: parseFloat(novoValor.toFixed(2)), origem: 'automatico' });
    }
    // Se não tem ano anterior conhecido nem boleto, deixa em aberto (não dá pra calcular)
  }

  renderizarValoresPorAno();
  alert('✅ Valores atualizados automaticamente onde foi possível calcular!');
}

async function carregarValoresPorAno(pjId) {
  const registros = await SupabaseAPI.get('valor_contrato_ano');
  valoresPorAnoAtuais = registros.filter(v => v.pj_id === pjId).map(v => ({ ano: v.ano, valor: parseFloat(v.valor), origem: v.origem }));
  renderizarValoresPorAno();
}

async function salvarValoresPorAnoPJ(pjId) {
  const existentes = await SupabaseAPI.get('valor_contrato_ano');
  const dessePj = existentes.filter(v => v.pj_id === pjId);

  for (const v of dessePj) {
    if (!valoresPorAnoAtuais.some(a => a.ano === v.ano)) {
      await SupabaseAPI.delete('valor_contrato_ano', v.id);
    }
  }

  for (const atual of valoresPorAnoAtuais) {
    const existente = dessePj.find(v => v.ano === atual.ano);
    if (existente) {
      if (parseFloat(existente.valor) !== atual.valor || existente.origem !== atual.origem) {
        await SupabaseAPI.update('valor_contrato_ano', existente.id, { valor: atual.valor, origem: atual.origem });
      }
    } else {
      await SupabaseAPI.insert('valor_contrato_ano', { pj_id: pjId, ano: atual.ano, valor: atual.valor, origem: atual.origem });
    }
  }
}

async function salvarPalavrasChavePJ(pjId) {
  const existentes = await SupabaseAPI.get('clientes_parametros');
  const dessePj = existentes.filter(p => p.pj_id === pjId);

  for (const p of dessePj) {
    if (!palavrasChaveAtuais.includes(p.palavra_chave)) {
      await SupabaseAPI.delete('clientes_parametros', p.id);
    }
  }

  const jaExistentes = dessePj.map(p => p.palavra_chave);
  for (const palavra of palavrasChaveAtuais) {
    if (!jaExistentes.includes(palavra)) {
      await SupabaseAPI.insert('clientes_parametros', { pj_id: pjId, palavra_chave: palavra });
    }
  }
}

// ========== INICIALIZAÇÃO ==========
async function inicializarClientes() {
  try {
    checkAuth();

    let user;
    try {
      user = JSON.parse(localStorage.getItem('currentUser'));
    } catch (e) {
      console.error('❌ Erro ao recuperar usuário:', e);
      checkAuth();
      return;
    }
    
    const unidades = await SupabaseAPI.get('unidades');

    if (user.perfil === 'administrador') {
      document.getElementById('grupoFranquiaCliente').style.display = '';
      const select = document.getElementById('franquiaFilterCliente');
      select.innerHTML = unidades.map(u => `<option value="${u.id}">${u.nomefranquia}</option>`).join('');
      unidadeAtivaCliente = unidades[0]?.id || null;
    } else {
      unidadeAtivaCliente = user.unidade_id;
    }

    const franquia = unidades.find(u => u.id === unidadeAtivaCliente);
    const elUserName = document.getElementById('userName');
    if (elUserName) {
      elUserName.textContent = `${franquia?.nomefranquia || 'Sistema'} - ${user.nome} (${user.perfil})`;
    }

    await carregarListaUnificada();
    await carregarDashboardCliente();
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

async function trocarFranquiaCliente() {
  unidadeAtivaCliente = parseInt(document.getElementById('franquiaFilterCliente').value);
  await carregarListaUnificada();
  await carregarSituacaoClientes();
  await carregarDashboardCliente();
}

function switchTabClienteLista(tab) {
  document.getElementById('tabListaClientes').classList.toggle('active', tab === 'lista');
  document.getElementById('tabSituacaoClientes').classList.toggle('active', tab === 'situacao');
  document.getElementById('tabExtratoCliente').classList.toggle('active', tab === 'extrato');
  document.getElementById('tabFaturamentoCliente').classList.toggle('active', tab === 'faturamento');
  document.getElementById('tabDashboardCliente').classList.toggle('active', tab === 'dashboardCliente');
  document.querySelectorAll('#subTabsPrincipalClientes > .sub-tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && tab === 'dashboardCliente') || (i === 1 && tab === 'lista') || (i === 2 && tab === 'situacao') || (i === 3 && tab === 'extrato') || (i === 4 && tab === 'faturamento'));
  });
  if (tab === 'situacao') carregarSituacaoClientes();
  if (tab === 'extrato') popularListaClientesExtrato();
  if (tab === 'faturamento') popularListaClientesFaturamento();
  if (tab === 'dashboardCliente') carregarDashboardCliente();
}

// ========== SUB ABA EXTRATO DO CLIENTE ==========
async function carregarDashboardCliente() {
  let user;
  try {
    user = JSON.parse(localStorage.getItem('currentUser'));
  } catch (e) {
    console.error('❌ Erro ao recuperar usuário:', e);
    checkAuth();
    return;
  }
  const ehGestor = user?.perfil === 'gestor';

  document.getElementById('avisoNaoGestor').style.display = ehGestor ? 'none' : 'block';

  const todas = (await SupabaseAPI.get('clientes_notificacoes')).filter(n => n.unidade_id === unidadeAtivaCliente);
  const pendentes = todas.filter(n => !n.confirmado).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const confirmadas = todas.filter(n => n.confirmado).sort((a, b) => (b.confirmado_em || '').localeCompare(a.confirmado_em || ''));

  const badge = document.getElementById('badgePendenciasDashboard');
  if (pendentes.length > 0) {
    badge.style.display = 'inline-block';
    badge.textContent = pendentes.length;
  } else {
    badge.style.display = 'none';
  }

  const nomesTipo = { novo_cadastro: '🆕 Novo Cadastro', alteracao: '✏️ Alteração', desvinculo: '🔌 Desvínculo' };

  const tbodyPend = document.getElementById('tbodyPendenciasDashboard');
  if (pendentes.length === 0) {
    tbodyPend.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--tinta-40);">Nenhuma pendência 🎉</td></tr>';
  } else {
    tbodyPend.innerHTML = pendentes.map(n => `
      <tr>
        <td style="padding:12px;">${nomesTipo[n.tipo] || n.tipo}</td>
        <td style="padding:12px;">${n.cliente_nome} <span style="font-size:11px; color:var(--tinta-40);">(${n.cliente_tipo})</span></td>
        <td style="padding:12px; font-size:12px;">${n.descricao || '-'}</td>
        <td style="padding:12px; font-size:12px;">${n.criado_por || '-'}</td>
        <td style="padding:12px; font-size:12px;">${n.created_at ? new Date(n.created_at).toLocaleString('pt-BR') : '-'}</td>
        <td style="padding:12px; text-align:center;">
          ${ehGestor
            ? `<button class="btn-primary" onclick="confirmarNotificacaoCliente(${n.id})" style="padding:6px 12px; font-size:12px;">Confirmar</button>`
            : `<span style="font-size:11px; color:var(--tinta-40);">Aguardando gestor</span>`}
        </td>
      </tr>
    `).join('');
  }

  const tbodyHist = document.getElementById('tbodyHistoricoDashboard');
  if (confirmadas.length === 0) {
    tbodyHist.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--tinta-40);">Nenhum registro ainda</td></tr>';
  } else {
    tbodyHist.innerHTML = confirmadas.slice(0, 50).map(n => `
      <tr>
        <td style="padding:12px;">${nomesTipo[n.tipo] || n.tipo}</td>
        <td style="padding:12px;">${n.cliente_nome} <span style="font-size:11px; color:var(--tinta-40);">(${n.cliente_tipo})</span></td>
        <td style="padding:12px; font-size:12px;">${n.descricao || '-'}</td>
        <td style="padding:12px; font-size:12px;">${n.confirmado_por || '-'}</td>
        <td style="padding:12px; font-size:12px;">${n.confirmado_em ? new Date(n.confirmado_em).toLocaleString('pt-BR') : '-'}</td>
      </tr>
    `).join('');
  }
}

async function confirmarNotificacaoCliente(id) {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  if (user?.perfil !== 'gestor') {
    alert('⚠️ Só um usuário com perfil "gestor" pode confirmar.');
    return;
  }

  if (!confirm('Confirmar que você tomou conhecimento disso?')) return;

  await SupabaseAPI.update('clientes_notificacoes', id, {
    confirmado: true,
    confirmado_por: user.nome,
    confirmado_em: new Date().toISOString()
  });

  await carregarDashboardCliente();
}

async function popularListaClientesExtrato() {
  const datalist = document.getElementById('listaClientesExtrato');
  const pjs = (await SupabaseAPI.get('clientes_pj')).filter(pj => pj.unidade_id === unidadeAtivaCliente);
  datalist.innerHTML = pjs.map(pj => `<option value="${pj.razao_social}">`).join('');
}

async function carregarExtratoCliente() {
  const nomeDigitado = document.getElementById('inputBuscaExtratoCliente').value.trim();
  const ficha = document.getElementById('fichaExtratoCliente');

  if (!nomeDigitado) {
    ficha.style.display = 'none';
    return;
  }

  const pjs = (await SupabaseAPI.get('clientes_pj')).filter(pj => pj.unidade_id === unidadeAtivaCliente);
  const pj = pjs.find(p => p.razao_social === nomeDigitado);

  if (!pj) {
    ficha.style.display = 'none';
    return;
  }

  ficha.style.display = 'block';
  ficha.dataset.pjId = pj.id;

  document.getElementById('nomeExtratoCliente').textContent = pj.razao_social;
  document.getElementById('dataContratoExtratoCliente').textContent = pj.data_contrato ? formatarDataBR(pj.data_contrato) : '-';
  document.getElementById('inicioCobrancaExtratoCliente').textContent = pj.inicio_cobranca ? formatarMesAnoExtrato(pj.inicio_cobranca) : '-';
  document.getElementById('finalContratoExtratoCliente').textContent = pj.final_contrato ? formatarMesAnoExtrato(pj.final_contrato) : 'Sem data final';

  // Calcular status (mesma lógica da Situação)
  const todosBoletos = (await SupabaseAPI.get('boletos')).filter(b => b.unidade_id === unidadeAtivaCliente);
  const boletosDoCliente = todosBoletos.filter(b => b.cliente === pj.razao_social);
  const todosExtratosStatus = (await SupabaseAPI.get('extratos')).filter(e => e.unidade_id === unidadeAtivaCliente);
  const extratosDoClienteStatus = todosExtratosStatus.filter(e => e.cliente === pj.razao_social);

  const statusEl = document.getElementById('statusExtratoCliente');
  let mesesEmAbertoGlobal = [];
  let valoresAnoDoClienteGlobal = [];

  if (pj.inicio_cobranca && pj.valor_contrato) {
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const inicioStr = pj.inicio_cobranca.slice(0, 7);
    const fimStr = pj.final_contrato ? pj.final_contrato.slice(0, 7) : mesAtual;
    const mesesEsperados = gerarMesesEntre(inicioStr, fimStr);

    const mesesPagos = new Set([
      ...boletosDoCliente
        .filter(b => (b.situacao || '').toUpperCase().includes('LIQUIDADO') && b.data_vencimento)
        .map(b => b.data_vencimento.slice(0, 7)),
      ...extratosDoClienteStatus
        .filter(e => parseFloat(e.valor) > 0 && e.data)
        .map(e => e.data.slice(0, 7))
    ]);

    const mesesEmAberto = mesesEsperados.filter(m => !mesesPagos.has(m));
    mesesEmAbertoGlobal = mesesEmAberto;
    valoresAnoDoClienteGlobal = (await SupabaseAPI.get('valor_contrato_ano')).filter(v => v.pj_id === pj.id);

    if (mesesEmAberto.length > 0) {
      const valorTotal = mesesEmAberto.reduce((soma, mes) => soma + obterValorAnoParaMes(mes, valoresAnoDoClienteGlobal, pj.valor_contrato), 0);
      const valorFormatado = valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      statusEl.innerHTML = `⚠️ Em Aberto (${mesesEmAberto.length} mês/meses) — <span style="color:var(--alerta);">${valorFormatado}</span>`;
      statusEl.style.color = 'var(--alerta)';

      document.getElementById('linhaMesesEmAbertoCliente').style.display = 'block';
      document.getElementById('mesesEmAbertoExtratoCliente').textContent = mesesEmAberto.map(formatarMesAnoExtrato).join(', ');
    } else {
      statusEl.textContent = '✅ Pago em dia';
      statusEl.style.color = 'var(--destaque)';
      document.getElementById('linhaMesesEmAbertoCliente').style.display = 'none';
    }
  } else {
    statusEl.textContent = 'Sem dados suficientes (falta Início da Cobrança ou Valor do Contrato)';
    statusEl.style.color = 'var(--tinta-40)';
    document.getElementById('linhaMesesEmAbertoCliente').style.display = 'none';
  }

  // Tabela de movimentação completa (Boletos + Extratos)
  const todosExtratos = (await SupabaseAPI.get('extratos')).filter(e => e.unidade_id === unidadeAtivaCliente);
  const extratosDoCliente = todosExtratos.filter(e => e.cliente === pj.razao_social);

  const movimentacoes = [
    ...boletosDoCliente.map(b => ({
      origem: 'Boleto',
      data: b.data_vencimento,
      descricao: b.pagador || '-',
      valor: b.valor,
      situacao: b.situacao || '-',
      liquidado: (b.situacao || '').toUpperCase().includes('LIQUIDADO')
    })),
    ...extratosDoCliente.map(e => ({
      origem: 'Extrato',
      data: e.data,
      descricao: e.descricao || '-',
      valor: e.valor,
      situacao: e.valor >= 0 ? 'Entrada' : 'Saída',
      liquidado: e.valor >= 0
    })),
    ...mesesEmAbertoGlobal.map(mes => ({
      origem: '-',
      data: `${mes}-01`,
      descricao: `Mensalidade ${formatarMesAnoExtrato(mes)}`,
      valor: obterValorAnoParaMes(mes, valoresAnoDoClienteGlobal, pj.valor_contrato),
      situacao: 'ABERTO',
      liquidado: false,
      aberto: true
    }))
  ];

  movimentacoes.sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  const tbody = document.getElementById('tbodyExtratoCliente');
  if (movimentacoes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--tinta-40);">Nenhuma movimentação encontrada pra esse cliente</td></tr>';
    return;
  }

  tbody.innerHTML = movimentacoes.map(m => {
    const corSituacao = m.aberto ? 'var(--alerta)' : (m.liquidado ? 'var(--destaque)' : 'var(--alerta)');
    const corOrigem = m.origem === 'Boleto' ? 'var(--marca)' : (m.origem === 'Extrato' ? 'var(--tinta-70)' : 'var(--tinta-40)');
    return `
      <tr style="${m.aberto ? 'background:#FFF5F0;' : ''}">
        <td style="padding:12px; color:${corOrigem}; font-weight:600; font-size:12px;">${m.origem}</td>
        <td style="padding:12px;">${formatarDataBR(m.data)}</td>
        <td style="padding:12px;">${m.descricao}</td>
        <td style="padding:12px; text-align:right;">${formatarValorBRCliente(m.valor)}</td>
        <td style="padding:12px; color:${corSituacao}; font-weight:600;">${m.situacao}</td>
      </tr>
    `;
  }).join('');
}

function formatarDataBR(iso) {
  if (!iso) return '-';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarMesAnoExtrato(iso) {
  if (!iso) return '-';
  const [ano, mes] = iso.split('-');
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${nomes[parseInt(mes) - 1]}/${ano}`;
}

function formatarValorBRCliente(valor) {
  if (valor === null || valor === undefined) return '-';
  return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function editarClienteExtrato() {
  const ficha = document.getElementById('fichaExtratoCliente');
  const pjId = parseInt(ficha.dataset.pjId);
  if (!pjId) return;
  editarClienteLista('PJ', pjId);
}

function gerarMesesEntre(inicioStr, fimStr) {
  const meses = [];
  const [anoIni, mesIni] = inicioStr.split('-').map(Number);
  const [anoFim, mesFim] = fimStr.split('-').map(Number);
  let ano = anoIni, mes = mesIni;
  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    meses.push(`${ano}-${String(mes).padStart(2, '0')}`);
    mes++;
    if (mes > 12) { mes = 1; ano++; }
  }
  return meses;
}

function formatarMesAno(mesStr) {
  const [ano, mes] = mesStr.split('-');
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${nomes[parseInt(mes) - 1]}/${ano.slice(2)}`;
}

function obterValorAnoParaMes(mesStr, valoresAnoDoCliente, valorContratoFallback) {
  const ano = parseInt(mesStr.split('-')[0]);
  const registro = valoresAnoDoCliente.find(v => v.ano === ano);
  if (registro) return parseFloat(registro.valor);
  return parseFloat(valorContratoFallback || 0);
}

async function carregarSituacaoClientes() {
  const tbody = document.getElementById('tbodySituacaoClientes');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--tinta-40);">Calculando...</td></tr>';

  const todosPj = (await SupabaseAPI.get('clientes_pj')).filter(pj => pj.unidade_id === unidadeAtivaCliente);
  const todosBoletos = (await SupabaseAPI.get('boletos')).filter(b => b.unidade_id === unidadeAtivaCliente);
  const todosExtratos = (await SupabaseAPI.get('extratos')).filter(e => e.unidade_id === unidadeAtivaCliente);
  const todosValoresAno = await SupabaseAPI.get('valor_contrato_ano');

  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const devedores = [];
  let clientesAtivos = 0;
  let clientesInadimplentes = 0;

  for (const pj of todosPj) {
    if (!pj.inicio_cobranca) continue;

    // Cliente ativo: hoje está entre início da cobrança e final do contrato (ou sem final = sempre ativo)
    const ativo = pj.inicio_cobranca <= hojeStr && (!pj.final_contrato || pj.final_contrato >= hojeStr);
    if (ativo) clientesAtivos++;

    if (!pj.valor_contrato) continue;

    const inicioStr = pj.inicio_cobranca.slice(0, 7);
    const fimStr = pj.final_contrato ? pj.final_contrato.slice(0, 7) : mesAtual;

    const mesesEsperados = gerarMesesEntre(inicioStr, fimStr);

    const boletosDoCliente = todosBoletos.filter(b =>
      b.cliente === pj.razao_social &&
      (b.situacao || '').toUpperCase().includes('LIQUIDADO') &&
      b.data_vencimento
    );
    const extratosDoCliente = todosExtratos.filter(e =>
      e.cliente === pj.razao_social &&
      parseFloat(e.valor) > 0 &&
      e.data
    );
    const mesesPagos = new Set([
      ...boletosDoCliente.map(b => b.data_vencimento.slice(0, 7)),
      ...extratosDoCliente.map(e => e.data.slice(0, 7))
    ]);

    const mesesEmAberto = mesesEsperados.filter(m => !mesesPagos.has(m));

    if (mesesEmAberto.length > 0) {
      const valoresAnoDoCliente = todosValoresAno.filter(v => v.pj_id === pj.id);
      const valorTotal = mesesEmAberto.reduce((soma, mes) => soma + obterValorAnoParaMes(mes, valoresAnoDoCliente, pj.valor_contrato), 0);
      devedores.push({
        cliente: pj.razao_social,
        meses: mesesEmAberto,
        valorTotal
      });
      if (ativo) clientesInadimplentes++;
    }
  }

  const indice = clientesAtivos > 0 ? ((clientesInadimplentes / clientesAtivos) * 100).toFixed(1) : '0.0';
  document.getElementById('cardClientesAtivos').textContent = clientesAtivos;
  document.getElementById('cardClientesInadimplentes').textContent = clientesInadimplentes;
  document.getElementById('cardIndiceInadimplencia').textContent = `${indice}%`;

  if (devedores.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--tinta-40);">Nenhum cliente devedor 🎉</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  devedores.forEach(d => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--linha)';
    tr.innerHTML = `
      <td style="padding:12px;">${d.cliente}</td>
      <td style="padding:12px; font-size:12px;">${d.meses.map(formatarMesAno).join(', ')}</td>
      <td style="padding:12px; text-align:center; color:var(--alerta); font-weight:600;">${d.meses.length}</td>
      <td style="padding:12px; text-align:right; color:var(--alerta); font-weight:600;">${d.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ========== MODAL ==========
function abrirModalNovoCadastro() {
  document.getElementById('modalCliente').style.display = 'flex';
  document.getElementById('modalEscolhaTipo').style.display = 'none';
  document.getElementById('modalFormPF').style.display = 'none';
  document.getElementById('modalFormPJ').style.display = 'block';
  limparFormularioPF();
  limparFormularioPJ();
  popularVinculosPFnoFormPJ();
  popularDropdownsPJ();
}

async function escolherTipoCadastro(tipo) {
  document.getElementById('modalEscolhaTipo').style.display = 'none';
  if (tipo === 'pf') {
    document.getElementById('modalFormPF').style.display = 'block';
    await popularVinculosPJnoFormPF();
  } else {
    document.getElementById('modalFormPJ').style.display = 'block';
    await popularVinculosPFnoFormPJ();
  }
}

function fecharModalCliente() {
  document.getElementById('modalCliente').style.display = 'none';
}

async function mostrarFormPF() {
  document.getElementById('modalFormPJ').style.display = 'none';
  document.getElementById('modalFormPF').style.display = 'block';
  await popularVinculosPJnoFormPF();
}

async function mostrarFormPJ() {
  document.getElementById('modalFormPF').style.display = 'none';
  document.getElementById('modalFormPJ').style.display = 'block';
  await popularVinculosPFnoFormPJ();
  await popularDropdownsPJ();
}

async function popularDropdownsPJ() {
  const [portes, segmentos, regimes] = await Promise.all([
    SupabaseAPI.get('cliente_portes'),
    SupabaseAPI.get('cliente_segmentos'),
    SupabaseAPI.get('cliente_regimes_tributarios')
  ]);

  const valorAtualPorte = document.getElementById('pjPorte').value;
  const valorAtualSegmento = document.getElementById('pjSegmento').value;
  const valorAtualRegime = document.getElementById('pjRegimeTributario').value;

  document.getElementById('pjPorte').innerHTML = '<option value="">Selecione...</option>' +
    portes.map(p => `<option value="${p.nome}">${p.nome}</option>`).join('');
  document.getElementById('pjSegmento').innerHTML = '<option value="">Selecione...</option>' +
    segmentos.map(s => `<option value="${s.nome}">${s.nome}</option>`).join('');
  document.getElementById('pjRegimeTributario').innerHTML = '<option value="">Selecione...</option>' +
    regimes.map(r => `<option value="${r.nome}">${r.nome}</option>`).join('');

  if (valorAtualPorte) document.getElementById('pjPorte').value = valorAtualPorte;
  if (valorAtualSegmento) document.getElementById('pjSegmento').value = valorAtualSegmento;
  if (valorAtualRegime) document.getElementById('pjRegimeTributario').value = valorAtualRegime;
}

// ========== LISTA UNIFICADA ==========
async function carregarListaUnificada() {
  const todosPF = await SupabaseAPI.get('clientes_pf');
  const todosPJ = await SupabaseAPI.get('clientes_pj');

  PF_CACHE = todosPF.filter(p => p.unidade_id === unidadeAtivaCliente);
  PJ_CACHE = todosPJ.filter(j => j.unidade_id === unidadeAtivaCliente);

  aplicarFiltrosLista();
}

function montarListaCombinada() {
  const pf = PF_CACHE.map(p => ({
    tipo: 'PF',
    id: p.id,
    nome: p.nome,
    documento: p.cpf || '',
    telefone: p.telefone || '',
    municipio: p.municipio || ''
  }));
  const pj = PJ_CACHE.filter(j => j.ativo !== false).map(j => ({
    tipo: 'PJ',
    id: j.id,
    nome: j.razao_social,
    documento: j.cnpj || '',
    telefone: j.telefone_representante || '',
    municipio: j.municipio_empresa || ''
  }));
  return [...pf, ...pj];
}

function aplicarFiltrosLista() {
  const filtroTipo = document.getElementById('filtroTipo')?.value || '';
  const filtroNome = (document.getElementById('filtroNome')?.value || '').toUpperCase();
  const filtroDocumento = (document.getElementById('filtroDocumento')?.value || '').toUpperCase();
  const filtroTelefone = (document.getElementById('filtroTelefone')?.value || '').toUpperCase();
  const filtroMunicipio = (document.getElementById('filtroMunicipio')?.value || '').toUpperCase();

  let lista = montarListaCombinada();

  if (filtroTipo) lista = lista.filter(c => c.tipo === filtroTipo);
  if (filtroNome) lista = lista.filter(c => c.nome.toUpperCase().includes(filtroNome));
  if (filtroDocumento) lista = lista.filter(c => c.documento.toUpperCase().includes(filtroDocumento));
  if (filtroTelefone) lista = lista.filter(c => c.telefone.toUpperCase().includes(filtroTelefone));
  if (filtroMunicipio) lista = lista.filter(c => c.municipio.toUpperCase().includes(filtroMunicipio));

  renderizarListaUnificada(lista);
}

function renderizarListaUnificada(lista) {
  const tbody = document.getElementById('tbodyClientesUnificada');
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--tinta-40);">Nenhum cliente encontrado</td></tr>';
    document.getElementById('acoesMassaClientesLista').style.display = 'none';
    document.getElementById('checkAllClientesLista').checked = false;
    return;
  }

  lista.forEach(c => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--linha)';
    tr.innerHTML = `
      <td style="width:20px; text-align:center; padding:12px 0;">
        <input type="checkbox" class="checkbox-sistema checkboxClienteLista" data-tipo="${c.tipo}" data-id="${c.id}" onchange="atualizarAcoesMassaLista()">
      </td>
      <td style="padding:12px;">${c.tipo === 'PF' ? '👤 PF' : '🏢 PJ'}</td>
      <td style="padding:12px;">${c.nome}</td>
      <td style="padding:12px;">${c.documento || '-'}</td>
      <td style="padding:12px;">${c.telefone || '-'}</td>
      <td style="padding:12px;">${c.municipio || '-'}</td>
      <td style="padding:12px; text-align:center; display:flex; gap:6px; justify-content:center;">
        <button class="action-button" onclick="editarClienteLista('${c.tipo}', ${c.id})" title="Editar">✏️</button>
        <button class="action-button delete" onclick="deletarClienteLista('${c.tipo}', ${c.id})" title="Deletar">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('acoesMassaClientesLista').style.display = 'none';
  document.getElementById('checkAllClientesLista').checked = false;
}

function atualizarAcoesMassaLista() {
  const selecionados = document.querySelectorAll('.checkboxClienteLista:checked').length;
  document.getElementById('acoesMassaClientesLista').style.display = selecionados > 0 ? 'block' : 'none';
}

function toggleAllClientesLista(checked) {
  document.querySelectorAll('.checkboxClienteLista').forEach(cb => cb.checked = checked);
  atualizarAcoesMassaLista();
}

async function deletarSelecionadosLista() {
  const itens = Array.from(document.querySelectorAll('.checkboxClienteLista:checked')).map(cb => ({
    tipo: cb.dataset.tipo,
    id: parseInt(cb.dataset.id)
  }));
  if (itens.length === 0) return;
  if (!confirm(`Deletar ${itens.length} cliente(s)?`)) return;

  await Promise.all(itens.map(item =>
    SupabaseAPI.delete(item.tipo === 'PF' ? 'clientes_pf' : 'clientes_pj', item.id)
  ));

  await carregarListaUnificada();
  alert(`✅ ${itens.length} registro(s) deletado(s)!`);
}

async function editarClienteLista(tipo, id) {
  abrirModalNovoCadastro();
  document.getElementById('modalEscolhaTipo').style.display = 'none';

  if (tipo === 'PF') {
    document.getElementById('modalFormPF').style.display = 'block';
    await editarPF(id);
  } else {
    document.getElementById('modalFormPJ').style.display = 'block';
    await editarPJ(id);
  }
}

async function deletarClienteLista(tipo, id) {
  if (tipo === 'PF') {
    await deletarPF(id);
  } else {
    await deletarPJ(id);
  }
}

// ========== PESSOA FÍSICA ==========
async function popularVinculosPJnoFormPF() {
  const container = document.getElementById('pfVinculosPJ');
  if (!container) return;
  if (PJ_CACHE.length === 0) PJ_CACHE = (await SupabaseAPI.get('clientes_pj')).filter(j => j.unidade_id === unidadeAtivaCliente);

  const pfId = document.getElementById('pfId').value;
  if (pfId) {
    const vinculos = await SupabaseAPI.get('clientes_pf_pj');
    pjVinculadosAtuais = vinculos.filter(v => v.pf_id === parseInt(pfId)).map(v => v.pj_id);
  } else {
    pjVinculadosAtuais = [];
  }

  atualizarSelectPJParaVincular();
  renderizarChipsPJVinculadas();
}

function atualizarSelectPJParaVincular() {
  const select = document.getElementById('selectPJParaVincular');
  if (!select) return;

  const disponiveis = PJ_CACHE.filter(j => !pjVinculadosAtuais.includes(j.id));
  select.innerHTML = '<option value="">Selecione uma Pessoa Jurídica...</option>' +
    disponiveis.map(j => `<option value="${j.id}">${j.razao_social}</option>`).join('');
}

function renderizarChipsPJVinculadas() {
  const container = document.getElementById('pfVinculosPJ');
  if (!container) return;

  container.innerHTML = pjVinculadosAtuais.map(id => {
    const j = PJ_CACHE.find(x => x.id === id);
    const nome = j ? j.razao_social : `#${id}`;
    return `
      <div style="display:inline-flex; align-items:center; gap:6px; background:var(--papel); border:1px solid var(--linha); padding:6px 10px; border-radius:16px; font-size:13px; color:var(--tinta);">
        ${nome}
        <span onclick="removerPJVinculado(${id})" style="cursor:pointer; color:var(--alerta); font-weight:bold;">×</span>
      </div>
    `;
  }).join('') || '<span style="color:var(--tinta-40); font-size:12px;">Nenhuma Pessoa Jurídica vinculada</span>';
}

function adicionarPJVinculado() {
  const select = document.getElementById('selectPJParaVincular');
  const pjId = parseInt(select.value);
  if (!pjId) {
    alert('⚠️ Selecione uma Pessoa Jurídica');
    return;
  }
  pjVinculadosAtuais.push(pjId);
  atualizarSelectPJParaVincular();
  renderizarChipsPJVinculadas();
}

function removerPJVinculado(id) {
  pjVinculadosAtuais = pjVinculadosAtuais.filter(x => x !== id);
  atualizarSelectPJParaVincular();
  renderizarChipsPJVinculadas();
}

// ========== NOTIFICAÇÕES DE DASHBOARD (Cadastro/Alteração/Desvínculo) ==========
async function registrarNotificacaoCliente(tipo, clienteTipo, clienteId, clienteNome, descricao) {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  await SupabaseAPI.insert('clientes_notificacoes', {
    unidade_id: unidadeAtivaCliente,
    tipo,
    cliente_tipo: clienteTipo,
    cliente_id: clienteId,
    cliente_nome: clienteNome,
    descricao,
    criado_por: user?.nome || null
  });
}

function gerarDiffCampos(antigo, novo, labels) {
  const mudancas = [];
  for (const campo in labels) {
    const valorAntigo = antigo?.[campo] ?? '';
    const valorNovo = novo?.[campo] ?? '';
    if (String(valorAntigo) !== String(valorNovo)) {
      mudancas.push(`${labels[campo]}: "${valorAntigo || '-'}" → "${valorNovo || '-'}"`);
    }
  }
  return mudancas.join('; ');
}

const LABELS_CAMPOS_PF = {
  nome: 'Nome', data_nascimento: 'Data Nasc.', nacionalidade: 'Nacionalidade', estado_civil: 'Estado Civil',
  profissao: 'Profissão', cpf: 'CPF', endereco: 'Endereço', estado: 'Estado', telefone: 'Telefone',
  municipio: 'Município', senha_gov: 'Senha Gov', email: 'Email', banco: 'Banco', agencia: 'Agência', conta: 'Conta', observacoes: 'Observações'
};

const LABELS_CAMPOS_PJ = {
  razao_social: 'Razão Social', email: 'E-mail', whatsapp: 'WhatsApp', cnpj: 'CNPJ', segmento: 'Segmento', porte: 'Porte',
  regime_tributario: 'Regime Tributário', natureza_juridica: 'Natureza Jurídica', cnae: 'CNAE',
  capital_social: 'Capital Social', senha_gov: 'Senha Gov', banco: 'Banco', agencia: 'Agência', conta: 'Conta', endereco_empresa: 'Endereço Empresa',
  estado_empresa: 'Estado Empresa', municipio_empresa: 'Município Empresa', observacoes: 'Observações',
  data_contrato: 'Data do Contrato', inicio_cobranca: 'Início da Cobrança', final_contrato: 'Final do Contrato',
  valor_contrato: 'Valor do Contrato'
};

async function desvincularClientePJ() {
  const id = parseInt(document.getElementById('pjId').value);
  if (!id) return;

  const razaoSocial = document.getElementById('pjRazaoSocial').value.trim();

  if (!confirm(`Tem certeza que quer desvincular "${razaoSocial}"? O cliente será marcado como inativo e sumirá da lista ativa. Isso precisará de confirmação do gestor.`)) return;

  await SupabaseAPI.update('clientes_pj', id, { ativo: false });
  await registrarNotificacaoCliente('desvinculo', 'PJ', id, razaoSocial, 'Cliente desvinculado (marcado como inativo)');

  alert('✅ Cliente desvinculado. Aguardando confirmação do gestor no Dashboard.');
  fecharModalCliente();
  await carregarListaUnificada();
}

async function salvarPF(event) {
  event.preventDefault();

  const id = document.getElementById('pfId').value;
  const dados = {
    unidade_id: unidadeAtivaCliente,
    nome: document.getElementById('pfNome').value.trim(),
    data_nascimento: document.getElementById('pfDataNascimento').value || null,
    nacionalidade: document.getElementById('pfNacionalidade').value.trim() || null,
    estado_civil: document.getElementById('pfEstadoCivil').value || null,
    profissao: document.getElementById('pfProfissao').value.trim() || null,
    cpf: document.getElementById('pfCPF').value.trim() || null,
    endereco: document.getElementById('pfEndereco').value.trim() || null,
    estado: document.getElementById('pfEstado').value.trim().toUpperCase() || null,
    telefone: document.getElementById('pfTelefone').value.trim() || null,
    municipio: document.getElementById('pfMunicipio').value.trim() || null,
    senha_gov: document.getElementById('pfSenhaGov').value.trim() || null,
    banco: document.getElementById('pfBanco').value.trim() || null,
    agencia: document.getElementById('pfAgencia').value.trim() || null,
    conta: document.getElementById('pfConta').value.trim() || null,
    email: document.getElementById('pfEmail').value.trim() || null,
    observacoes: document.getElementById('pfObservacoes').value.trim() || null
  };

  if (!dados.nome) {
    alert('⚠️ Preencha o Nome');
    return;
  }
  if (!unidadeAtivaCliente) {
    alert('⚠️ Selecione uma franquia');
    return;
  }

  try {
    let pfId;
    if (id) {
      const antigo = (await SupabaseAPI.get('clientes_pf')).find(p => p.id === parseInt(id));
      await SupabaseAPI.update('clientes_pf', parseInt(id), dados);
      pfId = parseInt(id);

      const diff = gerarDiffCampos(antigo, dados, LABELS_CAMPOS_PF);
      if (diff) {
        await registrarNotificacaoCliente('alteracao', 'PF', pfId, dados.nome, diff);
      }
    } else {
      const inserido = await SupabaseAPI.insert('clientes_pf', dados);
      pfId = inserido[0]?.id;
      await registrarNotificacaoCliente('novo_cadastro', 'PF', pfId, dados.nome, 'Novo cadastro de Pessoa Física');
    }

    await salvarVinculosPF(pfId);

    alert(id ? '✅ Pessoa Física atualizada!' : '✅ Pessoa Física cadastrada!');
    limparFormularioPF();
    fecharModalCliente();
    await carregarListaUnificada();
  } catch (error) {
    console.error('❌ Erro ao salvar PF:', error);
    alert('❌ Erro ao salvar Pessoa Física');
  }
}

async function salvarVinculosPF(pfId) {
  const marcadosIds = pjVinculadosAtuais;

  const vinculosAtuais = await SupabaseAPI.get('clientes_pf_pj');
  const vinculosDessePF = vinculosAtuais.filter(v => v.pf_id === pfId);

  for (const v of vinculosDessePF) {
    if (!marcadosIds.includes(v.pj_id)) {
      await SupabaseAPI.delete('clientes_pf_pj', v.id);
    }
  }

  const jaVinculadosIds = vinculosDessePF.map(v => v.pj_id);
  for (const pjId of marcadosIds) {
    if (!jaVinculadosIds.includes(pjId)) {
      await SupabaseAPI.insert('clientes_pf_pj', { pf_id: pfId, pj_id: pjId });
    }
  }
}

async function editarPF(id) {
  const p = PF_CACHE.find(x => x.id === id) || (await SupabaseAPI.get('clientes_pf')).find(x => x.id === id);
  if (!p) return;

  document.getElementById('pfId').value = p.id;
  document.getElementById('pfNome').value = p.nome || '';
  document.getElementById('pfDataNascimento').value = p.data_nascimento || '';
  document.getElementById('pfNacionalidade').value = p.nacionalidade || '';
  document.getElementById('pfEstadoCivil').value = p.estado_civil || '';
  document.getElementById('pfProfissao').value = p.profissao || '';
  document.getElementById('pfCPF').value = p.cpf || '';
  document.getElementById('pfEndereco').value = p.endereco || '';
  document.getElementById('pfEstado').value = p.estado || '';
  document.getElementById('pfTelefone').value = p.telefone || '';
  document.getElementById('pfMunicipio').value = p.municipio || '';
  document.getElementById('pfSenhaGov').value = p.senha_gov || '';
  document.getElementById('pfBanco').value = p.banco || '';
  document.getElementById('pfAgencia').value = p.agencia || '';
  document.getElementById('pfConta').value = p.conta || '';
  document.getElementById('pfEmail').value = p.email || '';
  document.getElementById('pfObservacoes').value = p.observacoes || '';

  await popularVinculosPJnoFormPF();
}

function limparFormularioPF() {
  document.getElementById('pfId').value = '';
  ['pfNome','pfDataNascimento','pfNacionalidade','pfEstadoCivil','pfProfissao','pfCPF','pfEndereco','pfEstado',
   'pfTelefone','pfMunicipio','pfSenhaGov','pfEmail','pfBanco','pfAgencia','pfConta','pfObservacoes']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  pjVinculadosAtuais = [];
  atualizarSelectPJParaVincular();
  renderizarChipsPJVinculadas();
}

async function deletarPF(id) {
  if (!confirm('Deletar esta Pessoa Física? Vínculos com PJ também serão removidos.')) return;
  await SupabaseAPI.delete('clientes_pf', id);
  await carregarListaUnificada();
  alert('✅ Pessoa Física deletada!');
}

// ========== PESSOA JURÍDICA ==========
function renderizarLinhasObrigacao(conteudo) {
  if (!conteudo) return '<p style="font-size:11px; color:var(--tinta-40); margin:0;">Sem obrigações cadastradas.</p>';
  const linhas = conteudo.split('\n').filter(l => l.trim());
  return '<ul style="font-size:11px; color:var(--tinta-70); line-height:1.5; margin:8px 0 0 0; padding-left:16px;">' +
    linhas.map(linha => {
      const [rotulo, ...resto] = linha.split('|');
      const texto = resto.join('|');
      return texto ? `<li><strong>${rotulo}:</strong> ${texto}</li>` : `<li>${rotulo}</li>`;
    }).join('') +
    '</ul>';
}

async function atualizarCardsServicoContratado() {
  const regime = document.getElementById('pjRegimeTributario').value;
  const container = document.getElementById('cardsServicoContratado');

  if (!regime) {
    container.innerHTML = '<p style="font-size:12px; color:var(--tinta-40);">Selecione um Regime Tributário acima pra ver as opções.</p>';
    return;
  }

  if (CONTRATO_OBRIGACOES_CACHE.length === 0) {
    CONTRATO_OBRIGACOES_CACHE = await SupabaseAPI.get('contrato_obrigacoes');
  }

  container.innerHTML = SECOES_SERVICO.map(secao => {
    const registro = CONTRATO_OBRIGACOES_CACHE.find(c => c.regime === regime && c.secao === secao);
    const marcado = servicosContratadosAtuais.includes(secao);
    return `
      <div style="border:1px solid var(--linha); border-radius:6px; padding:12px; background:${marcado ? 'var(--papel)' : 'var(--papel-alto)'};">
        <label style="display:flex; align-items:center; gap:8px; font-weight:600; font-size:13px; cursor:pointer; margin:0;">
          <input type="checkbox" class="checkbox-sistema" ${marcado ? 'checked' : ''} onchange="toggleServicoContratado('${secao}', this.checked)">
          ${secao}
        </label>
        ${renderizarLinhasObrigacao(registro?.conteudo)}
      </div>
    `;
  }).join('');
}

function toggleServicoContratado(secao, marcado) {
  if (marcado && !servicosContratadosAtuais.includes(secao)) {
    servicosContratadosAtuais.push(secao);
  } else if (!marcado) {
    servicosContratadosAtuais = servicosContratadosAtuais.filter(s => s !== secao);
  }
  atualizarCardsServicoContratado();
}

async function popularVinculosPFnoFormPJ() {
  const container = document.getElementById('pjVinculosPF');
  if (!container) return;
  if (PF_CACHE.length === 0) PF_CACHE = (await SupabaseAPI.get('clientes_pf')).filter(p => p.unidade_id === unidadeAtivaCliente);

  const pjId = document.getElementById('pjId').value;
  if (pjId) {
    const vinculos = await SupabaseAPI.get('clientes_pf_pj');
    pfVinculadosAtuais = vinculos.filter(v => v.pj_id === parseInt(pjId)).map(v => v.pf_id);
  } else {
    pfVinculadosAtuais = [];
  }

  atualizarSelectPFParaVincular();
  renderizarChipsPFVinculadas();
}

function atualizarSelectPFParaVincular() {
  const select = document.getElementById('selectPFParaVincular');
  if (!select) return;

  const disponiveis = PF_CACHE.filter(p => !pfVinculadosAtuais.includes(p.id));
  select.innerHTML = '<option value="">Selecione uma Pessoa Física...</option>' +
    disponiveis.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
}

function renderizarChipsPFVinculadas() {
  const container = document.getElementById('pjVinculosPF');
  if (!container) return;

  container.innerHTML = pfVinculadosAtuais.map(id => {
    const p = PF_CACHE.find(x => x.id === id);
    const nome = p ? p.nome : `#${id}`;
    return `
      <div style="display:inline-flex; align-items:center; gap:6px; background:var(--papel); border:1px solid var(--linha); padding:6px 10px; border-radius:16px; font-size:13px; color:var(--tinta);">
        ${nome}
        <span onclick="removerPFVinculado(${id})" style="cursor:pointer; color:var(--alerta); font-weight:bold;">×</span>
      </div>
    `;
  }).join('') || '<span style="color:var(--tinta-40); font-size:12px;">Nenhuma Pessoa Física vinculada</span>';
}

function adicionarPFVinculado() {
  const select = document.getElementById('selectPFParaVincular');
  const pfId = parseInt(select.value);
  if (!pfId) {
    alert('⚠️ Selecione uma Pessoa Física');
    return;
  }
  pfVinculadosAtuais.push(pfId);
  atualizarSelectPFParaVincular();
  renderizarChipsPFVinculadas();
}

function removerPFVinculado(id) {
  pfVinculadosAtuais = pfVinculadosAtuais.filter(x => x !== id);
  atualizarSelectPFParaVincular();
  renderizarChipsPFVinculadas();
}

async function salvarPJ(event) {
  event.preventDefault();

  const id = document.getElementById('pjId').value;
  const dados = {
    unidade_id: unidadeAtivaCliente,
    data_contrato: document.getElementById('pjDataContrato').value || null,
    inicio_cobranca: document.getElementById('pjInicioCobranca').value ? document.getElementById('pjInicioCobranca').value + '-01' : null,
    final_contrato: document.getElementById('pjFinalContrato').value ? document.getElementById('pjFinalContrato').value + '-01' : null,
    valor_contrato: document.getElementById('pjValorContrato').value.trim().replace(/\./g, '').replace(',', '.') || null,
    razao_social: document.getElementById('pjRazaoSocial').value.trim(),
    email: document.getElementById('pjEmail').value.trim() || null,
    whatsapp: document.getElementById('pjWhatsapp').value.trim() || null,
    cnpj: document.getElementById('pjCNPJ').value.trim() || null,
    segmento: document.getElementById('pjSegmento').value.trim() || null,
    porte: document.getElementById('pjPorte').value.trim() || null,
    regime_tributario: document.getElementById('pjRegimeTributario').value.trim() || null,
    servicos_contratados: servicosContratadosAtuais.length > 0 ? servicosContratadosAtuais : null,
    natureza_juridica: document.getElementById('pjNaturezaJuridica').value.trim() || null,
    cnae: document.getElementById('pjCNAE').value.trim() || null,
    capital_social: document.getElementById('pjCapitalSocial').value.trim() || null,
    senha_gov: document.getElementById('pjSenhaGov').value.trim() || null,
    banco: document.getElementById('pjBanco').value.trim() || null,
    agencia: document.getElementById('pjAgencia').value.trim() || null,
    conta: document.getElementById('pjConta').value.trim() || null,
    endereco_empresa: document.getElementById('pjEnderecoEmpresa').value.trim() || null,
    estado_empresa: document.getElementById('pjEstadoEmpresa').value.trim().toUpperCase() || null,
    municipio_empresa: document.getElementById('pjMunicipioEmpresa').value.trim() || null,
    observacoes: document.getElementById('pjObservacoes').value.trim() || null
  };

  if (!dados.razao_social) {
    alert('⚠️ Preencha a Razão Social');
    return;
  }
  if (!unidadeAtivaCliente) {
    alert('⚠️ Selecione uma franquia');
    return;
  }

  try {
    let pjId;
    if (id) {
      const antigo = (await SupabaseAPI.get('clientes_pj')).find(p => p.id === parseInt(id));
      await SupabaseAPI.update('clientes_pj', parseInt(id), dados);
      pjId = parseInt(id);

      const diff = gerarDiffCampos(antigo, dados, LABELS_CAMPOS_PJ);
      if (diff) {
        await registrarNotificacaoCliente('alteracao', 'PJ', pjId, dados.razao_social, diff);
      }
    } else {
      const inserido = await SupabaseAPI.insert('clientes_pj', dados);
      pjId = inserido[0]?.id;
      await registrarNotificacaoCliente('novo_cadastro', 'PJ', pjId, dados.razao_social, 'Novo cadastro de Pessoa Jurídica');
    }

    await salvarVinculosPJ(pjId);
    await salvarPalavrasChavePJ(pjId);
    await salvarValoresPorAnoPJ(pjId);

    if (id) {
      alert('✅ Pessoa Jurídica atualizada!');
      fecharModalCliente();
    } else {
      alert('✅ Pessoa Jurídica cadastrada! Pronto para o próximo cadastro.');
      limparFormularioPJ();
      await popularVinculosPFnoFormPJ();
    }
    await carregarListaUnificada();
  } catch (error) {
    console.error('❌ Erro ao salvar PJ:', error);
    alert('❌ Erro ao salvar Pessoa Jurídica');
  }
}

async function salvarVinculosPJ(pjId) {
  const marcadosIds = pfVinculadosAtuais;

  const vinculosAtuais = await SupabaseAPI.get('clientes_pf_pj');
  const vinculosDessePJ = vinculosAtuais.filter(v => v.pj_id === pjId);

  for (const v of vinculosDessePJ) {
    if (!marcadosIds.includes(v.pf_id)) {
      await SupabaseAPI.delete('clientes_pf_pj', v.id);
    }
  }

  const jaVinculadosIds = vinculosDessePJ.map(v => v.pf_id);
  for (const pfId of marcadosIds) {
    if (!jaVinculadosIds.includes(pfId)) {
      await SupabaseAPI.insert('clientes_pf_pj', { pf_id: pfId, pj_id: pjId });
    }
  }
}

async function editarPJ(id) {
  const j = PJ_CACHE.find(x => x.id === id) || (await SupabaseAPI.get('clientes_pj')).find(x => x.id === id);
  if (!j) return;

  await popularDropdownsPJ();

  document.getElementById('pjId').value = j.id;
  document.getElementById('btnDesvincularPJ').style.display = j.ativo === false ? 'none' : 'inline-block';
  await popularSelectDocumentosPJForm(j.id);
  document.getElementById('pjDataContrato').value = j.data_contrato || '';
  document.getElementById('pjInicioCobranca').value = j.inicio_cobranca ? j.inicio_cobranca.slice(0, 7) : '';
  document.getElementById('pjFinalContrato').value = j.final_contrato ? j.final_contrato.slice(0, 7) : '';
  if (j.valor_contrato) {
    const partes = parseFloat(j.valor_contrato).toFixed(2).split('.');
    partes[0] = partes[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    document.getElementById('pjValorContrato').value = partes[0] + ',' + partes[1];
  } else {
    document.getElementById('pjValorContrato').value = '';
  }
  document.getElementById('pjRazaoSocial').value = j.razao_social || '';
  document.getElementById('pjEmail').value = j.email || '';
  document.getElementById('pjWhatsapp').value = j.whatsapp || '';
  document.getElementById('pjCNPJ').value = j.cnpj || '';
  document.getElementById('pjSegmento').value = j.segmento || '';
  document.getElementById('pjPorte').value = j.porte || '';
  document.getElementById('pjRegimeTributario').value = j.regime_tributario || '';
  servicosContratadosAtuais = j.servicos_contratados || [];
  await atualizarCardsServicoContratado();
  document.getElementById('pjNaturezaJuridica').value = j.natureza_juridica || '';
  document.getElementById('pjCNAE').value = j.cnae || '';
  document.getElementById('pjCapitalSocial').value = j.capital_social || '';
  document.getElementById('pjSenhaGov').value = j.senha_gov || '';
  document.getElementById('pjBanco').value = j.banco || '';
  document.getElementById('pjAgencia').value = j.agencia || '';
  document.getElementById('pjConta').value = j.conta || '';
  document.getElementById('pjEnderecoEmpresa').value = j.endereco_empresa || '';
  document.getElementById('pjEstadoEmpresa').value = j.estado_empresa || '';
  document.getElementById('pjMunicipioEmpresa').value = j.municipio_empresa || '';
  document.getElementById('pjObservacoes').value = j.observacoes || '';

  await popularVinculosPFnoFormPJ();

  const parametros = await SupabaseAPI.get('clientes_parametros');
  palavrasChaveAtuais = parametros.filter(p => p.pj_id === j.id).map(p => p.palavra_chave);
  renderizarChipsPalavraChave();

  await carregarValoresPorAno(j.id);
  document.getElementById('areaValoresPorAno').style.display = 'none';
}

function limparFormularioPJ() {
  document.getElementById('btnDesvincularPJ').style.display = 'none';
  document.getElementById('areaDocumentosPJ').style.display = 'none';
  document.getElementById('pjId').value = '';
  ['pjDataContrato','pjInicioCobranca','pjFinalContrato','pjValorContrato','pjRazaoSocial','pjEmail','pjWhatsapp','pjCNPJ','pjSegmento','pjPorte','pjRegimeTributario','pjNaturezaJuridica','pjCNAE',
   'pjCapitalSocial','pjSenhaGov','pjBanco','pjAgencia','pjConta','pjEnderecoEmpresa','pjEstadoEmpresa','pjMunicipioEmpresa','pjObservacoes']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  pfVinculadosAtuais = [];
  atualizarSelectPFParaVincular();
  renderizarChipsPFVinculadas();
  palavrasChaveAtuais = [];
  renderizarChipsPalavraChave();
  servicosContratadosAtuais = [];
  atualizarCardsServicoContratado();
  valoresPorAnoAtuais = [];
  renderizarValoresPorAno();
  document.getElementById('areaValoresPorAno').style.display = 'none';
}

async function deletarPJ(id) {
  if (!confirm('Deletar esta Pessoa Jurídica? Vínculos com PF também serão removidos.')) return;
  await SupabaseAPI.delete('clientes_pj', id);
  await carregarListaUnificada();
  alert('✅ Pessoa Jurídica deletada!');
}

// Nota: inicializarClientes() é chamado explicitamente por quem inclui este script
