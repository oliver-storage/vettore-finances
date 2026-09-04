/**
 * Vettore Finances - Configuração com Supabase v1.8.7
 */

const CATEGORIAS_PADRAO = [
  'BOLETOS', 'CUSTEIO', 'DAE CLIENTE', 'ENDEREÇO FISCAL',
  'HONORÁRIOS', 'NEGOCIAÇÃO', 'PARCEIROS', 'SERVIÇOS', 'TARIFAS', 'SALDO ANTERIOR'
];

let CATEGORIAS = [...CATEGORIAS_PADRAO];

async function inicializar() {
  try {
    checkAuth();
    
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const unidades = await SupabaseAPI.get('unidades');
    const franquia = unidades.find(u => u.id === user.unidade_id);
    const nomefranquia = franquia?.nomefranquia || 'Sistema';
    
    document.getElementById('userName').textContent = `${nomefranquia} - ${user.nome} (${user.perfil})`;
    
    // Máscara CPF na aba usuários (criar)
    const inputCPF = document.getElementById('inputCPFUsuario');
    if (inputCPF) {
      inputCPF.addEventListener('input', (e) => {
        e.target.value = aplicarMascaraCPF(e.target.value);
      });
    }
    
    // Máscara CPF no modal (editar)
    const modalCPF = document.getElementById('modalCPFUsuario');
    if (modalCPF) {
      modalCPF.addEventListener('input', (e) => {
        e.target.value = aplicarMascaraCPF(e.target.value);
      });
    }
    
    // Carregar dados com filtros de permissão
    await carregarUnidades(user);
    await carregarFranquiasSelect(unidades, user);
    await carregarUsuarios(user);
    await carregarPrivilegios();
    await carregarCategorias();
    await carregarServicos();
    
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

async function carregarUnidades(user) {
  const unidades = await SupabaseAPI.get('unidades');
  const tbody = document.getElementById('tbodyUnidades');
  
  tbody.innerHTML = '';
  
  let unidadesFiltradas = unidades;
  
  // Gestor/Usuário vê apenas sua franquia
  if (user && user.perfil !== 'administrador' && user.unidade_id) {
    unidadesFiltradas = unidades.filter(u => u.id === user.unidade_id);
  }
  
  unidadesFiltradas.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.nomefranquia}</td>
      <td>${u.cnpj || '-'}</td>
      <td>${u.telefone || '-'}</td>
      <td>
        <button class="btn-edit" onclick="editarUnidade(${u.id})">Editar</button>
        ${user && user.perfil === 'administrador' ? `<button class="btn-danger" onclick="deletarUnidade(${u.id})">Deletar</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function carregarFranquiasSelect(unidades, user) {
  const select = document.getElementById('selectFranquiaUsuario');
  
  select.innerHTML = '<option value="">Selecione...</option>';
  
  let unidadesFiltradas = unidades;
  
  // Gestor vê apenas sua franquia
  if (user && user.perfil === 'gestor' && user.unidade_id) {
    unidadesFiltradas = unidades.filter(u => u.id === user.unidade_id);
  }
  
  unidadesFiltradas.forEach(u => {
    const option = document.createElement('option');
    option.value = u.id;
    option.textContent = u.nomefranquia;
    select.appendChild(option);
  });
}

async function carregarUsuarios(user) {
  const usuarios = await SupabaseAPI.get('usuarios');
  const unidades = await SupabaseAPI.get('unidades');
  const tbody = document.getElementById('tbodyUsuarios');
  
  tbody.innerHTML = '';
  
  let usuariosFiltrados = usuarios;
  
  // Gestor vê apenas usuários de sua franquia
  if (user && user.perfil === 'gestor' && user.unidade_id) {
    usuariosFiltrados = usuarios.filter(u => u.unidade_id === user.unidade_id);
  }
  
  usuariosFiltrados.forEach(u => {
    const unidade = unidades.find(un => un.id === u.unidade_id);
    const nomeUnidade = unidade?.nomefranquia || '-';
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
  
  try {
    const nova = {
      nomefranquia: document.getElementById('inputNomeFranquia').value,
      razaosocial: document.getElementById('inputRazaoSocial').value,
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
      tipoconta: document.getElementById('inputTipoConta').value
    };
    
    console.log('📝 Dados a enviar:', nova);
    
    const result = await SupabaseAPI.insert('unidades', nova);
    
    console.log('📥 Resposta:', result);
    
    if (result && result.length > 0) {
      alert('✅ Unidade criada com sucesso!');
      e.target.reset();
      await carregarUnidades();
      const unidades = await SupabaseAPI.get('unidades');
      await carregarFranquiasSelect(unidades);
    } else {
      alert('❌ Erro ao criar unidade');
    }
  } catch (error) {
    alert('❌ Erro: ' + error.message);
    console.error('Erro completo:', error);
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
    alert('❌ Franquia não encontrada');
    return;
  }
  
  // Preencher modal
  document.getElementById('modalFranquiaId').value = id;
  document.getElementById('modalNomeFranquia').value = unidade.nomefranquia || '';
  document.getElementById('modalRazaoSocial').value = unidade.razaosocial || '';
  document.getElementById('modalCNPJ').value = unidade.cnpj || '';
  document.getElementById('modalEmailFranquia').value = unidade.email || '';
  document.getElementById('modalTelefoneFranquia').value = unidade.telefone || '';
  document.getElementById('modalCEPFranquia').value = unidade.cep || '';
  document.getElementById('modalRuaFranquia').value = unidade.rua || '';
  document.getElementById('modalNumeroFranquia').value = unidade.numero || '';
  document.getElementById('modalComplementoFranquia').value = unidade.complemento || '';
  document.getElementById('modalBairroFranquia').value = unidade.bairro || '';
  document.getElementById('modalCidadeFranquia').value = unidade.cidade || '';
  document.getElementById('modalEstadoFranquia').value = unidade.estado || '';
  document.getElementById('modalBancoFranquia').value = unidade.banco || '';
  document.getElementById('modalAgenciaFranquia').value = unidade.agencia || '';
  document.getElementById('modalContaFranquia').value = unidade.conta || '';
  document.getElementById('modalTipoContaFranquia').value = unidade.tipoconta || '';
  
  // Mostrar modal
  document.getElementById('modalEditarFranquia').style.display = 'flex';
}

function fecharModalFranquia() {
  document.getElementById('modalEditarFranquia').style.display = 'none';
}

async function salvarEdicaoFranquia(e) {
  e.preventDefault();
  
  const id = parseInt(document.getElementById('modalFranquiaId').value);
  
  const updateData = {
    nomefranquia: document.getElementById('modalNomeFranquia').value,
    razaosocial: document.getElementById('modalRazaoSocial').value,
    cnpj: document.getElementById('modalCNPJ').value,
    email: document.getElementById('modalEmailFranquia').value,
    telefone: document.getElementById('modalTelefoneFranquia').value,
    cep: document.getElementById('modalCEPFranquia').value,
    rua: document.getElementById('modalRuaFranquia').value,
    numero: document.getElementById('modalNumeroFranquia').value,
    complemento: document.getElementById('modalComplementoFranquia').value,
    bairro: document.getElementById('modalBairroFranquia').value,
    cidade: document.getElementById('modalCidadeFranquia').value,
    estado: document.getElementById('modalEstadoFranquia').value,
    banco: document.getElementById('modalBancoFranquia').value,
    agencia: document.getElementById('modalAgenciaFranquia').value,
    conta: document.getElementById('modalContaFranquia').value,
    tipoconta: document.getElementById('modalTipoContaFranquia').value
  };
  
  try {
    await SupabaseAPI.update('unidades', id, updateData);
    alert('✅ Franquia atualizada!');
    fecharModalFranquia();
    await carregarUnidades();
    const unidades = await SupabaseAPI.get('unidades');
    await carregarFranquiasSelect(unidades);
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
  const unidades = await SupabaseAPI.get('unidades');
  const user = usuarios.find(u => u.id === id);
  
  if (!user) {
    alert('❌ Usuário não encontrado');
    return;
  }
  
  // Preencher modal
  document.getElementById('modalUsuarioId').value = id;
  document.getElementById('modalNomeUsuario').value = user.nome;
  document.getElementById('modalEmailUsuario').value = user.email;
  document.getElementById('modalCPFUsuario').value = user.cpf ? formatarCPF(user.cpf) : '';
  document.getElementById('modalPerfilUsuario').value = user.perfil;
  document.getElementById('modalSenhaUsuario').value = '';
  
  // Preencher franquias
  const selectFranquia = document.getElementById('modalFranquiaUsuario');
  selectFranquia.innerHTML = '';
  unidades.forEach(u => {
    const option = document.createElement('option');
    option.value = u.id;
    option.textContent = u.nomefranquia;
    if (u.id === user.unidade_id) option.selected = true;
    selectFranquia.appendChild(option);
  });
  
  // Mostrar modal
  document.getElementById('modalEditarUsuario').style.display = 'flex';
}

function fecharModalUsuario() {
  document.getElementById('modalEditarUsuario').style.display = 'none';
}

async function salvarEdicaoUsuario(e) {
  e.preventDefault();
  
  const id = parseInt(document.getElementById('modalUsuarioId').value);
  const cpfRaw = document.getElementById('modalCPFUsuario').value.replace(/\D/g, '');
  
  const updateData = {
    nome: document.getElementById('modalNomeUsuario').value,
    email: document.getElementById('modalEmailUsuario').value,
    cpf: cpfRaw || null,
    unidade_id: parseInt(document.getElementById('modalFranquiaUsuario').value),
    perfil: document.getElementById('modalPerfilUsuario').value
  };
  
  const novaSenha = document.getElementById('modalSenhaUsuario').value;
  if (novaSenha) {
    updateData.senha = novaSenha;
  }
  
  try {
    await SupabaseAPI.update('usuarios', id, updateData);
    alert('✅ Usuário atualizado!');
    fecharModalUsuario();
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

// GERENCIAR CATEGORIAS
async function adicionarCategoria() {
  const input = document.getElementById('inputNovaCategoria');
  const categoria = input.value.trim().toUpperCase();
  
  if (!categoria) {
    alert('⚠️ Digite um nome para a categoria');
    return;
  }
  
  if (CATEGORIAS.includes(categoria)) {
    alert('⚠️ Categoria já existe');
    return;
  }
  
  CATEGORIAS.push(categoria);
  localStorage.setItem('categorias', JSON.stringify(CATEGORIAS));
  input.value = '';
  carregarCategorias();
  alert('✅ Categoria adicionada!');
}

function carregarCategorias() {
  const tbody = document.getElementById('tbodyCategorias');
  tbody.innerHTML = '';
  
  CATEGORIAS.forEach(cat => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cat}</td>
      <td><button class="btn-danger" onclick="deletarCategoria('${cat}')">Deletar</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function deletarCategoria(categoria) {
  if (!confirm(`Deletar categoria "${categoria}"?`)) return;
  
  CATEGORIAS = CATEGORIAS.filter(c => c !== categoria);
  localStorage.setItem('categorias', JSON.stringify(CATEGORIAS));
  carregarCategorias();
  alert('✅ Categoria deletada!');
}

// GERENCIAR SERVIÇOS
const SERVICOS_KEY = 'servicos_list';

async function adicionarServico() {
  const input = document.getElementById('inputNovoServico');
  const servico = input.value.trim();
  
  if (!servico) {
    alert('⚠️ Digite um nome para o serviço');
    return;
  }
  
  let servicos = JSON.parse(localStorage.getItem(SERVICOS_KEY) || '[]');
  
  if (servicos.includes(servico)) {
    alert('⚠️ Serviço já existe');
    return;
  }
  
  servicos.push(servico);
  localStorage.setItem(SERVICOS_KEY, JSON.stringify(servicos));
  input.value = '';
  carregarServicos();
  alert('✅ Serviço adicionado!');
}

function carregarServicos() {
  const servicos = JSON.parse(localStorage.getItem(SERVICOS_KEY) || '[]');
  const tbody = document.getElementById('tbodyServicos');
  tbody.innerHTML = '';
  
  servicos.forEach(srv => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${srv}</td>
      <td><button class="btn-danger" onclick="deletarServico('${srv}')">Deletar</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function deletarServico(servico) {
  if (!confirm(`Deletar serviço "${servico}"?`)) return;
  
  let servicos = JSON.parse(localStorage.getItem(SERVICOS_KEY) || '[]');
  servicos = servicos.filter(s => s !== servico);
  localStorage.setItem(SERVICOS_KEY, JSON.stringify(servicos));
  carregarServicos();
  alert('✅ Serviço deletado!');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}
