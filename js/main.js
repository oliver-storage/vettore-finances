/**
 * VA Business - Sistema Financeiro v1.0.0
 * Desenvolvido por OliverStorage
 * Módulo: Main
 */

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadUserInfo();
});

function checkAuth() {
  const user = localStorage.getItem('user');
  if (!user && !window.location.pathname.includes('login') && !window.location.pathname.includes('cadastro') && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
    window.location.href = '../html/login.html';
  }
}

function loadUserInfo() {
  const user = JSON.parse(localStorage.getItem('user')) || { name: 'Usuário', email: 'email@example.com' };
  
  const nameEl = document.getElementById('userName');
  const emailEl = document.getElementById('userEmail');
  const avatarEl = document.getElementById('userAvatar');
  
  if (nameEl) nameEl.textContent = user.name;
  if (emailEl) emailEl.textContent = user.email;
  if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
}

function logout() {
  localStorage.removeItem('user');
  window.location.href = '../index.html';
}

function goTo(url) {
  window.location.href = url;
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  importarExtratoXLS(file);
}
