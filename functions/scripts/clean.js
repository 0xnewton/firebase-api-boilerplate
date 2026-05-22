const fs = require("fs");
const path = require("path");

const root = process.cwd();

const pathsToRemove = [
  "lib",
  "lib-tests",
  ...findRootBuildInfoFiles(root),
  ...findGeneratedFiles(path.join(root, "packages")),
];

for (const relativePath of pathsToRemove) {
  fs.rmSync(path.join(root, relativePath), {
    force: true,
    recursive: true,
  });
}

function findRootBuildInfoFiles(directory) {
  return fs.readdirSync(directory, {withFileTypes: true})
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tsbuildinfo"))
    .map((entry) => entry.name);
}

function findGeneratedFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(root, absolutePath);

    if (entry.isDirectory()) {
      return entry.name === "dist" ?
        [relativePath] :
        findGeneratedFiles(absolutePath);
    }

    return entry.name.endsWith(".tsbuildinfo") ? [relativePath] : [];
  });
}
