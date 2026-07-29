module.exports = {
  presets: [['@babel/preset-env', { modules: 'commonjs' }], ['@babel/preset-react', { runtime: 'automatic' }]],
  plugins: ['babel-plugin-transform-vite-meta-env'],
};
