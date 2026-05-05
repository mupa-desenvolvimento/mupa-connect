-- Remover a função simplificada que causa conflito de overloading (PGRST203)
DROP FUNCTION IF EXISTS public.get_dispositivo_por_serial(text);

-- Garantir que a função completa tenha um tipo de retorno consistente (JSONB)
-- Nota: A função com múltiplos parâmetros já retorna JSONB, o que é ideal para o PostgREST.