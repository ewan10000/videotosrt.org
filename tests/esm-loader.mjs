export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[a-z0-9]+$/i.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.js`, context);
    } catch {
      return nextResolve(specifier, context);
    }
  }

  return nextResolve(specifier, context);
}
