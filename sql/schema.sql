-- VA Business - Sistema Financeiro v1.0.0 • Desenvolvido por OliverStorage
-- Schema: Estrutura completa do banco de dados

-- 1. ROLES (Perfis)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(50) UNIQUE NOT NULL
);

-- 2. UNIDADES (Franquias)
CREATE TABLE IF NOT EXISTS unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14) UNIQUE NOT NULL,
  endereco TEXT,
  telefone VARCHAR(20),
  responsavel VARCHAR(255),
  data_criacao TIMESTAMP DEFAULT now(),
  ativa BOOLEAN DEFAULT true
);

-- 3. USUÁRIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  nome_completo VARCHAR(255),
  role_id UUID NOT NULL REFERENCES roles(id),
  unidade_id UUID REFERENCES unidades(id),
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP DEFAULT now()
);

-- 4. CONTAS BANCÁRIAS
CREATE TABLE IF NOT EXISTS contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  banco VARCHAR(100),
  agencia VARCHAR(10),
  numero_conta VARCHAR(20),
  tipo VARCHAR(20),
  saldo_inicial DECIMAL(15,2),
  data_abertura DATE,
  ativa BOOLEAN DEFAULT true
);

-- 5. CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  nome_cliente VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14),
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco TEXT,
  data_inicio_cobranca DATE,
  status VARCHAR(50) DEFAULT 'ativo',
  data_criacao TIMESTAMP DEFAULT now(),
  data_atualizacao TIMESTAMP DEFAULT now(),
  UNIQUE(unidade_id, cnpj)
);

-- 6. POSSÍVEIS PAGANTES
CREATE TABLE IF NOT EXISTS possíveis_pagantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nome_alternativo VARCHAR(255),
  cpf_cnpj VARCHAR(14),
  tipo_relacao VARCHAR(50),
  observacoes TEXT,
  data_criacao TIMESTAMP DEFAULT now()
);

-- 7. CONTRATOS DE SERVIÇO
CREATE TABLE IF NOT EXISTS contratos_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo_servico VARCHAR(100),
  valor_mensal DECIMAL(15,2),
  data_inicio DATE,
  data_fim DATE,
  status VARCHAR(50) DEFAULT 'ativo',
  descricao TEXT,
  data_criacao TIMESTAMP DEFAULT now()
);

-- 8. EXTRATOS MOVIMENTAÇÕES
CREATE TABLE IF NOT EXISTS extratos_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_bancaria_id UUID NOT NULL REFERENCES contas_bancarias(id) ON DELETE CASCADE,
  data_movimento DATE NOT NULL,
  descricao_banco VARCHAR(255),
  tipo_operacao VARCHAR(50),
  valor DECIMAL(15,2) NOT NULL,
  saldo_pos_operacao DECIMAL(15,2),
  cliente_identificado_id UUID REFERENCES clientes(id),
  pagante_identificado_id UUID REFERENCES possíveis_pagantes(id),
  confianca_matching DECIMAL(3,2),
  tipo_pagamento VARCHAR(50),
  referencia_boleto VARCHAR(100),
  conciliado BOOLEAN DEFAULT false,
  flag_revisar BOOLEAN DEFAULT false,
  data_importacao TIMESTAMP DEFAULT now(),
  UNIQUE(conta_bancaria_id, data_movimento, descricao_banco, valor)
);

-- 9. PAGAMENTOS IDENTIFICADOS
CREATE TABLE IF NOT EXISTS pagamentos_identificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movimentacao_id UUID NOT NULL UNIQUE REFERENCES extratos_movimentacoes(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  data_pagamento DATE,
  valor_pagamento DECIMAL(15,2),
  identificado_por VARCHAR(50),
  usuario_confirmacao UUID REFERENCES usuarios(id),
  data_confirmacao TIMESTAMP,
  observacoes TEXT,
  contrato_servico_id UUID REFERENCES contratos_servico(id),
  mes_referencia VARCHAR(7)
);

-- 10. ROLE PERMISSÕES
CREATE TABLE IF NOT EXISTS role_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  modulo VARCHAR(100) NOT NULL,
  acao VARCHAR(100) NOT NULL,
  UNIQUE(role_id, modulo, acao)
);

-- 11. FLAGS AUDITORIA
CREATE TABLE IF NOT EXISTS flags_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movimentacao_id UUID NOT NULL REFERENCES extratos_movimentacoes(id) ON DELETE CASCADE,
  tipo_flag VARCHAR(50),
  descricao TEXT,
  severidade VARCHAR(50),
  resolvida BOOLEAN DEFAULT false,
  data_criacao TIMESTAMP DEFAULT now()
);

-- 12. AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  acao VARCHAR(255),
  tabela_afetada VARCHAR(100),
  registro_id UUID,
  data_acao TIMESTAMP DEFAULT now()
);

-- 13. SISTEMAS (Metadados)
CREATE TABLE IF NOT EXISTS sistemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_sistema VARCHAR(255) NOT NULL,
  versao VARCHAR(20) NOT NULL,
  desenvolvedor VARCHAR(255) DEFAULT 'OliverStorage',
  data_criacao TIMESTAMP DEFAULT now(),
  descricao TEXT,
  tecnologias VARCHAR(500)
);

-- Inserir roles padrão
INSERT INTO roles (nome) VALUES ('administrador'), ('gerente'), ('usuario') ON CONFLICT DO NOTHING;

-- Inserir metadados do sistema
INSERT INTO sistemas (nome_sistema, versao, desenvolvedor, descricao, tecnologias)
VALUES ('VA Business - Sistema Financeiro', '1.0.0', 'OliverStorage', 'Gestão de contas a receber para grupo de escritórios', 'React, TypeScript, Supabase, PostgreSQL')
ON CONFLICT DO NOTHING;
