const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  // This tells webpack to use its built-in optimizations appropriately
  mode: process.env.NODE_ENV || 'development',
  
  // Configure how webpack resolves modules
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
  },
  
  // Configure how modules are processed
  module: {
    rules: [
      // JavaScript/JSX processing
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
            plugins: ['@babel/plugin-syntax-dynamic-import']
          }
        }
      },
      // CSS processing
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      // Image processing
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[hash].[ext]',
              outputPath: 'images',
            },
          },
        ],
      }
    ]
  },
  
  // Configure optimization and code splitting
  optimization: {
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 0,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            // Get the name of the npm package
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
            // Return a chunk name based on npm package
            return `npm.${packageName.replace('@', '')}`;
          },
        },
        features: {
          test: /[\\/]src[\\/]features[\\/]/,
          name(module) {
            // Extract feature name from path
            const featureName = module.context.match(/[\\/]features[\\/](.*?)([\\/]|$)/)[1];
            return `feature.${featureName}`;
          },
          minSize: 10000,
        },
      },
    },
    runtimeChunk: {
      name: 'runtime',
    },
  },
  
  // Configure plugins
  plugins: [
    // Only add in analyze mode
    process.env.ANALYZE && new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'disabled',
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json',
    }),
  ].filter(Boolean),
  
  // Source maps for development
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',
}; 