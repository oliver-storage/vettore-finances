/**
 * Vettore Finances - Configuração com Supabase v1.7.0
 */

async function inicializar() {
  try {
    checkAuth();
    
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const unidades = await SupabaseAPI.get('unidades');
    const franquia = unidades.find(u => u.id === user.unidade_id);
    const nomeFranquia = franquia?.nomeFranquia || 'Franquia';
    
    document.getElementById('userName').textContent = `${nomeFranquia} - ${user.nome}`;
    
    // Máscara CPF na aba usuários
    const inputCPF = document.getElementById('inputCPFUsuario');
    if (inputCPF) {
      inputCPF.addEventListener('input', (e) => {
        e.target.value = aplicarMascaraCPF(e.target.value);
      });
    }
    
    // Carregar dados
    await carregarUnidades();
    await carregarFranquiasSelect(unidades);
    await carregarUsuarios();
    await carregarPrivilegios();
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

function aplicarMascaraCPF(valor) {
  const clean = valor.replace(/\D/g, '');
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return clean.slice(0, 3) + '.' + clean.slice(3);
  if (clean.length <= 9) return clean.slice(0, 3) + '.' + clean.slice(3, 6) + '.' + clean.slice(6);
  return clean.slice(0, 3) + '.' + clean.slice(3, 6) + '.' + clean.slice(6, 9) + '-' + clean.slice(9, 11);
}

async function carregarUnidades() {
  const unidades = await SupabaseAPI.get('unidades');
  const tbody = document.getElementById('tbodyUnidades');
  
  tbody.innerHTML = '';
  unidades.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.nomeFranquia}</td>
      <td>${u.cnpj || '-'}</td>
      <td>${u.telefone || '-'}</td>
      <td>
        <button class="btn-edit" onclick="editarUnidade(${u.id})">Editar</button>
        <button class="btn-danger" onclick="deletarUnidade(${u.id})">Deletar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function carregarFranquiasSelect(unidades) {
  const select = document.getElementById('selectFranquiaUsuario');
  
  select.innerHTML = '<option value="">Selecione...</option>';
  unidades.forEach(u => {
    const option = document.createElement('option');
    option.value = u.id;
    option.textContent = u.nomeFranquia;
    select.appendChild(option);
  });
}

async function carregarUsuarios() {
  const usuarios = await SupabaseAPI.get('usuarios');
  const unidades = await SupabaseAPI.get('unidades');
  const tbody = document.getElementById('tbodyUsuarios');
  
  tbody.innerHTML = '';
  usuarios.forEach(u => {
    const unidade = unidades.find(un => un.id === u.unidade_id);
    const nomeUnidade = unidade?.nomeFranquia || '-';
    const cpfFormatado = u.cpf ? formatarCPF(u.cpf) : '-';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td>${cpfFormatado}</td>
      <td>${nomeUnidade}</td>
      <td><span class="badge">${u.perfil}</span></td>
      <td>
        <button class="btn-edit" onclick="editarUsuario(${u.id})">Editar</button>
        <button class="btn-danger" onclick="deletarUsuario(${u.id})">Deletar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function formatarCPF(cpf) {
  if (!cpf) return '';
  const clean = cpf.replace(/\D/g, '');
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

async function carregarPrivilegios() {
  const privilegios = await SupabaseAPI.get('privilegios');
  const tbody = document.getElementById('tbodyPrivilegios');
  const funcionalidades = [...new Set(privilegios.map(p => p.funcionalidade))];
  
  tbody.innerHTML = '';
  funcionalidades.forEach((func) => {
    const tr = document.createElement('tr');
    let cells = `<td>${func}</td>`;
    
    ['administrador', 'gerente', 'usuario'].forEach(perfil => {
      const priv = privilegios.find(p => p.perfil === perfil && p.funcionalidade === func);
      const checked = priv?.permissao ? 'checked' : '';
      cells += `<td><input type="checkbox" data-perfil="${perfil}" data-func="${func}" ${checked}></td>`;
    });
    
    tr.innerHTML = cells;
    tbody.appendChild(tr);
  });
}

async function handleNovaUnidade(e) {
  e.preventDefault();
  
  const nova = {
    nomeFranquia: document.getElementById('inputNomeFranquia').value,
    razaoSocial: document.getElementById('inputRazaoSocial').value,
    cnpj: document.getElementById('inputCNPJ').value,
    email: document.getElementById('inputEmail').value,
    telefone: document.getElementById('inputTelefone').value,
    cep: document.getElementById('inputCEP').value,
    rua: document.getElementById('inputRua').value,
    numero: document.getElementById('inputNumero').value,
    complemento: document.getElementById('inputComplemento').value,
    bairro: document.getElementById('inputBairro').value,
    cidade: document.getElementById('inputCidade').value,
    estado: document.getElementById('inputEstado').value,
    banco: document.getElementById('inputBanco').value,
    agencia: document.getElementById('inputAgencia').value,
    conta: document.getElementById('inputConta').value,
    tipoConta: document.getElementById('inputTipoConta').value
  };
  
  const result = await SupabaseAPI.insert('unidades', nova);
  
  if (result && result.length > 0) {
    alert('✅ Unidade criada com sucesso!');
    e.target.reset();
    await carregarUnidades();
    const unidades = await SupabaseAPI.get('unidades');
    await carregarFranquiasSelect(unidades);
  } else {
    alert('❌ Erro ao criar unidade');
    console.error('Resposta:', result);
  }
}

async function handleNovoUsuario(e) {
  e.preventDefault();
  
  const cpfRaw = document.getElementById('inputCPFUsuario').value.replace(/\D/g, '');
  
  const novo = {
    nome: document.getElementById('inputNomeUsuario').value,
    email: document.getElementById('inputEmailUsuario').value,
    cpf: cpfRaw || null,
    unidade_id: parseInt(document.getElementById('selectFranquiaUsuario').value),
    perfil: document.getElementById('selectPerfilUsuario').value,
    senha: document.getElementById('inputSenhaUsuario').value,
    ativo: true
  };
  
  const result = await SupabaseAPI.insert('usuarios', novo);
  
  if (result && result.length > 0) {
    alert('✅ Usuário criado com sucesso!');
    e.target.reset();
    await carregarUsuarios();
  } else {
    alert('❌ Erro ao criar usuário');
    console.error('Resposta:', result);
  }
}

async function salvarPrivilegios() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  let updates = [];
  
  checkboxes.forEach(check => {
    const perfil = check.dataset.perfil;
    const func = check.dataset.func;
    const permissao = check.checked;
    
    updates.push({ perfil, funcionalidade: func, permissao });
  });
  
  for (const update of updates) {
    // Encontrar ID do privilégio
    const privilegios = await SupabaseAPI.query('privilegios', {
      perfil: update.perfil,
      funcionalidade: update.funcionalidade
    });
    
    if (privilegios.length > 0) {
      await SupabaseAPI.update('privilegios', privilegios[0].id, { permissao: update.permissao });
    }
  }
  
  alert('✅ Privilégios salvos!');
}

async function editarUnidade(id) {
  const unidades = await SupabaseAPI.get('unidades');
  const unidade = unidades.find(u => u.id === id);
  
  if (!unidade) {
    alert('❌ Unidade não encontrada');
    return;
  }
  
  const novoNome = prompt('Nome Franquia:', unidade.nomeFranquia);
  if (novoNome === null) return;
  
  const updateData = { nomeFranquia: novoNome };
  
  try {
    await SupabaseAPI.update('unidades', id, updateData);
    alert('✅ Unidade atualizada!');
    await carregarUnidades();
  } catch (error) {
    alert('❌ Erro: ' + error.message);
  }
}

async function deletarUnidade(id) {
  if (!confirm('Deletar esta unidade?')) return;
  
  try {
    await SupabaseAPI.delete('unidades', id);
    alert('✅ Unidade deletada!');
    await carregarUnidades();
    const unidades = await SupabaseAPI.get('unidades');
    await carregarFranquiasSelect(unidades);
  } catch (error) {
    alert('❌ Erro: ' + error.message);
  }
}
async function editarUsuario(id) {
  const usuarios = await SupabaseAPI.get('usuarios');
  const user = usuarios.find(u => u.id === id);
  
  if (!user) {
    alert('❌ Usuário não encontrado');
    return;
  }
  
  const novoNome = prompt('Nome:', user.nome);
  if (novoNome === null) return;
  
  const novoEmail = prompt('Email:', user.email);
  if (novoEmail === null) return;
  
  const novoCPF = prompt('CPF (apenas números):', user.cpf || '');
  if (novoCPF === null) return;
  
  const novaSenha = prompt('Senha (deixe vazio para manter):', '');
  if (novaSenha === null) return;
  
  const updateData = {
    nome: novoNome,
    email: novoEmail,
    cpf: novoCPF
  };
  
  if (novaSenha) {
    updateData.senha = novaSenha;
  }
  
  try {
    await SupabaseAPI.update('usuarios', id, updateData);
    alert('✅ Usuário atualizado!');
    await carregarUsuarios();
  } catch (error) {
    alert('❌ Erro: ' + error.message);
  }
}

async function deletarUsuario(id) {
  if (!confirm('Deletar este usuário?')) return;
  
  try {
    await SupabaseAPI.delete('usuarios', id);
    alert('✅ Usuário deletado!');
    await carregarUsuarios();
  } catch (error) {
    alert('❌ Erro: ' + error.message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}
