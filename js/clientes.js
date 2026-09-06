/**
 * Vettore Finances - Módulo Clientes (PF/PJ) v1.9.4.0
 * Lista unificada com filtros + modal de cadastro/edição
 */

let unidadeAtivaCliente = null;
let PF_CACHE = [];
let PJ_CACHE = [];
let palavrasChaveAtuais = [];
let pfVinculadosAtuais = [];
let pjVinculadosAtuais = [];

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

    const user = JSON.parse(localStorage.getItem('currentUser'));
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
    if (elUserName && !window.location.pathname.includes('configuracao')) {
      elUserName.textContent = `${franquia?.nomefranquia || ''} - ${user.nome}`;
    }

    await carregarListaUnificada();
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

async function trocarFranquiaCliente() {
  unidadeAtivaCliente = parseInt(document.getElementById('franquiaFilterCliente').value);
  await carregarListaUnificada();
  await carregarSituacaoClientes();
}

function switchTabClienteLista(tab) {
  document.getElementById('tabListaClientes').classList.toggle('active', tab === 'lista');
  document.getElementById('tabSituacaoClientes').classList.toggle('active', tab === 'situacao');
  document.querySelectorAll('.sub-tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && tab === 'lista') || (i === 1 && tab === 'situacao'));
  });
  if (tab === 'situacao') carregarSituacaoClientes();
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

async function carregarSituacaoClientes() {
  const tbody = document.getElementById('tbodySituacaoClientes');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--tinta-40);">Calculando...</td></tr>';

  const todosPj = (await SupabaseAPI.get('clientes_pj')).filter(pj => pj.unidade_id === unidadeAtivaCliente);
  const todosBoletos = (await SupabaseAPI.get('boletos')).filter(b => b.unidade_id === unidadeAtivaCliente);

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
    const mesesPagos = new Set(boletosDoCliente.map(b => b.data_vencimento.slice(0, 7)));

    const mesesEmAberto = mesesEsperados.filter(m => !mesesPagos.has(m));

    if (mesesEmAberto.length > 0) {
      devedores.push({
        cliente: pj.razao_social,
        meses: mesesEmAberto,
        valorTotal: mesesEmAberto.length * parseFloat(pj.valor_contrato || 0)
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
  const pj = PJ_CACHE.map(j => ({
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
      await SupabaseAPI.update('clientes_pf', parseInt(id), dados);
      pfId = parseInt(id);
    } else {
      const inserido = await SupabaseAPI.insert('clientes_pf', dados);
      pfId = inserido[0]?.id;
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
  document.getElementById('pfEmail').value = p.email || '';
  document.getElementById('pfObservacoes').value = p.observacoes || '';

  await popularVinculosPJnoFormPF();
}

function limparFormularioPF() {
  document.getElementById('pfId').value = '';
  ['pfNome','pfDataNascimento','pfNacionalidade','pfEstadoCivil','pfProfissao','pfCPF','pfEndereco','pfEstado',
   'pfTelefone','pfMunicipio','pfSenhaGov','pfEmail','pfObservacoes']
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
    razao_social: document.getElementById('pjRazaoSocial').value.trim(),
    cnpj: document.getElementById('pjCNPJ').value.trim() || null,
    segmento: document.getElementById('pjSegmento').value.trim() || null,
    porte: document.getElementById('pjPorte').value.trim() || null,
    regime_tributario: document.getElementById('pjRegimeTributario').value.trim() || null,
    natureza_juridica: document.getElementById('pjNaturezaJuridica').value.trim() || null,
    cnae: document.getElementById('pjCNAE').value.trim() || null,
    capital_social: document.getElementById('pjCapitalSocial').value.trim() || null,
    senha_gov: document.getElementById('pjSenhaGov').value.trim() || null,
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
      await SupabaseAPI.update('clientes_pj', parseInt(id), dados);
      pjId = parseInt(id);
    } else {
      const inserido = await SupabaseAPI.insert('clientes_pj', dados);
      pjId = inserido[0]?.id;
    }

    await salvarVinculosPJ(pjId);
    await salvarPalavrasChavePJ(pjId);

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
  document.getElementById('pjDataContrato').value = j.data_contrato || '';
  document.getElementById('pjInicioCobranca').value = j.inicio_cobranca ? j.inicio_cobranca.slice(0, 7) : '';
  document.getElementById('pjFinalContrato').value = j.final_contrato ? j.final_contrato.slice(0, 7) : '';
  document.getElementById('pjRazaoSocial').value = j.razao_social || '';
  document.getElementById('pjCNPJ').value = j.cnpj || '';
  document.getElementById('pjSegmento').value = j.segmento || '';
  document.getElementById('pjPorte').value = j.porte || '';
  document.getElementById('pjRegimeTributario').value = j.regime_tributario || '';
  document.getElementById('pjNaturezaJuridica').value = j.natureza_juridica || '';
  document.getElementById('pjCNAE').value = j.cnae || '';
  document.getElementById('pjCapitalSocial').value = j.capital_social || '';
  document.getElementById('pjSenhaGov').value = j.senha_gov || '';
  document.getElementById('pjEnderecoEmpresa').value = j.endereco_empresa || '';
  document.getElementById('pjEstadoEmpresa').value = j.estado_empresa || '';
  document.getElementById('pjMunicipioEmpresa').value = j.municipio_empresa || '';
  document.getElementById('pjObservacoes').value = j.observacoes || '';

  await popularVinculosPFnoFormPJ();

  const parametros = await SupabaseAPI.get('clientes_parametros');
  palavrasChaveAtuais = parametros.filter(p => p.pj_id === j.id).map(p => p.palavra_chave);
  renderizarChipsPalavraChave();
}

function limparFormularioPJ() {
  document.getElementById('pjId').value = '';
  ['pjDataContrato','pjInicioCobranca','pjFinalContrato','pjRazaoSocial','pjCNPJ','pjSegmento','pjPorte','pjRegimeTributario','pjNaturezaJuridica','pjCNAE',
   'pjCapitalSocial','pjSenhaGov','pjEnderecoEmpresa','pjEstadoEmpresa','pjMunicipioEmpresa','pjObservacoes']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  pfVinculadosAtuais = [];
  atualizarSelectPFParaVincular();
  renderizarChipsPFVinculadas();
  palavrasChaveAtuais = [];
  renderizarChipsPalavraChave();
}

async function deletarPJ(id) {
  if (!confirm('Deletar esta Pessoa Jurídica? Vínculos com PF também serão removidos.')) return;
  await SupabaseAPI.delete('clientes_pj', id);
  await carregarListaUnificada();
  alert('✅ Pessoa Jurídica deletada!');
}

// Nota: inicializarClientes() é chamado explicitamente por quem inclui este script
