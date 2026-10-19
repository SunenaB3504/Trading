/** Font files are bundled as assets; the bundler turns an import into a reference the font loader accepts. */
declare module '*.ttf' {
  const source: number | string;
  export default source;
}
