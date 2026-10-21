import Capacitor
import UIKit

/// Registers reel-rail's own plugins (they live in the app, not in a package).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PhotoLibraryPlugin())
    }
}
