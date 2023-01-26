const baseConfig = require('./webpack.config');

baseConfig.devServer.proxy = {
  '/api/data_annotation': {
    target: (process.env.DATA_ANNOTATION_URL ? process.env.DATA_ANNOTATION_URL : 'http://localhost:8000'),
    pathRewrite: { '^/api/data_annotation': '' },
    secure: false,
    changeOrigin: true,
  },
};
module.exports = baseConfig;
