export function pdfRefKey(objectNumber: number, generationNumber: number): string {
  if (generationNumber > 0) return `${objectNumber}R${generationNumber}`;
  return `${objectNumber}R`;
}

/** pdf.js serializes indirect refs as `4R` or `4R2` (generation when non-zero). */
export function pdfjsRefKey(ref: unknown): string | null {
  if (typeof ref === 'string') {
    return /^[1-9]\d*R(?:[1-9]\d*)?$/.test(ref) ? ref : null;
  }
  if (typeof ref === 'object' && ref !== null && 'num' in ref) {
    const record = ref as { num?: unknown; gen?: unknown };
    const objectNumber = Number(record.num);
    const generationNumber = Number(record.gen ?? 0);
    if (!Number.isInteger(objectNumber) || objectNumber <= 0) return null;
    if (!Number.isInteger(generationNumber) || generationNumber < 0) return null;
    return pdfRefKey(objectNumber, generationNumber);
  }
  return null;
}
