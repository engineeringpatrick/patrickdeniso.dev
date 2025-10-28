import fs from "fs";
import { glob } from "glob";
import path from "path";

// Paths
const NOTES_PATH = path.resolve("src/content/notes");
const ASSETS_SRC = path.join(NOTES_PATH, "assets");
const ASSETS_DEST = path.resolve("public/assets");

// Sanitize to kebab-case and remove any percent encodings
function renameToKebab(filename: string): string {
  return filename
    .replace(/%25/g, "-") // decode triple encoding
    .replace(/%20/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-_.]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

// Create destination folder
function copyAssets(): Record<string, string> {
  const renameMap: Record<string, string> = {};

  if (fs.existsSync(ASSETS_DEST)) {
    fs.rmSync(ASSETS_DEST, { recursive: true, force: true });
    console.log("🧹 Removed old assets folder...");
  }

  fs.mkdirSync(ASSETS_DEST, { recursive: true });

  const imageFiles = glob.sync("**/*.{png,jpg,jpeg,gif,svg,webp}", {
    cwd: NOTES_PATH,
    nodir: true,
  });

  for (const file of imageFiles) {
    const rawName = path.basename(file);
    const mappedName = renameToKebab(
      file.replace(/assets[\/\\]/, "").replace(/[\/\\]/g, "-")
    );
    const src = path.join(NOTES_PATH, file);
    const dest = path.join(ASSETS_DEST, mappedName);

    fs.copyFileSync(src, dest);
    renameMap[rawName] = mappedName;
    renameMap[mappedName] = mappedName;

    console.log(`📎 Copied: ${file} → ${mappedName}`);
  }

  return renameMap;
}

// Rewrite all image paths in Markdown content
function rewriteMarkdownPaths(renameMap: Record<string, string>): void {
  const markdownFiles = glob.sync("**/*.md", {
    cwd: NOTES_PATH,
    absolute: true,
  });

  for (const file of markdownFiles) {
    let content = fs.readFileSync(file, "utf-8");
    const original = content;

    // Replace Markdown image links
    content = content.replace(
      /!\[([^\]]*)\]\((?:\.\/|\.\.\/)?(?:\/?assets\/)?([^)]+\.(?:png|jpe?g|gif|svg|webp))\)/gi,
      (_match, alt: string, filename: string) => {
        const clean = renameToKebab(filename);
        const mapped = renameMap[filename] || renameMap[clean] || clean;
        return `![${alt}](/assets/${mapped})`;
      }
    );

    // Replace Obsidian-style links
    content = content.replace(
      /!\[\[(?:assets\/)?([^|\]]+\.(?:png|jpe?g|gif|svg|webp))\]\]/gi,
      (_match, filename: string) => {
        const clean = renameToKebab(filename);
        const mapped = renameMap[filename] || renameMap[clean] || clean;
        return `![](/assets/${mapped})`;
      }
    );

    if (original !== content) {
      fs.writeFileSync(file, content, "utf-8");
      console.log(`✅ Rewrote paths in: ${path.relative(NOTES_PATH, file)}`);
    }
  }
}

const renameMap = copyAssets();
rewriteMarkdownPaths(renameMap);
