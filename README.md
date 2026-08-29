# VA Business - Sistema Financeiro v1.0.0

## 🚀 Quick Start

### 1. Abrir no Navegador
```
Abrir arquivo: index.html
```

### 2. Teste da Landing Page
✅ Clique em "Entrar" ou "Novo Usuário"
- Deve ir para página de login

## 📝 TESTES - PASSO A PASSO

### TESTE 1: Cadastro de Usuário
1. **Vá para**: Configuração → Novo Registro de Usuário
2. **Preencha**:
   - Nome: João Silva
   - Email: joao@email.com
   - Perfil: Administrador
   - Senha: 123456
   - Confirmar: 123456
3. **Clique**: "+ Adicionar Usuário"
4. **Esperado**: Mensagem "Usuário cadastrado com sucesso!"
5. **Verifique**: Lista abaixo mostra novo usuário

### TESTE 2: Login com Usuário Criado
1. **Clique**: Sair (logout)
2. **Vá para**: Login
3. **Preencha**:
   - Email: joao@email.com
   - Senha: 123456
4. **Clique**: Entrar
5. **Esperado**: Deve ir para Dashboard
6. **Verifique**: Nome "João Silva" aparece na navbar

### TESTE 3: Dashboard
1. **Verificar contadores**:
   - Usuários: Deve mostrar número de usuários cadastrados
   - Extratos: Deve mostrar 0 (ainda não importou)

### TESTE 4: Importação XLS
1. **Vá para**: Extratos → Upload de Arquivo
2. **Crie arquivo de teste**:
   ```
   Data       | Descrição           | Valor      | Saldo
   01/01/2024 | PIX CLIENTE XYZ     | 1000,00    | 5000,00
   02/01/2024 | BOLETO EMPRESA ABC  | 500,00     | 5500,00
   03/01/2024 | TARIFA BANCO        | -50,00     | 5450,00
   ```
   - Salve como: `extratos.xlsx`

3. **Importe o arquivo**:
   - Clique: "📁 Selecionar Arquivo"
   - Selecione: extratos.xlsx
4. **Esperado**: 
   - Mensagem: "✓ 3 extratos importados com sucesso!"
   - Página recarrega
   - Tabela mostra 3 linhas

5. **Verifique dados**:
   - Data está correta
   - Descrição aparece
   - Valores aparecem
   - Tipos detectados (PIX, Boleto, etc)

### TESTE 5: Dashboard Atualizado
1. **Volte**: Dashboard
2. **Verificar**:
   - Contador "Extratos" deve mostrar 3

### TESTE 6: Múltiplos Usuários
1. **Vá para**: Configuração
2. **Adicione mais usuários**:
   - Maria Santos | maria@email.com | Gerente
   - Pedro Costa | pedro@email.com | Usuário
3. **Verifique**: Todos aparecem na tabela

### TESTE 7: Deletar Usuário
1. **Na tabela**, clique em "Deletar" para um usuário
2. **Confirme** no popup
3. **Esperado**: Usuário some da lista

### TESTE 8: Validação de Formulário
1. **Tente cadastrar sem preencher**:
   - Deixe Nome vazio → Alerta: "Preencha todos os campos"
2. **Tente senhas diferentes**:
   - Senha: 123456
   - Confirmar: 654321
   - Esperado: "Senhas não conferem"
3. **Tente senha muito curta**:
   - Senha: 12
   - Esperado: "Senha deve ter no mínimo 6 caracteres"
4. **Tente email duplicado**:
   - Email que já existe
   - Esperado: "Email já cadastrado"

## ✅ Checklist de Teste Completo

- [ ] Landing page carrega corretamente
- [ ] Login funciona com usuário cadastrado
- [ ] Logout desconecta
- [ ] Cadastro de usuário funciona
- [ ] Usuários aparecem na tabela
- [ ] Deletar usuário funciona
- [ ] Validações funcionam
- [ ] Importação de XLS funciona
- [ ] Extratos aparecem na tabela
- [ ] Dashboard mostra contadores corretos
- [ ] Tipos de pagamento detectam corretamente (PIX, Boleto, etc)

## 🔍 Dados Salvos (localStorage)

Após testes, seu navegador terá:
```
localStorage.usuarios → Array de usuários cadastrados
localStorage.currentUser → Usuário logado
localStorage.extratos → Array de extratos importados
```

Para limpar tudo:
```javascript
// Abra console (F12) e execute:
localStorage.clear();
```

## 📊 Estrutura de Dados

### Usuário
```javascript
{
  id: 1234567890,
  nome: "João Silva",
  email: "joao@email.com",
  perfil: "administrador",
  senha: "123456",
  ativo: true,
  data_criacao: "29/08/2026"
}
```

### Extrato
```javascript
{
  id: 1234567890,
  data: "01/01/2024",
  descricao: "PIX CLIENTE XYZ",
  valor: 1000.00,
  saldo: 5000.00,
  tipo_pagamento: "PIX",
  tipo_operacao: "crédito"
}
```

## 🎯 Próximas Versões

- [ ] Conectar Supabase (trocar localStorage)
- [ ] Relatórios PDF
- [ ] APIs bancárias automáticas
- [ ] Matching IA (Levenshtein)

---

**Desenvolvido por OliverStorage**  
**Versão**: 1.0.0
