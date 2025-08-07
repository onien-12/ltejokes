import ReactDOM from "react-dom/client";
import App from "./App";

import "katex/dist/katex.min.css";
import "highlight.js/styles/atom-one-dark.css";
import "./index.css";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(<App />);
