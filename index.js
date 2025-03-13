import path from 'path';
import { fileURLToPath } from 'url';
// import { createRequire } from 'module';

// const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const lang = process.env.LANG?.startsWith('it') ? 'it' : 'en';
// const messages = require(path.join(__dirname, 'localization', 'languages', lang));

const messages = (await import(`file://${path.join(__dirname, 'localization', 'languages', lang)}.js`)).default;


const [,, moduleFunction, ...args] = process.argv;
console.log('aReS: '+moduleFunction);
if (!moduleFunction) {
    console.error(messages.ERROR_NO_FUNCTION);
    process.exit(1);
}

let fn;
if (moduleFunction.includes(':')) {
    const [moduleName, functionName] = moduleFunction.split(':');
    try {
        const importedModule = await import(moduleName);
        fn = importedModule[functionName];
    } catch (error) {
        console.error(messages.ERROR_LOADING_MODULE.replace('{module}', moduleName).replace('{error}', error.message), error);
        process.exit(1);
    }
} else {
    try {
        fn = Object.values(exports).find(f => typeof f === 'function' && f.name === moduleFunction);
    } catch (error) {
        console.error(messages.ERROR_LOADING_FUNCTION.replace('{function}', moduleFunction).replace('{error}', error.message) ,error);
        process.exit(1);
    }
}

if (typeof fn !== 'function') {
    console.error(messages.ERROR_INVALID_FUNCTION.replace('{function}', moduleFunction));
    process.exit(1);
}

try {
    const result = fn(...args);
    if (result instanceof Promise) {
        result.then(console.log(result)).catch(console.error);
    } else {
        console.log(result);
    }
} catch (error) {
    console.error(messages.ERROR_EXECUTION.replace('{error}', error.message), error);
    process.exit(1);
}

