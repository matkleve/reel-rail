import { FolderOpen, Images } from "lucide-react";
import { useEffect, useState } from "react";

import { savedLibrarySize } from "@/fs/filesSource";
import { canPickFolder, isTouch } from "@/fs/support";
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
  const device = isTouch() ? "this device" : "this browser";
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
          <strong>Welcome back.</strong> {saved} rated photos and videos are saved on {device} — add the same ones again
          and they return with their ratings.
        </p>
      )}
      <div className="start-actions">
        {native && (
          <Button variant="primary" size="lg" icon={Images} onClick={() => void openPhotos()} autoFocus>
            Open my Photos
          </Button>
        )}
        <Button variant={native ? "ghost" : "primary"} size="lg" icon={Images} onClick={photos.open} autoFocus={!native}>
          {saved ? "Add photos again" : "Add photos & videos"}
        </Button>
        {canPickFolder() && (
          <Button variant="ghost" size="lg" icon={FolderOpen} onClick={folder.open}>
            {isTouch() ? "From the Files app (folder)" : "Add a whole folder"}
          </Button>
        )}
      </div>
      {photos.input}
      {folder.input}
      <StartError error={error} />
      <Steps />
      <Privacy>
        Nothing is uploaded — reel-rail runs entirely on {device}. It never changes your originals; ratings stay in{" "}
        {device}’s storage.
      </Privacy>
    </Shell>
  );
}
