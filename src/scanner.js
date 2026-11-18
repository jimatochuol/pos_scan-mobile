
import {
  BarcodeScanner,
  BarcodeFormat
} from '@capacitor-mlkit/barcode-scanning';

export async function checkCameraPermission() {
  const permission =
    await BarcodeScanner.checkPermissions();

  if (permission.camera === 'granted') {
    return true;
  }

  const result =
    await BarcodeScanner.requestPermissions();

  return result.camera === 'granted';
}

export async function startScanner() {
  try {
    const supported =
      await BarcodeScanner.isSupported();

    if (!supported.supported) {
      throw new Error('Barcode scanning is not supported.');
    }

    const allowed = await checkCameraPermission();

    if (!allowed) {
      throw new Error('Camera permission was denied.');
    }

    const { barcodes } = await BarcodeScanner.scan({
      formats: [
        BarcodeFormat.Ean13,
        BarcodeFormat.Ean8,
        BarcodeFormat.UpcA,
        BarcodeFormat.UpcE,
        BarcodeFormat.QrCode,
        BarcodeFormat.Code128,
        BarcodeFormat.Code39
      ]
    });

    if (!barcodes.length) {
      return null;
    }

    return barcodes[0].rawValue;

  } catch (error) {
    console.error('Scanner error:', error);
    throw error;
  }
}
