INSERT INTO public.empresas (nome, logotipo, _id, responsavel, cidade, ativo) 
VALUES ('Stock Center', 'https://3ae4eb7cd71d409c5fc6c7861ea69db9.cdn.bubble.io/f1728965886329x192518005190348580/unnamed.jpg', '1728965891007x215886838679286700', 'Gustavo Scheffer', 'Passo Fundo', true) 
ON CONFLICT (_id) DO UPDATE SET 
    nome = EXCLUDED.nome, 
    logotipo = EXCLUDED.logotipo, 
    responsavel = EXCLUDED.responsavel, 
    cidade = EXCLUDED.cidade, 
    ativo = EXCLUDED.ativo;