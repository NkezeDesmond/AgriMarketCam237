import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve(process.cwd(), "public", "categories");

const images = [
  {
    name: "maize-photo.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Corncobs.jpg/960px-Corncobs.jpg"
  },
  {
    name: "cassava-photo.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Cassava_roots.jpg/960px-Cassava_roots.jpg"
  },
  {
    name: "plantain-photo.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Plantains.jpg/960px-Plantains.jpg"
  },
  {
    name: "cocoa-photo.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Cocoa_pods.jpg/960px-Cocoa_pods.jpg"
  },
  {
    name: "coffee-photo.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Coffee_beans.jpg/960px-Coffee_beans.jpg"
  },
  {
    name: "palm-oil-photo.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/91/Oil_palm_fruit.jpg"
  },
  {
    name: "tomato-photo.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Tomato.jpg"
  },
  {
    name: "groundnut-photo.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/88/Peanuts.jpg"
  }
];

async function downloadOne({ name, url }) {
  let attempt = 0;
  while (attempt < 6) {
    attempt += 1;
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "AgriMarketCameroon/1.0 (local dev)",
        accept: "image/avif,image/webp,image/*,*/*;q=0.8"
      }
    });
    if (res.status === 429 && attempt < 6) {
      const waitMs = 700 * attempt;
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    const arr = new Uint8Array(await res.arrayBuffer());
    const out = path.join(OUT_DIR, name);
    await writeFile(out, arr);
    process.stdout.write(`saved categories/${name} (${Math.round(arr.byteLength / 1024)}kb)\n`);
    return;
  }
  throw new Error(`${name}: Failed after retries`);
}

await mkdir(OUT_DIR, { recursive: true });
for (const img of images) {
  try {
    await downloadOne(img);
  } catch (e) {
    process.stdout.write(`failed categories/${img.name}\n`);
    if (!process.env.CI) {
      throw e;
    }
  }
}
