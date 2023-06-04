import findCacheDir from "find-cache-dir";

export const cacheDir = findCacheDir({ name: "cordova-plus", thunk: true });
