-- VA Business - Sistema Financeiro v1.0.0 • Desenvolvido por OliverStorage
-- Schema: Banco de Dados Completo

-- 1. ROLES (Perfis de Acesso)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(50) UNIQUE NOT NULL,
  descricao TEXT,
  data_criacao TIMESTAMP DEFAULT now()
);

-- 2. UNIDADES (Franquias/Escritórios)
CREATE TABLE IF NOT EXISTS unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14) UNIQUE NOT NULL,
  endereco TEXT,
  telefone VARCHAR(20),
  email VARCHAR(255),
  responsavel VARCHAR(255),
  data_criacao TIMESTAMP DEFAULT now(),
  data_atualizacao TIMESTAMP DEFAULT now(),
  ativa BOOLEAN DEFAULT true
);

-- 3. USUÁRIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nome_completo VARCHAR(255),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  unidade_id UUID REFERENCES unidades(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP DEFAULT now(),
  ultimo_acesso TIMESTAMP
);

-- 4. CONTAS BANCÁRIAS
CREATE TABLE IF NOT EXISTS contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  banco VARCHAR(100),
  agencia VARCHAR(10),
  numero_conta VARCHAR(20),
  tipo VARCHAR(20),
  saldo_inicial DECIMAL(15,2) DEFAULT 0,
  data_abertura DATE,
  data_criacao TIMESTAMP DEFAULT now(),
  ativa BOOLEAN DEFAULT true
);

-- 5. CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  nome_cliente VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14),
  cpf VARCHAR(11),
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco TEXT,
  data_inicio_cobranca DATE,
  status VARCHAR(50) DEFAULT 'ativo',
  observacoes TEXT,
  data_criacao TIMESTAMP DEFAULT now(),
  data_atualizacao TIMESTAMP DEFAULT now(),
  UNIQUE(unidade_id, cnpj)
);

-- 6. POSSÍVEIS PAGANTES (Nomes alternativos)
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
  mes_vencimento VARCHAR(2),
  status VARCHAR(50) DEFAULT 'ativo',
  descricao TEXT,
  data_criacao TIMESTAMP DEFAULT now(),
  data_atualizacao TIMESTAMP DEFAULT now()
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
  cliente_identificado_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  pagante_identificado_id UUID REFERENCES possíveis_pagantes(id) ON DELETE SET NULL,
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
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  contrato_servico_id UUID REFERENCES contratos_servico(id) ON DELETE SET NULL,
  data_pagamento DATE,
  valor_pagamento DECIMAL(15,2),
  mes_referencia VARCHAR(7),
  identificado_por VARCHAR(50),
  usuario_confirmacao UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  data_confirmacao TIMESTAMP,
  observacoes TEXT,
  data_criacao TIMESTAMP DEFAULT now()
);

-- 10. ROLE PERMISSÕES
CREATE TABLE IF NOT EXISTS role_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  modulo VARCHAR(100) NOT NULL,
  acao VARCHAR(100) NOT NULL,
  data_criacao TIMESTAMP DEFAULT now(),
  UNIQUE(role_id, modulo, acao)
);

-- 11. FLAGS AUDITORIA
CREATE TABLE IF NOT EXISTS flags_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movimentacao_id UUID NOT NULL REFERENCES extratos_movimentacoes(id) ON DELETE CASCADE,
  tipo_flag VARCHAR(50) NOT NULL,
  descricao TEXT,
  severidade VARCHAR(50) DEFAULT 'media',
  resolvida BOOLEAN DEFAULT false,
  usuario_resolucao UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  data_resolucao TIMESTAMP,
  data_criacao TIMESTAMP DEFAULT now()
);

-- 12. AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  acao VARCHAR(255),
  tabela_afetada VARCHAR(100),
  registro_id UUID,
  dados_anteriores JSONB,
  dados_novos JSONB,
  data_acao TIMESTAMP DEFAULT now()
);

-- 13. SISTEMAS (Metadados)
CREATE TABLE IF NOT EXISTS sistemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_sistema VARCHAR(255) NOT NULL UNIQUE,
  versao VARCHAR(20) NOT NULL,
  desenvolvedor VARCHAR(255) DEFAULT 'OliverStorage',
  data_criacao TIMESTAMP DEFAULT now(),
  descricao TEXT,
  tecnologias VARCHAR(500)
);

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_extratos_data ON extratos_movimentacoes(data_movimento);
CREATE INDEX idx_extratos_cliente ON extratos_movimentacoes(cliente_identificado_id);
CREATE INDEX idx_clientes_unidade ON clientes(unidade_id);
CREATE INDEX idx_contas_unidade ON contas_bancarias(unidade_id);
CREATE INDEX idx_pagamentos_cliente ON pagamentos_identificados(cliente_id);
CREATE INDEX idx_flags_movimentacao ON flags_auditoria(movimentacao_id);

-- INSERT ROLES PADRÃO
INSERT INTO roles (nome, descricao) VALUES 
  ('administrador', 'Acesso total ao sistema'),
  ('gerente', 'Gerenciamento de unidade'),
  ('usuario', 'Acesso básico')
ON CONFLICT (nome) DO NOTHING;

-- INSERT PERMISSÕES PADRÃO
INSERT INTO role_permissoes (role_id, modulo, acao)
SELECT id, 'dashboards', 'read' FROM roles WHERE nome = 'administrador'
UNION ALL
SELECT id, 'clientes', 'read' FROM roles WHERE nome = 'administrador'
UNION ALL
SELECT id, 'extratos', 'read' FROM roles WHERE nome = 'administrador'
UNION ALL
SELECT id, 'extratos', 'create' FROM roles WHERE nome = 'administrador'
UNION ALL
SELECT id, 'pagamentos', 'read' FROM roles WHERE nome = 'administrador'
UNION ALL
SELECT id, 'configuracao', 'read' FROM roles WHERE nome = 'administrador'
ON CONFLICT (role_id, modulo, acao) DO NOTHING;

-- INSERT METADADOS DO SISTEMA
INSERT INTO sistemas (nome_sistema, versao, desenvolvedor, descricao, tecnologias)
VALUES ('VA Business - Sistema Financeiro', '1.0.0', 'OliverStorage', 'Gestão de contas a receber para grupo de escritórios', 'HTML, CSS, JavaScript, Supabase, PostgreSQL')
ON CONFLICT (nome_sistema) DO NOTHING;
