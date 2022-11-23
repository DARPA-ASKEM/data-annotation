const baseConfig = require('./webpack.config');

baseConfig.devServer.proxy = {
  '/api/terminal': {
    target: (process.env.TERMINAL_ENDPOINT ? process.env.TERMINAL_ENDPOINT : 'http://localhost:3000'),
    pathRewrite: { '^/api/terminal': '' },
    secure: false,
    changeOrigin: true,
  },
  '/api/ws': {
    target: (process.env.TERMINAL_ENDPOINT ? process.env.TERMINAL_ENDPOINT : 'http://localhost:3000'),
    pathRewrite: { '^/api': '' },
    secure: false,
    changeOrigin: true,
    ws: true,
  },
  '/api/dojo': {
    target: (process.env.DATA_ANNOTATION_URL ? process.env.DATA_ANNOTATION_URL : 'http://localhost:8000'),
    pathRewrite: { '^/api/dojo': '' },
    secure: false,
    changeOrigin: true,
  },
  '/api/shorthand': {
    target: (process.env.SHORTHAND_URL ? process.env.SHORTHAND_URL : 'http://localhost:5000'),
    pathRewrite: { '^/api/shorthand': '' },
    secure: false,
    changeOrigin: true,
  },
  '/api/spacetag': {
    target: (process.env.SPACETAG_URL ? process.env.SPACETAG_URL : 'http://localhost:8001'),
    pathRewrite: { '^/api/spacetag': '' },
    secure: false,
    changeOrigin: true,
  },
};
module.exports = baseConfig;
