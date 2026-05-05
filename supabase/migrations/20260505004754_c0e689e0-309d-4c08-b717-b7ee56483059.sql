-- 1. Limpeza dos dados existentes (removendo todos os espaços)
UPDATE public.dispositivos
SET num_filial = REPLACE(num_filial, ' ', '')
WHERE num_filial IS NOT NULL;

-- 2. Função para normalizar num_filial
CREATE OR REPLACE FUNCTION public.normalize_num_filial()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.num_filial IS NOT NULL THEN
    NEW.num_filial := REPLACE(NEW.num_filial, ' ', '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger para garantir padronização futura em INSERT e UPDATE
DROP TRIGGER IF EXISTS tr_normalize_num_filial ON public.dispositivos;
CREATE TRIGGER tr_normalize_num_filial
BEFORE INSERT OR UPDATE OF num_filial ON public.dispositivos
FOR EACH ROW
EXECUTE FUNCTION public.normalize_num_filial();