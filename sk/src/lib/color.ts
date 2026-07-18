export function opaqueHex(hex: string | undefined): string {
    if(!hex) return "#000000";
    if(hex.length === 7) return hex;
    if(hex.length === 9) return hex.slice(0, 7);
    throw new Error(`Invalid hex color: ${hex}`);
}

export function parseRgb(rgb: string): [number, number, number] | null {
    const match = rgb.match(/rgb\((\d+), (\d+), (\d+)\)/);
    if(!match) return null;
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

export function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
    const lum1 = getLuminance(rgb1);
    const lum2 = getLuminance(rgb2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
}

export function getLuminance(rgb: [number, number, number]): number {
    const [r, g, b] = rgb.map(c => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}