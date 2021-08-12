const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const BundleAnalyzerPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

module.exports = merge(common, {
  mode: "production",
  devtool: "source-map",
  plugins: [
    new BundleAnalyzerPlugin({ analyzerMode: "static", openAnalyzer: false }),
  ],
});
