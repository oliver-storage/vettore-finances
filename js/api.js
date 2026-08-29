/**
 * VA Business - Sistema Financeiro v1.0.0
 * Desenvolvido por OliverStorage
 * Módulo: API Supabase
 */

const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';

class SupabaseAPI {
  constructor() {
    this.url = SUPABASE_URL;
    this.key = SUPABASE_KEY;
  }
  
  async fetch(table, options = {}) {
    const url = `${this.url}/rest/v1/${table}`;
    const headers = {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json'
    };
    
    try {
      const response = await fetch(url, { headers, ...options });
      return await response.json();
    } catch (error) {
      console.error(`Erro ao buscar ${table}:`, error);
      return [];
    }
  }
  
  async getClientes(unidadeId) {
    return this.fetch(`clientes?unidade_id=eq.${unidadeId}`);
  }
  
  async getExtratos(contaId) {
    return this.fetch(`extratos_movimentacoes?conta_bancaria_id=eq.${contaId}`);
  }
  
  async insertExtrato(data) {
    const url = `${this.url}/rest/v1/extratos_movimentacoes`;
    const headers = {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json'
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao inserir extrato:', error);
      return null;
    }
  }
  
  async updatePagamento(pagamentoId, data) {
    const url = `${this.url}/rest/v1/pagamentos_identificados?id=eq.${pagamentoId}`;
    const headers = {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json'
    };
    
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      return null;
    }
  }
}

const api = new SupabaseAPI();
