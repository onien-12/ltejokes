const webpack = require("webpack");

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      webpackConfig.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^decode-named-character-reference$/, (resource) => {
          resource.request = require.resolve("decode-named-character-reference");
        })
      );
      webpackConfig.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^hast-util-from-html-isomorphic$/, (resource) => {
          resource.request = require.resolve("hast-util-from-html-isomorphic");
        })
      );

      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        fs: false,
        "react-native-fs": false,
      };

      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
      };
      return webpackConfig;
    },
  },
};
