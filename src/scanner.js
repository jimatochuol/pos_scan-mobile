
import {
  BarcodeScanner,
  BarcodeFormat
} from '@capacitor-mlkit/barcode-scanning';

export async function checkCameraPermission() {
  const permission = await BarcodeScanner.checkPermissions();

  if (permission.camera === 'granted') {
    return true;
  }

  const result = await BarcodeScanner.requestPermissions();

  return result.camera === 'granted';
}

export async function startScanner() {
  const supported = await BarcodeScanner.isSupported();

  if (!supported.supported) {
    throw new Error('Barcode scanning is not supported on this device.');
  }

  const allowed = await checkCameraPermission();

  if (!allowed) {
    throw new Error('Camera permission was not granted.');
  }

  const result = await BarcodeScanner.scan({
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

  if (!result.barcodes || result.barcodes.length === 0) {
    return null;
  }

  return result.barcodes[0].rawValue || null;
}
