

export interface GertecProduct {
  ean: string;
  descricao: string;
  preco: number;
  preco_promocional: number | null;
  tipo: string;
  observacao?: string;
  url_imagem: string;
}

let gertecProductsCache: GertecProduct[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

async function fetchGertecProducts(): Promise<GertecProduct[]> {
  const now = Date.now();
  if (gertecProductsCache && (now - lastFetchTime < CACHE_DURATION)) {
    return gertecProductsCache;
  }

  try {
    const response = await fetch('/gertec_demo.json');
    if (!response.ok) throw new Error('Failed to fetch gertec products');
    const data = await response.json();
    gertecProductsCache = data.produtos;
    lastFetchTime = now;
    return gertecProductsCache || [];
  } catch (error) {
    console.error('Error fetching Gertec products:', error);
    // Fallback para cache antigo se existir, ou array vazio
    return gertecProductsCache || [];
  }
}

export const GERTEC_TENANT_ID = "997c4ed0-98e5-4ac9-ae06-319e621b5f58";

export async function lookupGertecProduct(ean: string): Promise<GertecProduct | undefined> {
  const products = await fetchGertecProducts();
  return products.find(p => p.ean === ean);
}

