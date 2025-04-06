import fs from "fs";
import path from "path";
import { glob } from "glob";

// Paths
const NOTES_PATH = path.resolve("src/content/notes");
const ASSETS_SRC = path.join(NOTES_PATH, "assets");
const ASSETS_DEST = path.resolve("public/assets");

// 1. Copy all images from notes/assets to public/assets
function copyAssets(): void {
  if (!fs.existsSync(ASSETS_DEST)) {
    fs.mkdirSync(ASSETS_DEST, { recursive: true });
  }

  const imageFiles = glob.sync("**/*.{png,jpg,jpeg,gif,svg,webp}", {
    cwd: ASSETS_SRC,
  });

  for (const file of imageFiles) {
    const src = path.join(ASSETS_SRC, file);
    const dest = path.join(ASSETS_DEST, file);

    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${file}`);
  }
}

// 2. Rewrite Markdown image paths from (./)?assets/… to /assets/…
function rewriteMarkdownPaths(): void {
    const markdownFiles = glob.sync("**/*.md", {
      cwd: NOTES_PATH,
      absolute: true,
    });
  
    for (const file of markdownFiles) {
      let content = fs.readFileSync(file, "utf-8");
  
      // Step 1: Normalize duplicate /assets/ segments (clean up broken ones)
      let updated = content.replace(/\/?(?:assets\/)+/gi, "");
  
      // Step 2: Rewrite Markdown image links not already starting with /assets/
      updated = updated.replace(
        /!\[([^\]]*)\]\((?!\/assets\/)(\.\/|\.\.\/)?(assets\/)?([^)\s]+\.(?:png|jpe?g|gif|svg|webp))\)/gi,
        (_match, alt: string, _prefix: string, _assetFolder: string, filename: string) => {
          return `![${alt}](/assets/${filename})`;
        }
      );
  
      // Step 3: Rewrite Obsidian-style image links like ![[image.png]]
      updated = updated.replace(
        /!\[\[(?!\/assets\/)(?:assets\/)?([^|\]]+\.(?:png|jpe?g|gif|svg|webp))\]\]/gi,
        (_match, filename: string) => {
          return `![](/assets/${filename})`;
        }
      );
  
      // Save only if changes occurred
      if (content !== updated) {
        fs.writeFileSync(file, updated, "utf-8");
        console.log(`✅ Cleaned and rewrote image paths in: ${path.relative(NOTES_PATH, file)}`);
      }
    }
  }
  

copyAssets();
rewriteMarkdownPaths();
