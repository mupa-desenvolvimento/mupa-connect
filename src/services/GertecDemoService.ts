
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
    url_imagem: "https://applicativa-marketplace-prod.s3.amazonaws.com/produtos/arroz-tio-joao-100-graos-nobres-5kg.webp"
  },
  {
    ean: "1112223330013",
    descricao: "Coca-Cola Original 2L",
    preco: 8.99,
    preco_promocional: 6.99,
    tipo: "promocao",
    url_imagem: "https://drogariasp.vteximg.com.br/arquivos/ids/1079073-1000-1000/765368---Refrigerante-Coca-Cola-Original-2L-1-_0000_Screen-Shot-2024-04-01-at-09.17.37.png?v=638475708512270000"
  },
  {
    ean: "1112223330020",
    descricao: "Shampoo Dove Nutritive 400ml",
    preco: 19.90,
    preco_promocional: 13.27,
    tipo: "leve_3_pague_2",
    observacao: "Leve 3 pague 2 - Preço unitário efetivo",
    url_imagem: "https://drogariasp.vteximg.com.br/arquivos/ids/1104756-1000-1000/325350---shampoo-dove-oleo-nutricao-400ml_0003_7891150017368_1.png?v=638518245362770000"
  },
  {
    ean: "1112223330037",
    descricao: "Whisky Johnnie Walker Red Label 1L",
    preco: 89.90,
    preco_promocional: 69.90,
    tipo: "vip",
    observacao: "Preço exclusivo para clientes VIP",
    url_imagem: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcTGSQmpg636P_mGRc6ZNIkk17EE01rU3BXprm7HY1rZwnyeYMK8g2PHiI7uMOFA0z5RCjw2JwL1hAENxCsxhtq4z2hFdrv6IOujMVARE4KudXbIp30mXWX5xA"
  }
];

export const GERTEC_TENANT_ID = "997c4ed0-98e5-4ac9-ae06-319e621b5f58";

export function lookupGertecProduct(ean: string) {
  return GERTEC_DEMO_PRODUCTS.find(p => p.ean === ean);
}
