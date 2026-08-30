# 🔗 Como Integrar ao Projeto Existente

Guia simples para adicionar as melhorias ao seu Vettore Finances v1.5.1.

---

## 📋 Arquivos a Usar

Existem apenas **3 arquivos** novos:

```
1. js/importador-melhorado.js    (Substitui importador.js)
2. css/revisao.css               (Novo CSS)
3. html/extratos.html            (Substitui extratos.html)
```

---

## ✅ Passo 1: Fazer Backup

```bash
# Salve os arquivos originais
cp js/importador.js js/importador.backup.js
cp html/extratos.html html/extratos.backup.html
```

---

## ✅ Passo 2: Copiar Novos Arquivos

```bash
# 1. Copie o novo JavaScript
cp importador-melhorado.js seu-projeto/js/

# 2. Copie o CSS de revisão
cp revisao.css seu-projeto/css/

# 3. Substitua a página
cp extratos.html seu-projeto/html/
```

---

## ✅ Passo 3: Atualizar Referências (se necessário)

Se você usa `importador.js` em outros lugares:

```html
<!-- ANTES -->
<script src="../js/importador.js"></script>

<!-- DEPOIS -->
<script src="../js/importador-melhorado.js"></script>
```

---

## ✅ Passo 4: Testar

```
1. Abra seu navegador
2. Vá para: seu-projeto/html/extratos.html
3. Clique em "Importar XLS/XLSX"
4. Selecione um arquivo
5. Verifique se modal de revisão aparece
6. Edite campos
7. Clique "Importar"
```

---

## 🔄 Se Algo Der Errado

### Opção 1: Restaurar

```bash
# Voltar ao original
cp js/importador.backup.js js/importador.js
cp html/extratos.backup.html html/extratos.html
```

### Opção 2: Limpar Cache

```
1. Pressione F12 (abrir DevTools)
2. Ir em "Application"
3. Local Storage → limpar tudo
4. Recarregar página
```

---

## 📝 O Que Mudou

### JavaScript

**Antes:**
```javascript
// Classificação manual
extratos.push({
  descricao: '...',
  valor: 100
});
```

**Depois:**
```javascript
// Classificação automática
extratos.forEach(e => {
  e.classificacao = classificarLancamento(e);
});
mostrarRevisao(extratos);
```

### HTML

**Antes:**
```html
<th>Descrição</th>
<th>Valor</th>
```

**Depois:**
```html
<th>Descrição</th>
<th>Valor</th>
<th>Categoria</th>    <!-- NOVO -->
<th>Cliente</th>      <!-- NOVO -->
<th>Ações</th>
```

### CSS

Apenas adicionado (não remove nada):
```css
.modal-revisao { ... }
.revisao-item { ... }
/* etc */
```

---

## 🎯 Funcionalidade Nova

### Modal de Revisão

Aparece quando você importa arquivo:

```
┌─────────────────────────┐
│ Revisar Classificações  │
│                         │
│ 1. PIX JOÃO SILVA       │ Confiança: 85%
│   Categoria: [Receita]  │
│   Cliente: [João Silva] │
│   Tipo: [PIX]           │
│   ...                   │
│                         │
│ [Cancelar] [Importar]   │
└─────────────────────────┘
```

---

## 📱 Compatibilidade

- ✅ Chrome / Firefox / Safari / Edge
- ✅ Desktop e Mobile
- ✅ localStorage (funciona offline)
- ✅ Supabase-ready (preparado para upgrade)

---

## 🔐 Segurança

Não muda nada:
- ✅ Usa localStorage (local apenas)
- ✅ Sem requisições externas
- ✅ Sem mudanças em autenticação
- ✅ Compatível com RLS do Supabase

---

## 📊 Dados Mantidos

Se você já tem extratos salvos:

```javascript
// Dados antigos são mantidos
// Apenas novos campos são adicionados

const extratoAntigo = {
  descricao: '...',
  valor: 100
  // (sem categoria, cliente, etc)
};

// Depois da atualização
const extratoNovo = {
  descricao: '...',
  valor: 100,
  categoria: '',     // NOVO (vazio)
  cliente: '',       // NOVO (vazio)
  // ... etc
};
```

---

## 🚀 Deploy para Produção

```bash
# 1. Commitá as mudanças
git add js/importador-melhorado.js css/revisao.css html/extratos.html
git commit -m "feat: Adicionar classificação inteligente em extratos"

# 2. Push para produção
git push origin main

# 3. Deploy (depende seu hosting)
npm run deploy
# ou
vercel
# ou seu processo
```

---

## 💡 Dicas

### Adicionar Mais Categorias

Em `js/importador-melhorado.js`, função `classificarLancamento()`:

```javascript
if (texto.includes('sua_palavra')) {
  return {
    tipo_receita: 'Seu Tipo',
    categoria: 'Sua Categoria',
    confianca: 80
  };
}
```

### Mudar Estilo do Modal

Em `css/revisao.css`:

```css
.modal-content {
  background: #seu_color;
  max-width: 900px; /* Mudar largura */
  /* etc */
}
```

### Debug

```javascript
// No console (F12)
console.log(localStorage.getItem('extratos'));
console.log(window.extratosRevisao);
```

---

## ✨ Resultado Final

Depois de integrar:

1. ✅ Página funciona igual antes
2. ✅ Mas agora tem "Importar"
3. ✅ Após upload, modal de revisão
4. ✅ Edita todas as informações
5. ✅ Salva com novos campos
6. ✅ Tabela mostra Categoria + Cliente

---

## 📞 Suporte

Se tiver dúvida:

1. Verificar console (F12)
2. Ver arquivo README.md
3. Comparar com extratos.backup.html
4. Restaurar se necessário

---

## ✅ Checklist Final

- [ ] Backup dos arquivos originais feito
- [ ] 3 arquivos novos copiados
- [ ] Arquivo extratos.html atualizado
- [ ] Página carrega sem erros
- [ ] Botão "Importar" funciona
- [ ] Modal aparece após upload
- [ ] Pode editar campos
- [ ] Importação salva corretamente
- [ ] Dados aparecem na tabela

---

**Pronto!** Sua integração está completa. 🎉
