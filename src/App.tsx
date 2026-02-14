import { useEffect, useState } from "react";
import Desktop from "./components/Desktop";
import LoadingOverlay from "./components/LoadingOverlay";
import { loadIcon, loadIcons } from "@iconify-icon/react";

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

function App() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const iconsPromise = new Promise((resolve) => loadIcons(iconifyIcons, resolve));
    Promise.all([document.fonts.ready, iconsPromise]).then(() => {
      setIsLoaded(true);
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
