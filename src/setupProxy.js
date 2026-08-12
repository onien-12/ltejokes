const { createProxyMiddleware } = require("http-proxy-middleware");

/**
 * Development proxy for the VPN backend.
 *
 * Production serves the site and the VPN backend from one domain, nginx routing
 * /api/vpn/ to it. The dev server has to match that, and not just for tidiness:
 * the antifraud bundle only produces a payload when it is same-origin with the
 * page, so a cross-origin dev setup silently fails every fingerprint. Mirroring
 * the nginx rule here keeps `/api/vpn` correct in both places, which is also why
 * REACT_APP_VPN_API_URL can stay unset.
 */
module.exports = function (app) {
  app.use(
    "/api/vpn",
    createProxyMiddleware({
      target: process.env.VPN_BACKEND_URL || "http://localhost:16000",
      changeOrigin: true,
      // The backend serves its own routes at the root, same as behind nginx.
      pathRewrite: { "^/api/vpn": "" },
      ws: false,
      logLevel: "warn",
    }),
  );
};
