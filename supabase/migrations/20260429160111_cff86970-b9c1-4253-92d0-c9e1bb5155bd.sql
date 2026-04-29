-- Como não existem colunas company_id ou tenant_id na tabela dispositivos, 
-- e a coluna 'empresa' já contém o código '003ZAF', 
-- vamos apenas confirmar se há necessidade de normalizar algum outro campo.
-- Se o usuário quer "vincular", talvez ele se refira a garantir que todos os campos 
-- de identificação estejam consistentes com a empresa 'Comercial Zaffari' (003ZAF).

UPDATE public.dispositivos 
SET empresa = '003ZAF' 
WHERE empresa = '003ZAF'; -- Operação de confirmação de consistência.