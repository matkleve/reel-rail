import Capacitor
import Photos
import UniformTypeIdentifiers

/// What a browser cannot do on an iPhone, for reel-rail's native app:
/// list the Photos library without copying anything, hand one original over
/// on demand (no "Preparing…" wait for a whole selection), and delete into
/// "Recently Deleted" (iOS asks the user to confirm, and keeps them 30 days).
/// JS side: src/native/photoLibrary.ts.
@objc(PhotoLibraryPlugin)
public class PhotoLibraryPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PhotoLibraryPlugin"
    public let jsName = "PhotoLibrary"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listAssets", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exportAsset", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteAssets", returnType: CAPPluginReturnPromise),
    ]

    @objc func requestAccess(_ call: CAPPluginCall) {
        PHPhotoLibrary.requestAuthorization(for: .readWrite) { status in
            let names: [PHAuthorizationStatus: String] = [
                .authorized: "full", .limited: "limited", .denied: "denied",
                .restricted: "restricted", .notDetermined: "notDetermined",
            ]
            call.resolve(["access": names[status] ?? "denied"])
        }
    }

    /// Photos and videos, newest first, optionally only since a date (ISO). Metadata only — no file is read.
    @objc func listAssets(_ call: CAPPluginCall) {
        let options = PHFetchOptions()
        options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        var predicates = [NSPredicate(format: "mediaType == %d || mediaType == %d",
                                      PHAssetMediaType.image.rawValue, PHAssetMediaType.video.rawValue)]
        if let since = call.getString("since"), let date = ISO8601DateFormatter().date(from: since) {
            predicates.append(NSPredicate(format: "creationDate >= %@", date as NSDate))
        }
        options.predicate = NSCompoundPredicate(andPredicateWithSubpredicates: predicates)
        let iso = ISO8601DateFormatter()
        var out: [[String: Any]] = []
        PHAsset.fetchAssets(with: options).enumerateObjects { asset, _, _ in
            let resource = PHAssetResource.assetResources(for: asset).first
            var item: [String: Any] = [
                "id": asset.localIdentifier,
                "type": asset.mediaType == .video ? "video" : "photo",
                "name": resource?.originalFilename ?? asset.localIdentifier,
                "duration": asset.duration,
                "width": asset.pixelWidth,
                "height": asset.pixelHeight,
            ]
            if let created = asset.creationDate { item["takenAt"] = iso.string(from: created) }
            if let loc = asset.location?.coordinate { item["gps"] = ["lat": loc.latitude, "lng": loc.longitude] }
            out.append(item)
        }
        call.resolve(["assets": out])
    }

    /// Writes one original (unchanged bytes, HEIC/HEVC as recorded) to a temp file and returns its URL
    /// for the web view (Capacitor.convertFileSrc). Only this one asset is copied, only when asked.
    @objc func exportAsset(_ call: CAPPluginCall) {
        guard let id = call.getString("id"),
              let asset = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject,
              let resource = PHAssetResource.assetResources(for: asset).first(where: {
                  $0.type == .photo || $0.type == .video || $0.type == .fullSizePhoto || $0.type == .fullSizeVideo
              }) ?? PHAssetResource.assetResources(for: asset).first
        else { return call.reject("Not found") }
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("reel-rail", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let url = dir.appendingPathComponent(UUID().uuidString + "-" + resource.originalFilename)
        let options = PHAssetResourceRequestOptions()
        options.isNetworkAccessAllowed = true // iCloud originals are downloaded on demand
        PHAssetResourceManager.default().writeData(for: resource, toFile: url, options: options) { error in
            if let error = error { return call.reject(error.localizedDescription) }
            call.resolve(["url": url.absoluteString, "name": resource.originalFilename, "uti": resource.uniformTypeIdentifier])
        }
    }

    /// Deletes into "Recently Deleted". iOS shows its own confirmation; `deleted` is false if the user declined.
    @objc func deleteAssets(_ call: CAPPluginCall) {
        let ids = call.getArray("ids", String.self) ?? []
        let assets = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil)
        guard assets.count > 0 else { return call.resolve(["deleted": false, "count": 0]) }
        PHPhotoLibrary.shared().performChanges({
            PHAssetChangeRequest.deleteAssets(assets)
        }) { ok, error in
            if let error = error as NSError?, error.code != 3072 /* user cancelled */ {
                return call.reject(error.localizedDescription)
            }
            call.resolve(["deleted": ok, "count": ok ? assets.count : 0])
        }
    }
}
