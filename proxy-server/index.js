const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações
const SUPABASE_URL = 'https://iurqddkuihjsmxubibao.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'SUA_CHAVE_AQUI'; 
const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || 'http://srv-mupa.ddns.net:5050/produto-imagem';
const DEFAULT_STORE_ID = 53;


app.use(cors());
app.use(express.json());

// Cache simples em memória
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hora

app.get('/proxy-assai', async (req, res) => {
  const { ean, product_id, store_id } = req.query;
  const targetStoreId = store_id || DEFAULT_STORE_ID;


  if (!ean && !product_id) {
    return res.status(400).json({ success: false, error: 'EAN ou product_id é obrigatório' });
  }

  const cacheKey = ean || `pid_${product_id}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[Proxy] Cache hit para: ${cacheKey}`);
      return res.json({ ...cached.data, is_cached: true });
    }
  }

  try {
    console.log(`[Proxy] Consultando: EAN=${ean} | PID=${product_id}`);

    let seqProduto = product_id;
    let descricao = "Produto";
    let actualEan = ean;

    // PASSO 1: Consultar EAN no Supabase
    if (ean) {
      const supabaseUrl = `${SUPABASE_URL}/rest/v1/seq_produto_assai?select=*&CODACESSONUM=eq.${ean}`;
      const supRes = await fetch(supabaseUrl, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });

      if (supRes.ok) {
        const mappings = await supRes.json();
        if (mappings && mappings.length > 0) {
          const mapping = mappings[0];
          seqProduto = mapping.SEQPRODUTO;
          descricao = mapping.DESCCOMPLETA;
          actualEan = mapping.CODACESSONUM;
        } else {
          throw new Error('Produto não encontrado no mapeamento');
        }
      } else {
        throw new Error(`Erro Supabase: ${supRes.status}`);
      }
    } else if (product_id) {
        // Se vier só product_id, tentar buscar metadados
        const supabaseUrl = `${SUPABASE_URL}/rest/v1/seq_produto_assai?select=*&SEQPRODUTO=eq.${product_id}`;
        const supRes = await fetch(supabaseUrl, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        if (supRes.ok) {
            const mappings = await supRes.json();
            if (mappings && mappings.length > 0) {
                descricao = mappings[0].DESCCOMPLETA;
                actualEan = mappings[0].CODACESSONUM;
            }
        }
    }

    // PASSO 2: Consultar Marketplace Assaí com Retry
    let assaiData = null;
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        const assaiUrl = `https://marketplace.assai.com.br/stock?id_product=${seqProduto}&id_store=${targetStoreId}`;
        console.log(`[Proxy] [Tentativa ${4 - retries}] Consultando Assaí: ${assaiUrl}`);
        
        const assaiRes = await fetch(assaiUrl, {
          headers: {
            'accept': 'application/json',
            'x-basicauthorization': 'b3V0Ym91bmRAc3NhaUNvbXBhc3M6MWY1NzZjZGRkZWU3MzcwZTQwZWFkOWM2ZGZmMzM4NzY1MWIxN2FiMg==',
            'Authorization': 'Basic b3V0Ym91bmRAc3NhaUNvbXBhc3M6MWY1NzZjZGRkZWU3MzcwZTQwZWFkOWM2ZGZmMzM4NzY1MWIxN2FiMg==',
            'User-Agent': 'AssaiApp/1.0.0 (iPhone; iOS 15.0; Scale/3.00)',
            'x-app-version': '2.1.0'
          },
          timeout: 8000
        });

        if (assaiRes.ok) {
          assaiData = await assaiRes.json();
          break; // Sucesso!
        } else {
          const errText = await assaiRes.text();
          console.warn(`[Proxy] Erro Assaí (Status ${assaiRes.status}): ${errText.substring(0, 100)}...`);
          if (assaiRes.status === 403 || assaiRes.status === 401) {
             // Se for erro de auth ou bloqueio, talvez não adiante o retry imediato, mas vamos tentar mesmo assim
          }
        }
      } catch (e) {
        console.error(`[Proxy] Falha na tentativa ${4 - retries}: ${e.message}`);
      }
      
      retries--;
      if (retries > 0) {
        console.log(`[Proxy] Aguardando ${delay}ms para próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }

    if (!assaiData) {
      throw new Error(`Não foi possível obter dados do Assaí após várias tentativas.`);
    }

    const stockPrices = assaiData.stock_price || [];


    // PASSO 3: Extrair Preço e Packs
    // O preço unitário é onde unit_pack = 1
    const unitPriceEntry = stockPrices.find(p => p.unit_pack === 1);
    const mainPrice = unitPriceEntry ? (unitPriceEntry.price_prom_pack || unitPriceEntry.price_pack) : 0;
    
    // Packs são as outras opções
    const packs = stockPrices.filter(p => p.unit_pack > 1).map(p => ({
      quantity: p.unit_pack,
      price: p.price_prom_pack || p.price_pack
    }));

    // PASSO 4: Consultar Visual (Imagens/Cores)
    let visual = null;
    if (actualEan) {
      try {
        const visualRes = await fetch(`${IMAGE_BASE_URL}/${actualEan}`, { timeout: 3000 });
        if (visualRes.ok) {
          visual = await visualRes.json();
        }
      } catch (e) {
        console.warn(`[Proxy] Erro ao buscar visual para ${actualEan}:`, e.message);
      }
    }

    const finalResult = {
      success: true,
      ean: actualEan,
      internal_id: seqProduto,
      description: descricao,
      price: mainPrice,
      packs: packs,
      stock_prices: stockPrices, // Mantido para compatibilidade com UI atual
      visual: visual
    };

    // Salvar no cache
    cache.set(cacheKey, {
      timestamp: Date.now(),
      data: finalResult
    });

    res.json(finalResult);

  } catch (error) {
    console.error(`[Proxy] Erro: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server rodando na porta ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/proxy-assai`);
});
