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
    
    // Carregar dados
    await carregarUnidades();
    await carregarFranquiasSelect(unidades);
    await carregarUsuarios();
    await carregarPrivilegios();
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
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
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.nome}</td>
      <td>${u.email}</td>
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
  
  const novo = {
    nome: document.getElementById('inputNomeUsuario').value,
    email: document.getElementById('inputEmailUsuario').value,
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

function editarUnidade(id) { alert('Função será implementada'); }
function deletarUnidade(id) { alert('Função será implementada'); }
function editarUsuario(id) { alert('Função será implementada'); }
function deletarUsuario(id) { alert('Função será implementada'); }

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}
