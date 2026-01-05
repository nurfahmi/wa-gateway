const QRCode = require('qrcode');

/**
 * Generate QR code as data URL
 * @param {string} text - Text to encode in QR
 * @returns {Promise<string>} - Data URL of QR code image
 */
async function generateQRDataURL(text) {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2
    });
  } catch (error) {
    throw new Error('Failed to generate QR code: ' + error.message);
  }
}

/**
 * Generate QR code as SVG string
 * @param {string} text - Text to encode in QR
 * @returns {Promise<string>} - SVG string
 */
async function generateQRSVG(text) {
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      errorCorrectionLevel: 'M'
    });
  } catch (error) {
    throw new Error('Failed to generate QR code: ' + error.message);
  }
}

/**
 * Generate QR code as buffer
 * @param {string} text - Text to encode in QR
 * @returns {Promise<Buffer>} - Image buffer
 */
async function generateQRBuffer(text) {
  try {
    return await QRCode.toBuffer(text, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 300
    });
  } catch (error) {
    throw new Error('Failed to generate QR code: ' + error.message);
  }
}

module.exports = {
  generateQRDataURL,
  generateQRSVG,
  generateQRBuffer
};

