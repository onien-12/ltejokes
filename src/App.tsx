import { useEffect, useState } from "react";
import Desktop from "./components/Desktop";
import LoadingOverlay from "./components/LoadingOverlay";
import { loadIcon, loadIcons } from "@iconify-icon/react";
import { useFingerprintStore } from "./store/useFingerprintStore";

const iconifyIcons = [
  "ic:round-settings",
  "wpf:books",
  "material-symbols-light:terminal",
  "material-symbols:book-2",
  "mdi:wireless",
  "simple-icons:spotify",
  "gg:browse",
  "wpf:books",
  "material-symbols:folder",
  "si:json-duotone",
  "proicons:file-text",
  "material-symbols:book",
  "material-symbols:chevron-right",
  "material-symbols:insert-page-break",
  "material-symbols:code",
];

const vpnIcons = [
  "material-symbols:vpn-key-outline",
  "material-symbols:vpn-key-off-outline",
  "material-symbols:vpn-lock-outline-rounded",
  "material-symbols:key-outline-rounded",
  "material-symbols:key-vertical-outline-rounded",
  "material-symbols:dns-outline-rounded",
  "material-symbols:monitor-heart-outline-rounded",
  "material-symbols:swap-horizontal-circle-outline-rounded",
  "material-symbols:swap-horiz-rounded",
  "material-symbols:arrow-right-alt-rounded",
  "material-symbols:arrow-forward-rounded",
  "material-symbols:bolt-rounded",
  "material-symbols:extension-outline-rounded",
  "material-symbols:rocket-launch-outline-rounded",
  "material-symbols:lan-outline",
  "material-symbols:content-copy-outline-rounded",
  "material-symbols:link-rounded",
  "material-symbols:qr-code-2",
  "material-symbols:check-rounded",
  "material-symbols:check-circle-outline-rounded",
  "material-symbols:error-outline-rounded",
  "material-symbols:warning-outline-rounded",
  "material-symbols:help-outline-rounded",
  "material-symbols:lock-outline",
  "material-symbols:visibility-outline-rounded",
  "material-symbols:verified-user-outline-rounded",
  "material-symbols:shield-outline",
  "material-symbols:gpp-maybe-outline",
  "material-symbols:logout-rounded",
  "material-symbols:refresh-rounded",
  "material-symbols:add-rounded",
  "material-symbols:cloud-off-outline-rounded",
  "material-symbols:expand-more",
  "material-symbols:expand-less",
];

function App() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const iconsPromise = new Promise((resolve) => loadIcons([...iconifyIcons, ...vpnIcons], resolve));
    Promise.all([document.fonts.ready, iconsPromise]).then(() => {
      setIsLoaded(true);
      const boot = () => useFingerprintStore.getState().boot();
      if ("requestIdleCallback" in window) window.requestIdleCallback(boot, { timeout: 5000 });
      else setTimeout(boot, 1000);
    });
  }, []);

  return (
    <div className="App h-[100vh]">
      {!isLoaded && <LoadingOverlay />}
      <Desktop />
    </div>
  );
}

export default App;
