# VA Business - Sistema Financeiro v1.0.0

Desenvolvido por **OliverStorage**

## 🎯 Funcionalidades

✅ **Autenticação** - Login com email/senha
✅ **Controle de Acesso** - Admin > Gerente > Usuário
✅ **Cadastro de Unidades** - Franquias/escritórios
✅ **Gestão de Usuários** - Apenas Admin/Gerente podem criar
✅ **Importação XLS** - Extratos bancários
✅ **Dashboard** - Contadores e métricas

## 🚀 Como Usar

### 1. Extrair ZIP
```
Descompacte va-business-*.zip
```

### 2. Abrir no Navegador
```
Abra arquivo: index.html
```

### 3. Login Inicial
- Email: admin@va.com
- Senha: 123456

## 📝 Testes

### TESTE 1: Criar Unidade
1. Login com admin
2. Configuração → Unidades
3. Preencha: Nome, CNPJ
4. Clique: + Adicionar Unidade
5. ✓ Deve aparecer na tabela

### TESTE 2: Criar Usuário
1. Configuração → Usuários
2. Selecione franquia
3. Perfil: Gerente
4. Preencha: Nome, Email, Senha
5. Clique: + Criar Usuário
6. ✓ Deve aparecer na tabela

### TESTE 3: Login com Novo Usuário
1. Clique: Sair
2. Entre com novo email/senha
3. ✓ Deve logar e ir para Dashboard

### TESTE 4: Importar Extratos
1. Extratos → Selecionar Arquivo
2. Crie arquivo.xlsx com:
   - Data | Descrição | Valor | Saldo
   - 01/01/2024 | PIX XYZ | 1000 | 5000
3. Importe
4. ✓ Deve aparecer na tabela

## 🔐 Hierarquia de Acesso

| Ação | Admin | Gerente | Usuário |
|------|-------|---------|---------|
| Criar Unidade | ✅ | ❌ | ❌ |
| Criar Usuário | ✅ | ✅* | ❌ |
| Ver Usuários | ✅ Todas | ✅ Sua unidade | ❌ |
| Importar Extratos | ✅ | ✅ | ❌ |
| Dashboard | ✅ | ✅ | ✅ |

*Gerente só cria usuários da sua franquia

## 📂 Estrutura

```
va-business/
├── index.html
├── README.md
├── html/
│   ├── login.html
│   ├── dashboard.html
│   ├── extratos.html
│   └── configuracao.html
├── css/
│   ├── styles.css
│   ├── navbar.css
│   └── auth.css
├── js/
│   ├── auth.js
│   ├── configuracao.js
│   └── importador.js
└── sql/
    └── schema.sql
```

## ✅ Checklist de Testes

- [ ] Landing page abre
- [ ] Login funciona (admin@va.com / 123456)
- [ ] Criar unidade funciona
- [ ] Criar usuário funciona
- [ ] Login com novo usuário funciona
- [ ] Importar XLS funciona
- [ ] Dashboard mostra contadores

## 🔄 Próximas Versões

- Conectar Supabase (trocar localStorage)
- Matching Levenshtein
- Relatórios PDF/Excel
- APIs bancárias automáticas

---

**Versão**: 1.0.0  
**Commit**: `git commit -m "v1.0.0 - MVP: Landing + Auth + Importação XLS + Matching"`
