import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * The native app's Photos plugin (ios/App/App/PhotoLibraryPlugin.swift).
 * Only present inside the iPhone/iPad app; in a browser `isNativeApp()` is
 * false and nothing here is called.
 */

export type PhotoAsset = {
  id: string;
  type: "photo" | "video";
  name: string;
  takenAt?: string;
  duration: number;
  width: number;
  height: number;
  gps?: { lat: number; lng: number };
};

type PhotoLibraryPlugin = {
  requestAccess(): Promise<{ access: "full" | "limited" | "denied" | "restricted" | "notDetermined" }>;
  listAssets(options?: { since?: string }): Promise<{ assets: PhotoAsset[] }>;
  exportAsset(options: { id: string }): Promise<{ url: string; name: string; uti: string }>;
  deleteAssets(options: { ids: string[] }): Promise<{ deleted: boolean; count: number }>;
};

export const PhotoLibrary = registerPlugin<PhotoLibraryPlugin>("PhotoLibrary");

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** One original as a File — copied out of the library only now, only this one. */
export async function assetFile(asset: PhotoAsset): Promise<File> {
  const { url, name } = await PhotoLibrary.exportAsset({ id: asset.id });
  const blob = await (await fetch(Capacitor.convertFileSrc(url))).blob();
  return new File([blob], name, { lastModified: asset.takenAt ? Date.parse(asset.takenAt) : Date.now() });
}
