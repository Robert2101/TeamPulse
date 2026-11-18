/**
 * Copies only the listed keys the object actually has. Everything else is dropped, including
 * update operators such as `$set` that a block-list of field names would miss.
 */
export const pick = (source, keys) => Object.fromEntries(
    keys.filter((key) => Object.hasOwn(source ?? {}, key)).map((key) => [key, source[key]])
);
