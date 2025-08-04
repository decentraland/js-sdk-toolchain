import { useCallback } from 'react';

import { takeScreenshot as takeScreenshotRPC } from '/@/modules/rpc';
import { resizeImage } from '/@/modules/image';
import { type CameraRPC } from '/@/modules/rpc/camera';

type Screenshot = {
  iframe: HTMLIFrameElement;
  camera?: CameraRPC;
};

export function useInspector() {
  const generateThumbnail = useCallback(async ({ iframe, camera }: Screenshot) => {
    const screenshot = await takeScreenshotRPC(iframe, camera);
    if (screenshot) {
      const thumbnail = (await resizeImage(screenshot, 1024, 768)) ?? undefined;
      return thumbnail;
    }
  }, []);

  return {
    generateThumbnail,
  };
}
