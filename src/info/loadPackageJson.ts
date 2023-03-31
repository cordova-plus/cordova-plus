import PackageJson from "@npmcli/package-json";

export function loadPackageJson(root = "./") {
  return PackageJson.load(root);
}
