/**
 * Vettore Finances - Módulo Clientes v1.9.1.2
 */

let unidadeAtivaCliente = null;

async function buscarCEPCliente() {
  const cep = document.getElementById('inputCEPCliente').value.replace(/\D/g, '');

  if (cep.length !== 8) {
    alert('CEP inválido (8 dígitos)');
    return;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (data.erro) {
      alert('CEP não encontrado');
      return;
    }

    document.getElementById('inputRuaCliente').value = data.logradouro || '';
    document.getElementById('inputBairroCliente').value = data.bairro || '';
    document.getElementById('inputCidadeCliente').value = data.localidade || '';
    document.getElementById('inputEstadoCliente').value = data.uf || '';
    document.getElementById('inputNumeroCliente').focus();
  } catch (error) {
    alert('Erro ao buscar CEP: ' + error.message);
  }
}

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

    await carregarClientes();
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

async function trocarFranquiaCliente() {
  unidadeAtivaCliente = parseInt(document.getElementById('franquiaFilterCliente').value);
  await carregarClientes();
}

async function carregarClientes() {
  const tbody = document.getElementById('tbodyClientes');
  tbody.innerHTML = '';

  const todos = await SupabaseAPI.get('clientes');
  const clientes = todos.filter(c => c.unidade_id === unidadeAtivaCliente);

  if (clientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--tinta-40);">Nenhum cliente cadastrado</td></tr>';
    document.getElementById('acoesMassaClientes').style.display = 'none';
    document.getElementById('checkAllClientes').checked = false;
    return;
  }

  clientes.forEach(c => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--linha)';
    tr.innerHTML = `
      <td style="width:20px; text-align:center; padding:12px 0;">
        <input type="checkbox" class="checkbox-sistema checkboxCliente" data-id="${c.id}" onchange="atualizarAcoesMassaClientes()">
      </td>
      <td style="padding:12px;">${c.nome}</td>
      <td style="padding:12px;">${c.cpf_cnpj || '-'}</td>
      <td style="padding:12px;">${c.telefone || '-'}</td>
      <td style="padding:12px;">${c.cidade || '-'}</td>
      <td style="padding:12px; text-align:center; display:flex; gap:6px; justify-content:center;">
        <button class="action-button" onclick="editarCliente(${c.id})" title="Editar Cliente">✏️</button>
        <button class="action-button delete" onclick="deletarCliente(${c.id})" title="Deletar Cliente">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('acoesMassaClientes').style.display = 'none';
  document.getElementById('checkAllClientes').checked = false;
}

async function salvarCliente(event) {
  event.preventDefault();

  const id = document.getElementById('inputClienteId').value;
  const dados = {
    unidade_id: unidadeAtivaCliente,
    nome: document.getElementById('inputNomeCliente').value.trim(),
    cpf_cnpj: document.getElementById('inputCpfCnpjCliente').value.trim() || null,
    email: document.getElementById('inputEmailCliente').value.trim() || null,
    telefone: document.getElementById('inputTelefoneCliente').value.trim() || null,
    cep: document.getElementById('inputCEPCliente').value.trim() || null,
    rua: document.getElementById('inputRuaCliente').value.trim() || null,
    numero: document.getElementById('inputNumeroCliente').value.trim() || null,
    complemento: document.getElementById('inputComplementoCliente').value.trim() || null,
    bairro: document.getElementById('inputBairroCliente').value.trim() || null,
    cidade: document.getElementById('inputCidadeCliente').value.trim() || null,
    estado: document.getElementById('inputEstadoCliente').value.trim() || null,
    observacao: document.getElementById('inputObservacaoCliente').value.trim() || null
  };

  if (!dados.nome) {
    alert('⚠️ Preencha o Nome / Razão Social');
    return;
  }

  if (!unidadeAtivaCliente) {
    alert('⚠️ Selecione uma franquia');
    return;
  }

  try {
    if (id) {
      await SupabaseAPI.update('clientes', parseInt(id), dados);
      alert('✅ Cliente atualizado!');
    } else {
      await SupabaseAPI.insert('clientes', dados);
      alert('✅ Cliente cadastrado!');
    }

    limparFormularioCliente();
    await carregarClientes();
  } catch (error) {
    console.error('❌ Erro ao salvar cliente:', error);
    alert('❌ Erro ao salvar cliente');
  }
}

async function editarCliente(id) {
  const todos = await SupabaseAPI.get('clientes');
  const c = todos.find(cl => cl.id === id);
  if (!c) return;

  document.getElementById('inputClienteId').value = c.id;
  document.getElementById('inputNomeCliente').value = c.nome || '';
  document.getElementById('inputCpfCnpjCliente').value = c.cpf_cnpj || '';
  document.getElementById('inputEmailCliente').value = c.email || '';
  document.getElementById('inputTelefoneCliente').value = c.telefone || '';
  document.getElementById('inputCEPCliente').value = c.cep || '';
  document.getElementById('inputRuaCliente').value = c.rua || '';
  document.getElementById('inputNumeroCliente').value = c.numero || '';
  document.getElementById('inputComplementoCliente').value = c.complemento || '';
  document.getElementById('inputBairroCliente').value = c.bairro || '';
  document.getElementById('inputCidadeCliente').value = c.cidade || '';
  document.getElementById('inputEstadoCliente').value = c.estado || '';
  document.getElementById('inputObservacaoCliente').value = c.observacao || '';

  document.getElementById('btnCancelarEdicao').style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicaoCliente() {
  limparFormularioCliente();
}

function limparFormularioCliente() {
  document.getElementById('inputClienteId').value = '';
  document.getElementById('inputNomeCliente').value = '';
  document.getElementById('inputCpfCnpjCliente').value = '';
  document.getElementById('inputEmailCliente').value = '';
  document.getElementById('inputTelefoneCliente').value = '';
  document.getElementById('inputCEPCliente').value = '';
  document.getElementById('inputRuaCliente').value = '';
  document.getElementById('inputNumeroCliente').value = '';
  document.getElementById('inputComplementoCliente').value = '';
  document.getElementById('inputBairroCliente').value = '';
  document.getElementById('inputCidadeCliente').value = '';
  document.getElementById('inputEstadoCliente').value = '';
  document.getElementById('inputObservacaoCliente').value = '';
  document.getElementById('btnCancelarEdicao').style.display = 'none';
}

async function deletarCliente(id) {
  if (!confirm('Deletar este cliente?')) return;
  await SupabaseAPI.delete('clientes', id);
  await carregarClientes();
  alert('✅ Cliente deletado!');
}

function atualizarAcoesMassaClientes() {
  const selecionados = document.querySelectorAll('.checkboxCliente:checked').length;
  document.getElementById('acoesMassaClientes').style.display = selecionados > 0 ? 'block' : 'none';
}

function toggleAllClientes(checked) {
  document.querySelectorAll('.checkboxCliente').forEach(cb => cb.checked = checked);
  atualizarAcoesMassaClientes();
}

async function deletarClientesSelecionados() {
  const ids = Array.from(document.querySelectorAll('.checkboxCliente:checked')).map(cb => parseInt(cb.dataset.id));
  if (ids.length === 0) return;
  if (!confirm(`Deletar ${ids.length} cliente(s)?`)) return;

  await Promise.all(ids.map(id => SupabaseAPI.delete('clientes', id)));
  await carregarClientes();
  alert(`✅ ${ids.length} cliente(s) deletado(s)!`);
}

// Nota: inicializarClientes() é chamado explicitamente por quem inclui este script
// (clientes.html chama direto; configuracao.html chama ao abrir a aba "Clientes")
