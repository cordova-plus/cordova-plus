import path from "node:path"
import findCacheDir from "find-cache-dir";

export const cacheDir = (...args: Parameters<typeof path.join>) => path.join(findCacheDir({ name: "cordova-plus"})!, ...args);
