# Vettore Finances v1.5.2 - Extratos Melhorados

Melhorias na importação de extratos com **classificação automática** e **dupla interpretação**.

---

## 📋 O Que Mudou

✅ **Classificação Automática** - Sistema propõe categorias
✅ **Dupla Interpretação** - Você edita antes de salvar
✅ **Novos Campos:**
   - Categoria
   - Cliente
   - Serviço
   - Tipo de Receita
   - Observação

✅ **Modal de Revisão** - Edite tudo antes de confirmar

---

## 🚀 Como Usar

### 1. Integrar os Arquivos

Copie para seu projeto existente:

```
seu-projeto-vettore/
├── js/
│   └── importador-melhorado.js     (novo)
├── css/
│   └── revisao.css                 (novo)
└── html/
    └── extratos.html               (substituir)
```

### 2. Atualizar HTML

Em `html/extratos.html`, adicione:

```html
<!-- No <head> -->
<link rel="stylesheet" href="../css/revisao.css">

<!-- Antes do </body> -->
<script src="../js/importador-melhorado.js"></script>
```

### 3. Usar

1. Clique em "Importar XLS/XLSX"
2. Selecione arquivo
3. **Modal aparece com classificações propostas**
4. **Edite cada linha**
5. Clique "Importar" para salvar

---

## 🤖 Classificação Automática

O sistema detecta automaticamente:

| Texto | Categoria | Tipo de Receita | Confiança |
|-------|-----------|-----------------|-----------|
| PIX | Entrada/Saída | PIX | 85% |
| Boleto | Custeio/Receita | Boleto | 80% |
| Tarifa | Custeio | Tarifa | 90% |
| Aluguel | Custeio | Aluguel | 85% |
| Folha/Salário | Custeio | Folha | 90% |
| Consultoria | Receita | Serviço | 75% |

---

## 📊 Novos Campos

Cada lançamento agora tem:

```json
{
  "data": "02/01/2025",
  "descricao": "PIX JOÃO SILVA",
  "valor": 1000.50,
  "tipo_operacao": "crédito",
  
  "categoria": "Receita",           // NOVO
  "cliente": "João Silva",          // NOVO
  "servico": "Consultoria",         // NOVO
  "tipo_receita": "PIX",            // NOVO
  "observacao": "Revisão de código" // NOVO
}
```

---

## 🎯 Exemplo de Uso

```
1. Upload de arquivo
   ↓
2. Parser lê dados
   ↓
3. Sistema classifica automaticamente
   ↓
4. Modal de Revisão aparece
   ├─ Vê classificação proposta
   ├─ Edita campos conforme necessário
   ├─ Observa confiança (%)
   └─ Confirma importação
   ↓
5. Lançamentos salvos em localStorage
   (com histórico de edições)
```

---

## 💾 Armazenamento

Atualmente usa **localStorage**, mas estrutura preparada para:
- Supabase
- PostgreSQL
- MySQL
- MongoDB

Para mudar, edite `salvarExtratos()` em `importador-melhorado.js`.

---

## 📝 Campos de Entrada

### Modal de Revisão

```
Categoria:      [Serviço, Custeio, Receita, etc]
Tipo Receita:   [PIX, Boleto, Tarifa, etc]
Cliente:        [Nome do cliente/fornecedor]
Serviço:        [Descrição do serviço]
Observação:     [Notas adicionais]
Valor:          [Somente leitura - R$ xxx,xx]
```

---

## 🔧 Personalização

### Adicionar Novas Classificações

Em `classificarLancamento()`, adicione:

```javascript
if (texto.includes('minha_palavra')) {
  return {
    tipo_receita: 'Meu Tipo',
    categoria: 'Minha Categoria',
    confianca: 80
  };
}
```

### Mudar Estilos

Edite `css/revisao.css`:

```css
.modal-content {
  max-width: 1000px; /* Aumentar largura */
  background: #f0f0f0; /* Mudar cor */
}
```

---

## ✅ Checklist de Integração

- [ ] Copiar `importador-melhorado.js` para `js/`
- [ ] Copiar `revisao.css` para `css/`
- [ ] Substituir `html/extratos.html`
- [ ] Adicionar link do CSS em `<head>`
- [ ] Adicionar script no `</body>`
- [ ] Testar com arquivo XLS
- [ ] Revisar classificações no modal
- [ ] Confirmar importação
- [ ] Verificar dados em localStorage

---

## 📞 Troubleshooting

### Modal não aparece
```javascript
// Verificar se revisao.css está carregado
console.log(document.querySelector('.modal-revisao'));
```

### Classificação não funciona
```javascript
// Verificar função
const result = classificarLancamento({
  descricao: 'PIX JOÃO',
  tipo_operacao: 'crédito'
});
console.log(result);
```

### Dados não salvam
```javascript
// Verificar localStorage
console.log(localStorage.getItem('extratos'));
```

---

## 🚀 Próximas Melhorias

- [ ] Salvar edições em histórico
- [ ] Aprendizado: melhorar classificação com tempo
- [ ] Integrar com Supabase
- [ ] Dashboard com gráficos
- [ ] Relatórios por categoria
- [ ] Exportar para Excel

---

## 📌 Versão

- **Vettore Finances v1.5.2**
- Base: v1.5.1
- Melhorias: Classificação inteligente
- Status: Production-ready

---

## 📄 Licença

Proprietary - Desenvolvido por OliverStorage

---

**Última atualização:** 2026-01-15
