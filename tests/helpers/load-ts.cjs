const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..', '..');

/**
 * Execute real, pure TypeScript modules without a build directory or new package.
 * Each loader has its own module cache; test-only overrides isolate unavailable
 * synthetic data cases. Type correctness is checked separately by npm typecheck.
 */
function createTypeScriptLoader(overrides = {}) {
  const cache = new Map();

  function resolveFile(request, parent) {
    const candidate = request.startsWith('@/')
      ? path.join(projectRoot, 'src', request.slice(2))
      : path.resolve(path.dirname(parent), request);
    for (const suffix of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
      const file = candidate + suffix;
      if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
    }
    throw new Error(`Cannot resolve ${request} from ${parent}`);
  }

  function load(request) {
    const file = path.resolve(projectRoot, request);
    const relative = path.relative(projectRoot, file).split(path.sep).join('/');
    if (Object.prototype.hasOwnProperty.call(overrides, relative)) return overrides[relative];
    if (cache.has(file)) return cache.get(file).exports;

    const module = { exports: {} };
    cache.set(file, module);
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    const localRequire = dependency => dependency.startsWith('.') || dependency.startsWith('@/')
      ? load(resolveFile(dependency, file))
      : require(dependency);
    const execute = vm.runInThisContext(`(function(require, module, exports) {\n${compiled}\n})`, { filename: file });
    execute(localRequire, module, module.exports);
    return module.exports;
  }

  return load;
}

module.exports = { createTypeScriptLoader };
