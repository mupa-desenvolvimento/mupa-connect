import { Vibrant } from 'node-vibrant/browser';

export interface ExtractedColors {
  cor_assinatura_produto: string;
  fundo_legibilidade: string;
  cor_dominante_claro: string;
  cor_dominante_escuro: string;
}

export const extractColorsFromImage = async (imageUrl: string): Promise<ExtractedColors | null> => {
  try {
    if (!imageUrl || imageUrl.includes('default') || imageUrl.includes('821f6c4e-8d26-4bd2-90bd-a52929afc73e.png')) {
      return null;
    }

    // Usar Vibrant.from() que lida bem com URLs no browser v4
    const palette = await Vibrant.from(imageUrl).getPalette();
    
    if (!palette) return null;

    // Vibrant gives us several swatches: Vibrant, Muted, DarkVibrant, DarkMuted, LightVibrant, LightMuted
    const vibrant = palette.Vibrant?.hex || '#F36C21';
    const darkVibrant = palette.DarkVibrant?.hex || '#003399';
    const lightVibrant = palette.LightVibrant?.hex || '#FFFFFF';
    const darkMuted = palette.DarkMuted?.hex || '#333333';
    const muted = palette.Muted?.hex || '#666666';

    // Fundo legibilidade deve ser uma cor escura vinda da imagem para garantir contraste com textos claros
    const fundoLegibilidade = palette.DarkVibrant?.hex || palette.DarkMuted?.hex || '#003399';

    return {
      cor_assinatura_produto: vibrant,
      fundo_legibilidade: fundoLegibilidade,
      cor_dominante_claro: lightVibrant,
      cor_dominante_escuro: darkVibrant,
    };
  } catch (error) {
    console.error('Error extracting colors:', error);
    return null;
  }
};
