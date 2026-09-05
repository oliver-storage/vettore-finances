/**
 * Vettore Finances - Módulo Clientes (PF/PJ) v1.9.3.1 - PREVIEW (versão com abas, sem modal)
 */

let unidadeAtivaCliente = null;
let PF_CACHE = [];
let PJ_CACHE = [];

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

    await carregarPF();
    await carregarPJ();
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

async function trocarFranquiaCliente() {
  unidadeAtivaCliente = parseInt(document.getElementById('franquiaFilterCliente').value);
  await carregarPF();
  await carregarPJ();
}

function switchTabCliente(tab) {
  document.getElementById('tabPF').classList.toggle('active', tab === 'pf');
  document.getElementById('tabPJ').classList.toggle('active', tab === 'pj');
  document.querySelectorAll('.sub-tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && tab === 'pf') || (i === 1 && tab === 'pj'));
  });
}

// ========== PESSOA FÍSICA ==========
async function carregarPF() {
  const tbody = document.getElementById('tbodyPF');
  if (!tbody) return;
  tbody.innerHTML = '';

  const todos = await SupabaseAPI.get('clientes_pf');
  PF_CACHE = todos.filter(p => p.unidade_id === unidadeAtivaCliente);

  if (PF_CACHE.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--tinta-40);">Nenhuma pessoa física cadastrada</td></tr>';
  } else {
    PF_CACHE.forEach(p => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--linha)';
      tr.innerHTML = `
        <td style="width:20px; text-align:center; padding:12px 0;">
          <input type="checkbox" class="checkbox-sistema checkboxPF" data-id="${p.id}" onchange="atualizarAcoesMassaPF()">
        </td>
        <td style="padding:12px;">${p.nome}</td>
        <td style="padding:12px;">${p.cpf || '-'}</td>
        <td style="padding:12px;">${p.telefone || '-'}</td>
        <td style="padding:12px;">${p.municipio || '-'}</td>
        <td style="padding:12px; text-align:center; display:flex; gap:6px; justify-content:center;">
          <button class="action-button" onclick="editarPF(${p.id})" title="Editar">✏️</button>
          <button class="action-button delete" onclick="deletarPF(${p.id})" title="Deletar">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  await popularVinculosPJnoFormPF();
}

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
    telefone: document.getElementById('pfTelefone').value.trim() || null,
    municipio: document.getElementById('pfMunicipio').value.trim() || null,
    cnae: document.getElementById('pfCNAE').value.trim() || null,
    senha_gov: document.getElementById('pfSenhaGov').value.trim() || null,
    email: document.getElementById('pfEmail').value.trim() || null,
    capital_social: document.getElementById('pfCapitalSocial').value.trim() || null,
    observacoes: document.getElementById('pfObservacoes').value.trim() || null,
    sequencia: document.getElementById('pfSequencia').value.trim() || null
  };
  if (!dados.nome) { alert('⚠️ Preencha o Nome'); return; }
  if (!unidadeAtivaCliente) { alert('⚠️ Selecione uma franquia'); return; }
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
    await carregarPF();
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
    if (!marcadosIds.includes(v.pj_id)) await SupabaseAPI.delete('clientes_pf_pj', v.id);
  }
  const jaVinculadosIds = vinculosDessePF.map(v => v.pj_id);
  for (const pjId of marcadosIds) {
    if (!jaVinculadosIds.includes(pjId)) await SupabaseAPI.insert('clientes_pf_pj', { pf_id: pfId, pj_id: pjId });
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
  document.getElementById('pfTelefone').value = p.telefone || '';
  document.getElementById('pfMunicipio').value = p.municipio || '';
  document.getElementById('pfCNAE').value = p.cnae || '';
  document.getElementById('pfSenhaGov').value = p.senha_gov || '';
  document.getElementById('pfEmail').value = p.email || '';
  document.getElementById('pfCapitalSocial').value = p.capital_social || '';
  document.getElementById('pfObservacoes').value = p.observacoes || '';
  document.getElementById('pfSequencia').value = p.sequencia || '';
  await popularVinculosPJnoFormPF();
  document.getElementById('btnCancelarPF').style.display = 'inline-block';
  switchTabCliente('pf');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicaoPF() { limparFormularioPF(); }

function limparFormularioPF() {
  document.getElementById('pfId').value = '';
  ['pfNome','pfDataNascimento','pfNacionalidade','pfEstadoCivil','pfProfissao','pfCPF','pfEndereco',
   'pfTelefone','pfMunicipio','pfCNAE','pfSenhaGov','pfEmail','pfCapitalSocial','pfObservacoes','pfSequencia']
    .forEach(id => document.getElementById(id).value = '');
  document.querySelectorAll('.pjVinculoCheckbox').forEach(cb => cb.checked = false);
  document.getElementById('btnCancelarPF').style.display = 'none';
}

async function deletarPF(id) {
  if (!confirm('Deletar esta Pessoa Física?')) return;
  await SupabaseAPI.delete('clientes_pf', id);
  await carregarPF();
  await carregarPJ();
  alert('✅ Pessoa Física deletada!');
}

function atualizarAcoesMassaPF() {
  document.getElementById('acoesMassaPF').style.display = document.querySelectorAll('.checkboxPF:checked').length > 0 ? 'block' : 'none';
}
function toggleAllPF(checked) {
  document.querySelectorAll('.checkboxPF').forEach(cb => cb.checked = checked);
  atualizarAcoesMassaPF();
}
async function deletarPFSelecionados() {
  const ids = Array.from(document.querySelectorAll('.checkboxPF:checked')).map(cb => parseInt(cb.dataset.id));
  if (ids.length === 0) return;
  if (!confirm(`Deletar ${ids.length} registro(s)?`)) return;
  await Promise.all(ids.map(id => SupabaseAPI.delete('clientes_pf', id)));
  await carregarPF(); await carregarPJ();
  alert(`✅ ${ids.length} deletado(s)!`);
}

// ========== PESSOA JURÍDICA ==========
async function carregarPJ() {
  const tbody = document.getElementById('tbodyPJ');
  if (!tbody) return;
  tbody.innerHTML = '';
  const todos = await SupabaseAPI.get('clientes_pj');
  PJ_CACHE = todos.filter(j => j.unidade_id === unidadeAtivaCliente);
  if (PJ_CACHE.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--tinta-40);">Nenhuma pessoa jurídica cadastrada</td></tr>';
  } else {
    PJ_CACHE.forEach(j => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--linha)';
      tr.innerHTML = `
        <td style="width:20px; text-align:center; padding:12px 0;">
          <input type="checkbox" class="checkbox-sistema checkboxPJ" data-id="${j.id}" onchange="atualizarAcoesMassaPJ()">
        </td>
        <td style="padding:12px;">${j.razao_social}</td>
        <td style="padding:12px;">${j.cnpj || '-'}</td>
        <td style="padding:12px;">${j.nome_representante || '-'}</td>
        <td style="padding:12px;">${j.segmento || '-'}</td>
        <td style="padding:12px; text-align:center; display:flex; gap:6px; justify-content:center;">
          <button class="action-button" onclick="editarPJ(${j.id})" title="Editar">✏️</button>
          <button class="action-button delete" onclick="deletarPJ(${j.id})" title="Deletar">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
  await popularVinculosPFnoFormPJ();
}

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
    observacoes: document.getElementById('pjObservacoes').value.trim() || null
  };
  if (!dados.razao_social) { alert('⚠️ Preencha a Razão Social'); return; }
  if (!unidadeAtivaCliente) { alert('⚠️ Selecione uma franquia'); return; }
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
    alert(id ? '✅ Pessoa Jurídica atualizada!' : '✅ Pessoa Jurídica cadastrada!');
    limparFormularioPJ();
    await carregarPJ();
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
    if (!marcadosIds.includes(v.pf_id)) await SupabaseAPI.delete('clientes_pf_pj', v.id);
  }
  const jaVinculadosIds = vinculosDessePJ.map(v => v.pf_id);
  for (const pfId of marcadosIds) {
    if (!jaVinculadosIds.includes(pfId)) await SupabaseAPI.insert('clientes_pf_pj', { pf_id: pfId, pj_id: pjId });
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
  document.getElementById('pjObservacoes').value = j.observacoes || '';
  await popularVinculosPFnoFormPJ();
  document.getElementById('btnCancelarPJ').style.display = 'inline-block';
  switchTabCliente('pj');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicaoPJ() { limparFormularioPJ(); }

function limparFormularioPJ() {
  document.getElementById('pjId').value = '';
  ['pjRazaoSocial','pjCNPJ','pjSegmento','pjPorte','pjRegimeTributario','pjNaturezaJuridica','pjCNAE',
   'pjCapitalSocial','pjSenhaGov','pjEnderecoEmpresa','pjMunicipioEmpresa','pjNomeRepresentante',
   'pjDataNascimentoRepresentante','pjNacionalidadeRepresentante','pjEstadoCivilRepresentante',
   'pjProfissaoRepresentante','pjCPFRepresentante','pjRGRepresentante','pjTelefoneRepresentante',
   'pjEmailRepresentante','pjEnderecoRepresentante','pjObservacoes']
    .forEach(id => document.getElementById(id).value = '');
  document.querySelectorAll('.pfVinculoCheckbox').forEach(cb => cb.checked = false);
  document.getElementById('btnCancelarPJ').style.display = 'none';
}

async function deletarPJ(id) {
  if (!confirm('Deletar esta Pessoa Jurídica?')) return;
  await SupabaseAPI.delete('clientes_pj', id);
  await carregarPJ();
  await carregarPF();
  alert('✅ Pessoa Jurídica deletada!');
}

function atualizarAcoesMassaPJ() {
  document.getElementById('acoesMassaPJ').style.display = document.querySelectorAll('.checkboxPJ:checked').length > 0 ? 'block' : 'none';
}
function toggleAllPJ(checked) {
  document.querySelectorAll('.checkboxPJ').forEach(cb => cb.checked = checked);
  atualizarAcoesMassaPJ();
}
async function deletarPJSelecionados() {
  const ids = Array.from(document.querySelectorAll('.checkboxPJ:checked')).map(cb => parseInt(cb.dataset.id));
  if (ids.length === 0) return;
  if (!confirm(`Deletar ${ids.length} registro(s)?`)) return;
  await Promise.all(ids.map(id => SupabaseAPI.delete('clientes_pj', id)));
  await carregarPJ(); await carregarPF();
  alert(`✅ ${ids.length} deletado(s)!`);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarClientes);
} else {
  inicializarClientes();
}
