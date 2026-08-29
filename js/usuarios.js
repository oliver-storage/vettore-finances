/**
 * VA Business - Sistema Financeiro v1.0.0
 * Desenvolvido por OliverStorage
 * Módulo: Usuários CRUD
 */

function handleNovoUsuario(e) {
  e.preventDefault();
  
  const nome = document.getElementById('inputNome').value.trim();
  const email = document.getElementById('inputEmail').value.trim();
  const perfil = document.getElementById('inputPerfil').value;
  const senha = document.getElementById('inputSenha').value;
  const confirm = document.getElementById('inputConfirm').value;
  
  // Validações
  if (!nome || !email || !perfil || !senha) {
    alert('Preencha todos os campos obrigatórios');
    return;
  }
  
  if (senha !== confirm) {
    alert('Senhas não conferem');
    return;
  }
  
  if (senha.length < 6) {
    alert('Senha deve ter no mínimo 6 caracteres');
    return;
  }
  
  // Verificar se email já existe
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  if (usuarios.find(u => u.email === email)) {
    alert('Email já cadastrado');
    return;
  }
  
  // Adicionar novo usuário
  const novoUsuario = {
    id: Date.now(),
    nome,
    email,
    perfil,
    senha,
    ativo: true,
    data_criacao: new Date().toLocaleDateString('pt-BR')
  };
  
  usuarios.push(novoUsuario);
  localStorage.setItem('usuarios', JSON.stringify(usuarios));
  
  // Limpar formulário
  document.getElementById('inputNome').value = '';
  document.getElementById('inputEmail').value = '';
  document.getElementById('inputPerfil').value = '';
  document.getElementById('inputSenha').value = '';
  document.getElementById('inputConfirm').value = '';
  
  alert('Usuário cadastrado com sucesso!');
  loadUsuarios();
}

function loadUsuarios() {
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const tbody = document.getElementById('tbodyUsuarios');
  const table = document.getElementById('usuariosTable');
  const emptyMsg = document.getElementById('emptyMsg');
  
  if (usuarios.length === 0) {
    table.style.display = 'none';
    emptyMsg.style.display = 'block';
    return;
  }
  
  tbody.innerHTML = '';
  usuarios.forEach(user => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${user.nome}</td>
      <td>${user.email}</td>
      <td><span class="badge">${user.perfil}</span></td>
      <td>${user.ativo ? 'Ativo' : 'Inativo'}</td>
      <td>
        <button class="btn-danger" onclick="deleteUsuario(${user.id})">Deletar</button>
      </td>
    `;
  });
  
  emptyMsg.style.display = 'none';
  table.style.display = 'table';
}

function deleteUsuario(id) {
  if (!confirm('Tem certeza que deseja deletar este usuário?')) return;
  
  let usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  usuarios = usuarios.filter(u => u.id !== id);
  localStorage.setItem('usuarios', JSON.stringify(usuarios));
  
  loadUsuarios();
  alert('Usuário deletado com sucesso!');
}
