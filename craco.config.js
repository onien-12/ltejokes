const webpack = require("webpack");

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      webpackConfig.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^decode-named-character-reference$/,
          (resource) => {
            resource.request = require.resolve(
              "decode-named-character-reference"
            );
          }
        )
      );
      return webpackConfig;
    },
  },
};
