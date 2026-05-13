// Extração de paleta dominante a partir de uma imagem (client-side, via Canvas)
// Retorna: cor_dominante_claro, cor_dominante_escuro, cor_assinatura_produto, fundo_legibilidade

export interface ExtractedPalette {
  cor_dominante_claro: string;
  cor_dominante_escuro: string;
  cor_assinatura_produto: string;
  fundo_legibilidade: string;
}

const cache = new Map<string, ExtractedPalette>();

const toHex = (n: number) => n.toString(16).padStart(2, "0");
const rgbToHex = (r: number, g: number, b: number) =>
  `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();

const luminance = (r: number, g: number, b: number) => {
  const a = [r, g, b].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

const saturation = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
};

export async function extractImageColors(url: string): Promise<ExtractedPalette | null> {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url)!;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    const timeout = setTimeout(() => resolve(null), 4000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const SIZE = 64;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        // Quantizar em buckets (4 bits por canal => 4096 buckets)
        const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 200) continue; // ignorar transparente
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // Ignorar quase-branco e quase-preto puros (provável fundo)
          const lum = luminance(r, g, b);
          if (lum > 0.96 || lum < 0.03) continue;
          const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
          const existing = buckets.get(key);
          if (existing) {
            existing.r += r; existing.g += g; existing.b += b; existing.count++;
          } else {
            buckets.set(key, { r, g, b, count: 1 });
          }
        }

        if (buckets.size === 0) return resolve(null);

        const palette = Array.from(buckets.values())
          .map(b => ({
            r: Math.round(b.r / b.count),
            g: Math.round(b.g / b.count),
            b: Math.round(b.b / b.count),
            count: b.count,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 12);

        // Cor de assinatura: mais saturada e frequente
        const signature = [...palette].sort((a, b) => {
          const sA = saturation(a.r, a.g, a.b) * Math.log(a.count + 1);
          const sB = saturation(b.r, b.g, b.b) * Math.log(b.count + 1);
          return sB - sA;
        })[0];

        // Mais escura e mais clara entre as top
        const sortedByLum = [...palette].sort(
          (a, b) => luminance(a.r, a.g, a.b) - luminance(b.r, b.g, b.b)
        );
        const dark = sortedByLum[0];
        const light = sortedByLum[sortedByLum.length - 1];

        // fundo_legibilidade: escuro com boa saturação se possível
        const fundo = dark;

        const result: ExtractedPalette = {
          cor_dominante_claro: rgbToHex(light.r, light.g, light.b),
          cor_dominante_escuro: rgbToHex(dark.r, dark.g, dark.b),
          cor_assinatura_produto: rgbToHex(signature.r, signature.g, signature.b),
          fundo_legibilidade: rgbToHex(fundo.r, fundo.g, fundo.b),
        };

        cache.set(url, result);
        resolve(result);
      } catch (e) {
        console.warn("[extractImageColors] erro:", e);
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };

    img.src = url;
  });
}
