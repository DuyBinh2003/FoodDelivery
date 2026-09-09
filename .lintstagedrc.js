module.exports = {
  'frontend/**/*.{js,jsx,ts,tsx,mjs,cjs}': () => 'npm --prefix frontend run lint',
  'backend/**/*.{js,ts}': () => 'npm --prefix backend run lint'
};
