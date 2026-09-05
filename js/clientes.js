/**
 * Vettore Finances - Módulo Clientes (PF/PJ) v1.9.4.0
 * Lista unificada com filtros + modal de cadastro/edição
 */

let unidadeAtivaCliente = null;
let PF_CACHE = [];
let PJ_CACHE = [];

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
  let vinculadosIds = [];
  if (pfId) {
    const vinculos = await SupabaseAPI.get('clientes_pf_pj');
    vinculadosIds = vinculos.filter(v => v.pf_id === parseInt(pfId)).map(v => v.pj_id);
  }

  container.innerHTML = PJ_CACHE.map(j => `
    <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:400; cursor:pointer;">
      <input type="checkbox" class="checkbox-sistema pjVinculoCheckbox" value="${j.id}" ${vinculadosIds.includes(j.id) ? 'checked' : ''}>
      ${j.razao_social}
    </label>
  `).join('') || '<span style="color:var(--tinta-40); font-size:12px;">Nenhuma PJ cadastrada ainda</span>';
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
    cnae: document.getElementById('pfCNAE').value.trim() || null,
    senha_gov: document.getElementById('pfSenhaGov').value.trim() || null,
    email: document.getElementById('pfEmail').value.trim() || null,
    capital_social: document.getElementById('pfCapitalSocial').value.trim() || null,
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

    if (id) {
      alert('✅ Pessoa Física atualizada!');
      fecharModalCliente();
    } else {
      alert('✅ Pessoa Física cadastrada! Pronto para o próximo cadastro.');
      limparFormularioPF();
      await popularVinculosPJnoFormPF();
    }
    await carregarListaUnificada();
  } catch (error) {
    console.error('❌ Erro ao salvar PF:', error);
    alert('❌ Erro ao salvar Pessoa Física');
  }
}

async function salvarVinculosPF(pfId) {
  const marcadosIds = Array.from(document.querySelectorAll('.pjVinculoCheckbox:checked')).map(cb => parseInt(cb.value));

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
  document.getElementById('pfCNAE').value = p.cnae || '';
  document.getElementById('pfSenhaGov').value = p.senha_gov || '';
  document.getElementById('pfEmail').value = p.email || '';
  document.getElementById('pfCapitalSocial').value = p.capital_social || '';
  document.getElementById('pfObservacoes').value = p.observacoes || '';

  await popularVinculosPJnoFormPF();
}

function limparFormularioPF() {
  document.getElementById('pfId').value = '';
  ['pfNome','pfDataNascimento','pfNacionalidade','pfEstadoCivil','pfProfissao','pfCPF','pfEndereco','pfEstado',
   'pfTelefone','pfMunicipio','pfCNAE','pfSenhaGov','pfEmail','pfCapitalSocial','pfObservacoes']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.querySelectorAll('.pjVinculoCheckbox').forEach(cb => cb.checked = false);
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
  let vinculadosIds = [];
  if (pjId) {
    const vinculos = await SupabaseAPI.get('clientes_pf_pj');
    vinculadosIds = vinculos.filter(v => v.pj_id === parseInt(pjId)).map(v => v.pf_id);
  }

  container.innerHTML = PF_CACHE.map(p => `
    <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:400; cursor:pointer;">
      <input type="checkbox" class="checkbox-sistema pfVinculoCheckbox" value="${p.id}" ${vinculadosIds.includes(p.id) ? 'checked' : ''}>
      ${p.nome}
    </label>
  `).join('') || '<span style="color:var(--tinta-40); font-size:12px;">Nenhuma PF cadastrada ainda</span>';
}

async function salvarPJ(event) {
  event.preventDefault();

  const id = document.getElementById('pjId').value;
  const dados = {
    unidade_id: unidadeAtivaCliente,
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
    nome_representante: document.getElementById('pjNomeRepresentante').value.trim() || null,
    data_nascimento_representante: document.getElementById('pjDataNascimentoRepresentante').value || null,
    nacionalidade_representante: document.getElementById('pjNacionalidadeRepresentante').value.trim() || null,
    estado_civil_representante: document.getElementById('pjEstadoCivilRepresentante').value || null,
    profissao_representante: document.getElementById('pjProfissaoRepresentante').value.trim() || null,
    cpf_representante: document.getElementById('pjCPFRepresentante').value.trim() || null,
    rg_representante: document.getElementById('pjRGRepresentante').value.trim() || null,
    telefone_representante: document.getElementById('pjTelefoneRepresentante').value.trim() || null,
    email_representante: document.getElementById('pjEmailRepresentante').value.trim() || null,
    endereco_representante: document.getElementById('pjEnderecoRepresentante').value.trim() || null,
    estado_representante: document.getElementById('pjEstadoRepresentante').value.trim().toUpperCase() || null,
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
  const marcadosIds = Array.from(document.querySelectorAll('.pfVinculoCheckbox:checked')).map(cb => parseInt(cb.value));

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

  document.getElementById('pjId').value = j.id;
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
  document.getElementById('pjNomeRepresentante').value = j.nome_representante || '';
  document.getElementById('pjDataNascimentoRepresentante').value = j.data_nascimento_representante || '';
  document.getElementById('pjNacionalidadeRepresentante').value = j.nacionalidade_representante || '';
  document.getElementById('pjEstadoCivilRepresentante').value = j.estado_civil_representante || '';
  document.getElementById('pjProfissaoRepresentante').value = j.profissao_representante || '';
  document.getElementById('pjCPFRepresentante').value = j.cpf_representante || '';
  document.getElementById('pjRGRepresentante').value = j.rg_representante || '';
  document.getElementById('pjTelefoneRepresentante').value = j.telefone_representante || '';
  document.getElementById('pjEmailRepresentante').value = j.email_representante || '';
  document.getElementById('pjEnderecoRepresentante').value = j.endereco_representante || '';
  document.getElementById('pjEstadoRepresentante').value = j.estado_representante || '';
  document.getElementById('pjObservacoes').value = j.observacoes || '';

  await popularVinculosPFnoFormPJ();
}

function limparFormularioPJ() {
  document.getElementById('pjId').value = '';
  ['pjRazaoSocial','pjCNPJ','pjSegmento','pjPorte','pjRegimeTributario','pjNaturezaJuridica','pjCNAE',
   'pjCapitalSocial','pjSenhaGov','pjEnderecoEmpresa','pjEstadoEmpresa','pjMunicipioEmpresa','pjNomeRepresentante',
   'pjDataNascimentoRepresentante','pjNacionalidadeRepresentante','pjEstadoCivilRepresentante',
   'pjProfissaoRepresentante','pjCPFRepresentante','pjRGRepresentante','pjTelefoneRepresentante',
   'pjEmailRepresentante','pjEnderecoRepresentante','pjEstadoRepresentante','pjObservacoes']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.querySelectorAll('.pfVinculoCheckbox').forEach(cb => cb.checked = false);
}

async function deletarPJ(id) {
  if (!confirm('Deletar esta Pessoa Jurídica? Vínculos com PF também serão removidos.')) return;
  await SupabaseAPI.delete('clientes_pj', id);
  await carregarListaUnificada();
  alert('✅ Pessoa Jurídica deletada!');
}

// Nota: inicializarClientes() é chamado explicitamente por quem inclui este script
