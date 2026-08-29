/**
 * VA Business - Sistema Financeiro v1.0.0
 * Desenvolvido por OliverStorage
 * Módulo: Main
 */

// Inicializar com dados do localStorage
document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('user')) || { name: 'Usuário', email: 'email@example.com' };
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userEmail').textContent = user.email;
  document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
});

function logout() {
  localStorage.removeItem('user');
  window.location.href = '/';
}

function goTo(url) {
  window.location.href = url;
}

function novoCliente() {
  alert('Novo cliente - em desenvolvimento');
}

function novoUsuario() {
  alert('Novo usuário - em desenvolvimento');
}

function importarExtrato(event) {
  const file = event.target.files[0];
  if (!file) return;
  alert('Importação de ' + file.name + ' - em desenvolvimento');
}

function switchTab(tabName) {
  const tabs = document.querySelectorAll('.tab-content');
  const btns = document.querySelectorAll('.tab-btn');
  
  tabs.forEach(t => t.classList.remove('active'));
  btns.forEach(b => b.classList.remove('active'));
  
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');
}
