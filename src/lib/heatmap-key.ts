/**
 * Keyboard heatmap keys (RES-04), shared by the race client, the progress schema and the server aggregate.
 * A key is the lower case of one typed character. Lower-casing may expand a single code unit
 * ('İ'.toLowerCase() is 'i' + U+0307, two code units), so a key is one code point (possibly a lone
 * surrogate or a bare combining mark from the text) followed only by combining marks, and at most
 * `heatmapKeyMaxLength` UTF-16 code units: the payload stays bounded.
 */
export const heatmapKeyMaxLength=4;
const singleGrapheme=/^[^]\p{M}*$/u;
export function heatmapKey(character:string){return character.toLowerCase()}
export function isHeatmapKey(key:string){return key.length>=1&&key.length<=heatmapKeyMaxLength&&singleGrapheme.test(key)}
