const sharp = require('sharp');

/**
 * Reduz imagem em base64 para ficar menor que 5MB
 * @param {string} base64 - string base64 da imagem
 * @returns {Promise<string>} base64 redimensionada
 */
const resizeBase64Image = async (base64) => {
  const matches = base64.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error('Formato de imagem inválido');

  const mime = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
4
  // Se imagem for menor que 5MB, retorna original
  if (buffer.length <= 5 * 1024 * 1024) return base64;

  const resizedBuffer = await sharp(buffer)
    .resize({ width: 800 }) // você pode ajustar conforme necessário
    .toBuffer();

  const resizedBase64 = `data:${mime};base64,${resizedBuffer.toString('base64')}`;
  return resizedBase64;
};

module.exports = resizeBase64Image;
