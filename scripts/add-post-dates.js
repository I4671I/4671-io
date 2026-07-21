import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function addMissingPostDates() {
  const postsDirectory = "content/posts";
  const markdownFiles = fs
    .readdirSync(postsDirectory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(entry.parentPath, entry.name));
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  for (const file of markdownFiles) {
    const source = fs.readFileSync(file, "utf8");
    const frontMatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontMatter || /^date\s*:/m.test(frontMatter[1])) continue;

    const updatedFrontMatter = frontMatter[1].replace(
      /^(title\s*:.*)$/m,
      `$1\ndate: ${today}`
    );
    const updatedSource = source.replace(
      frontMatter[0],
      `---\n${updatedFrontMatter}\n---`
    );
    fs.writeFileSync(file, updatedSource);
    console.log(`[dates] Added ${today} to ${file}`);
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  addMissingPostDates();
}
