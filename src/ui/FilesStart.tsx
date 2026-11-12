import { FolderOpen, Images } from "lucide-react";
import { useEffect, useState } from "react";

import { savedLibrarySize } from "@/fs/filesSource";
import { canPickFolder, isTouch } from "@/fs/support";
import { t, tn } from "@/i18n";
import { isNativeApp } from "@/native/photoLibrary";
import { openPhotos } from "@/store/openSource";
import { useUi } from "@/store/useUi";

import { Button } from "./kit/Button";
import { Hero, Privacy, Shell, StartError, Steps } from "./StartParts";
import { useFilePick } from "./useFilePick";

/**
 * Start in files mode (iPad, Safari, Firefox, Brave): no folder access, so
 * photos come through the system picker. Ratings are kept on this device and
 * return by content hash when the same photos are added again.
 */
export function FilesStart() {
  const error = useUi((s) => s.error);
  const [saved, setSaved] = useState(0);
  const photos = useFilePick();
  const folder = useFilePick(true);
  const touch = isTouch();
  // The iPhone app reads the Photos library directly; the picker stays as the way to add files from elsewhere.
  const native = isNativeApp();

  useEffect(() => {
    void savedLibrarySize().then(setSaved);
  }, []);

  return (
    <Shell>
      <Hero />
      {saved > 0 && (
        <p className="welcome-back">
          <strong>{t("Welcome back.")}</strong>{" "}
          {touch
            ? tn(
                "1 rated photo or video is saved on this device — add it again and it returns with its rating.",
                "{n} rated photos and videos are saved on this device — add the same ones again and they return with their ratings.",
                saved,
              )
            : tn(
                "1 rated photo or video is saved in this browser — add it again and it returns with its rating.",
                "{n} rated photos and videos are saved in this browser — add the same ones again and they return with their ratings.",
                saved,
              )}
        </p>
      )}
      <div className="start-actions">
        {native && (
          <Button variant="primary" size="lg" icon={Images} onClick={() => void openPhotos()} autoFocus>
            {t("Open my Photos")}
          </Button>
        )}
        <Button variant={native ? "ghost" : "primary"} size="lg" icon={Images} onClick={photos.open} autoFocus={!native}>
          {saved ? t("Add photos again") : t("Add photos & videos")}
        </Button>
        {canPickFolder() && (
          <Button variant="ghost" size="lg" icon={FolderOpen} onClick={folder.open}>
            {touch ? t("From the Files app (folder)") : t("Add a whole folder")}
          </Button>
        )}
      </div>
      {photos.input}
      {folder.input}
      <StartError error={error} />
      <Steps />
      <Privacy>
        {touch
          ? t("Nothing is uploaded — reel-rail runs entirely on this device. It never changes your originals; ratings stay in this device’s storage.")
          : t("Nothing is uploaded — reel-rail runs entirely in this browser. It never changes your originals; ratings stay in this browser’s storage.")}
      </Privacy>
    </Shell>
  );
}
