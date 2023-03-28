"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const esbuild = require("esbuild");
const path = require("path");

const loaders = ["js", "jsx", "ts", "tsx", "json"]

const getExt = (str) => {
  const basename = path.basename(str);
  const firstDot = basename.indexOf('.');
  const lastDot = basename.lastIndexOf('.');
  const extname = path.extname(basename).replace(/(\.[a-z0-9]+).*/i, '$1');

  if (firstDot === lastDot) return extname

  return basename.slice(firstDot, lastDot) + extname
}

const transformer = {
  canInstrument: true,
  process(_content, filename, { transformerConfig }) {

    const ext = getExt(filename), extName = path.extname(filename).slice(1)
    const loader = loaders.includes(extName) ? extName : 'text'

    const ret = esbuild.transformSync(
      _content,
      Object.assign({
        minify: false,
        sourcemap: true, sourcesContent: false, sourcefile: filename,
        loader,
        format: 'cjs',
        target: 'es2020',
      }, transformerConfig)
    );

    return ret
  },
};
module.exports = transformer;