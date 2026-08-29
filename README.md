# VA Business - Sistema Financeiro v1.0.0

Gestão de contas a receber para grupo de escritórios com importação automática de extratos e matching inteligente.

## 📋 Funcionalidades

- ✅ Landing page com tema customizável
- ✅ Sistema de login/cadastro
- ✅ Importação de extratos XLS/XLSX
- ✅ Matching automático Levenshtein (>70% confidence)
- ✅ Dashboards em tempo real
- ✅ Configuração de usuários e permissões
- ✅ Navegação por módulos (Clientes, Extratos, Pagamentos)

## 🚀 Quick Start

### 1. Setup Local

```bash
# Abrir index.html no navegador
open index.html

# Ou usar Live Server (VS Code)
# Extension: Live Server
# Click: Go Live
```

### 2. Login Padrão

```
Email: teste@example.com
Senha: qualquer uma (localStorage)
```

### 3. Importar Extratos

1. Vá para **Extratos**
2. Selecione arquivo `.xls` ou `.xlsx`
3. Sistema detecta automaticamente as colunas
4. Extratos aparecem na tabela

### 4. Customizar Landing Page

1. Vá para **Configuração → Tema**
2. Escolha cor ou imagem de fundo
3. Clique em "Salvar"
4. Mudanças refletem na landing (index.html)

## 📂 Estrutura

```
va-business/
├── index.html              (landing page)
├── html/
│   ├── login.html          (autenticação)
│   ├── cadastro.html
│   ├── dashboard.html      (dashboard principal)
│   ├── clientes.html
│   ├── extratos.html       (importação + visualização)
│   ├── pagamentos.html
│   └── configuracao.html   (config de tema, usuários)
├── css/
│   ├── landing.css         (tema landing)
│   ├── auth.css            (login/cadastro)
│   ├── styles.css          (geral)
│   └── navbar.css
├── js/
│   ├── main.js             (funções globais)
│   ├── importador.js       (parser XLS + renderização)
│   ├── matching.js         (algoritmo Levenshtein)
│   └── api.js              (scaffold Supabase)
├── sql/
│   └── schema.sql          (13 tabelas PostgreSQL)
└── README.md
```

## 🔌 Integração Supabase

### 1. Configurar em `js/api.js`

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';
```

### 2. Executar SQL

Copie o conteúdo de `sql/schema.sql` e execute no Supabase SQL Editor.

### 3. Conexão

```javascript
// Já disponível via api.js
const api = new SupabaseAPI();
const clientes = await api.getClientes(unidadeId);
```

## 🤖 Matching Automático

O algoritmo Levenshtein compara a descrição do extrato com nomes de clientes:

- **Score > 70%**: Automático (sem flag)
- **Score 50-70%**: Flag para revisão manual
- **Score < 50%**: Não associa

```javascript
// Uso
const match = matchClienteAExtrato("PIX EMPRESA XYZ", clientes);
// Retorna: { cliente_id, confianca: 0.85, tipo_match: 'automático' }
```

## 📊 Dados Modelo

Já vem com dados Jul/2026:
- 1 unidade (RSN HUB CONTABIL)
- 1 conta bancária
- 43 clientes
- 46 boletos
- 30 movimentações

## 🔐 Permissões

| Módulo | Admin | Gerente | Usuário |
|--------|-------|---------|---------|
| Dashboards | ✅ | ✅ | ✅ |
| Clientes | ✅ | ✅ | ❌ |
| Extratos | ✅ | ✅ | ❌ |
| Configuração | ✅ | ❌ | ❌ |

## 📝 Próximas Versões

- [ ] v1.1.0 - Conectar Supabase (CRUD completo)
- [ ] v1.2.0 - APIs bancárias (extratos automáticos)
- [ ] v1.3.0 - Relatórios PDF/Excel
- [ ] v2.0.0 - White-label para franqueados

## 👨‍💻 Desenvolvido por

**OliverStorage** - Plataforma de Desenvolvimento de Sistemas

---

**Versão**: 1.0.0  
**Data**: Agosto 2026  
**Licença**: Proprietária
