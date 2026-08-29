/**
 * VA Business - Sistema Financeiro v1.0.0
 * Desenvolvido por OliverStorage
 * Módulo: Autenticação
 */

function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const user = usuarios.find(u => u.email === email && u.senha === password);
  
  if (!user) {
    alert('Email ou senha inválidos');
    return;
  }
  
  localStorage.setItem('currentUser', JSON.stringify(user));
  window.location.href = 'dashboard.html';
}

function logout() {
  localStorage.removeItem('currentUser');
  window.location.href = '../index.html';
}

function checkAuth() {
  const user = localStorage.getItem('currentUser');
  const path = window.location.pathname;
  
  if (!user && !path.includes('login') && !path.includes('index')) {
    window.location.href = '../html/login.html';
  }
}
