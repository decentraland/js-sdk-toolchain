export function imageToDataUri(img: HTMLImageElement, width: number, height: number) {
  // create an off-screen canvas
  const canvas: HTMLCanvasElement = document.createElement('canvas');
  const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');

  if (!ctx) return null;

  // set its dimension to target size
  canvas.width = width;
  canvas.height = height;

  // draw source image into the off-screen canvas:
  ctx.drawImage(img, 0, 0, width, height);

  // encode image to data-uri with base64 version of compressed image
  return canvas.toDataURL();
}

export function resizeImage(image: string, maxWidth: number, maxHeight: number) {
  return new Promise<string | null>(resolve => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      let ratio = 0;
      if (width > maxWidth) {
        ratio = maxWidth / width;
        width = maxWidth;
        height *= ratio;
      } else if (height > maxHeight) {
        ratio = maxHeight / height;
        width *= ratio;
        height = maxHeight;
      }
      const newDataUri = imageToDataUri(img, width, height);
      resolve(newDataUri);
    };
    img.src = image;
  });
}

export const BASE64_PREFIX = 'data:image/png;base64,';

export function addBase64ImagePrefix(base64: string) {
  if (base64.startsWith(BASE64_PREFIX)) return base64;
  return `${BASE64_PREFIX}${base64}`;
}

export function stripBase64ImagePrefix(base64: string) {
  return base64.replace(BASE64_PREFIX, '');
}
