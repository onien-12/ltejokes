const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api/vpn",
    createProxyMiddleware({
      target: process.env.VPN_BACKEND_URL || "http://localhost:16000",
      changeOrigin: true,
      pathRewrite: { "^/api/vpn": "" },
      ws: false,
      logLevel: "warn",
    }),
  );
};
