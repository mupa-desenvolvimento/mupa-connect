
export interface GertecProduct {
  ean: string;
  descricao: string;
  preco: number;
  preco_promocional: number | null;
  tipo: string;
  observacao?: string;
  url_imagem: string;
}

export const GERTEC_DEMO_PRODUCTS: GertecProduct[] = [
  {
    ean: "1112223330006",
    descricao: "Arroz Branco Tio João 5kg",
    preco: 29.90,
    preco_promocional: null,
    tipo: "normal",
    url_imagem: "https://images.tiojoao.com.br/produtos/arroz-tio-joao-5kg.jpg"
  },
  {
    ean: "1112223330013",
    descricao: "Coca-Cola Original 2L",
    preco: 8.99,
    preco_promocional: 6.99,
    tipo: "promocao",
    url_imagem: "https://m.media-amazon.com/images/I/71vKq7z5JQL.jpg"
  },
  {
    ean: "1112223330020",
    descricao: "Shampoo Dove Nutritive 400ml",
    preco: 19.90,
    preco_promocional: 13.27,
    tipo: "leve_3_pague_2",
    observacao: "Leve 3 pague 2 - Preço unitário efetivo",
    url_imagem: "https://m.media-amazon.com/images/I/61f4p7z5JQL.jpg"
  },
  {
    ean: "1112223330037",
    descricao: "Whisky Johnnie Walker Red Label 1L",
    preco: 89.90,
    preco_promocional: 69.90,
    tipo: "vip",
    observacao: "Preço exclusivo para clientes VIP",
    url_imagem: "https://m.media-amazon.com/images/I/71z5z5JQL.jpg"
  }
];

export const GERTEC_TENANT_ID = "997c4ed0-98e5-4ac9-ae06-319e621b5f58";

export function lookupGertecProduct(ean: string) {
  return GERTEC_DEMO_PRODUCTS.find(p => p.ean === ean);
}
