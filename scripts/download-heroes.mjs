import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve(process.cwd(), "public", "heroes");
const CATEGORIES_DIR = path.resolve(process.cwd(), "public", "categories");

const heroes = [
  {
    name: "landing-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20hero%20banner%2C%20rural%20Cameroon%20agriculture%20landscape%2C%20lush%20green%20fields%2C%20farmers%20harvesting%20maize%20and%20plantain%2C%20warm%20morning%20sunlight%2C%20natural%20colors%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "marketplace-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20banner%2C%20Cameroon%20open%20air%20market%20stall%20with%20fresh%20tomatoes%2C%20cassava%2C%20plantain%2C%20and%20maize%2C%20clean%20composition%2C%20warm%20daylight%2C%20natural%20colors%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "auth-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20banner%2C%20smartphone%20in%20hand%20in%20a%20rural%20Cameroon%20farm%20setting%2C%20soft%20green%20and%20gold%20tones%2C%20shallow%20depth%20of%20field%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "orders-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20banner%2C%20Cameroon%20farm%20produce%20being%20packed%20for%20delivery%2C%20hands%20sorting%20plantain%20and%20tomatoes%2C%20warm%20daylight%2C%20clean%20composition%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "chat-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20banner%2C%20buyer%20and%20farmer%20using%20a%20smartphone%20to%20chat%20at%20a%20market%20stall%2C%20Cameroon%20context%2C%20soft%20green%20tones%2C%20warm%20natural%20light%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "create-listing-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20banner%2C%20fresh%20farm%20produce%20arranged%20for%20a%20listing%20photo%2C%20cassava%2C%20maize%2C%20plantain%2C%20neutral%20background%2C%20soft%20daylight%2C%20professional%20product%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "prices-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20banner%2C%20Cameroon%20open%20air%20produce%20market%20stall%20with%20a%20weighing%20scale%20and%20fresh%20maize%2C%20cassava%2C%20plantain%2C%20tomatoes%2C%20clean%20composition%2C%20warm%20daylight%2C%20soft%20green%20and%20gold%20tones%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "advisory-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20banner%2C%20Cameroon%20farmer%20examining%20healthy%20green%20crops%20with%20a%20tablet%20device%2C%20soft%20sunlight%2C%20trustworthy%20modern%20feel%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "account-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20banner%2C%20portrait-style%20scene%20of%20a%20Cameroon%20farmer%20and%20buyer%20handshake%20in%20a%20market%20setting%2C%20warm%20natural%20light%2C%20premium%20trust%20feel%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "admin-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20banner%2C%20clean%20modern%20admin%20workspace%20with%20laptop%20showing%20generic%20charts%20without%20readable%20text%2C%20soft%20green%20accent%20lighting%2C%20paper%20documents%20with%20simple%20graphs%2C%20professional%20office%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "sync-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20banner%2C%20smartphone%20showing%20sync%20progress%20in%20outdoor%20daylight%2C%20soft%20green%20tones%2C%20clean%20minimal%20composition%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "info-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20banner%2C%20Cameroon%20agriculture%20cooperative%20meeting%20around%20produce%20samples%2C%20warm%20daylight%2C%20clean%20composition%2C%20trustworthy%20feel%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "onboarding-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20banner%2C%20person%20setting%20up%20profile%20on%20a%20smartphone%20in%20a%20rural%20Cameroon%20farm%20context%2C%20soft%20green%20and%20gold%20tones%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "notifications-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20banner%2C%20smartphone%20notification%20screen%20in%20outdoor%20light%2C%20subtle%20green%20theme%2C%20clean%20composition%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "listing-detail-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20banner%2C%20fresh%20produce%20close%20up%20in%20a%20Cameroon%20market%2C%20clean%20composition%2C%20soft%20daylight%2C%20premium%20feel%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "not-found-hero.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20banner%2C%20quiet%20Cameroon%20dirt%20road%20leading%20through%20green%20fields%20at%20sunrise%2C%20soft%20mist%2C%20calm%20tone%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  },
  {
    name: "feature-listing.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20close-up%20of%20fresh%20cassava%2C%20maize%2C%20plantain%20arranged%20cleanly%20on%20a%20market%20table%2C%20warm%20daylight%2C%20professional%20product%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_4_3"
  },
  {
    name: "feature-orders.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20hands%20handing%20over%20a%20box%20of%20produce%20at%20a%20market%20stall%2C%20Cameroon%20context%2C%20warm%20natural%20light%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_4_3"
  },
  {
    name: "feature-offline.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20smartphone%20in%20hand%20in%20outdoor%20daylight%2C%20simple%20app%20interface%20with%20no%20readable%20text%2C%20soft%20green%20tone%2C%20clean%20composition%2C%20professional%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_4_3"
  },
  {
    name: "how-it-works-bg.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20wide%20banner%2C%20lush%20green%20hills%20and%20farmland%20in%20Cameroon%20at%20golden%20hour%2C%20soft%20mist%2C%20calm%20premium%20feel%2C%20high%20quality%20commercial%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=landscape_16_9"
  }
];

const heroesSm = heroes
  .filter((h) => h.url.includes("image_size=landscape_16_9") && (h.name.endsWith("-hero.jpg") || h.name.endsWith("-bg.jpg")))
  .map((h) => ({
    name: h.name.replace(/\.jpg$/i, "-sm.jpg"),
    url: h.url.replace("image_size=landscape_16_9", "image_size=landscape_4_3")
  }));

const categories = [
  {
    name: "maize.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20top-down%20product%20photo%20of%20fresh%20maize%20cobs%20with%20husks%2C%20clean%20neutral%20background%2C%20soft%20daylight%2C%20premium%20food%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=square","dir":"categories"
  },
  {
    name: "cassava.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20top-down%20product%20photo%20of%20fresh%20cassava%20roots%2C%20clean%20neutral%20background%2C%20soft%20daylight%2C%20premium%20food%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=square","dir":"categories"
  },
  {
    name: "plantain.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20top-down%20product%20photo%20of%20fresh%20green%20plantain%20bunch%2C%20clean%20neutral%20background%2C%20soft%20daylight%2C%20premium%20food%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=square","dir":"categories"
  },
  {
    name: "cocoa.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20top-down%20product%20photo%20of%20cocoa%20pods%20and%20beans%2C%20clean%20neutral%20background%2C%20soft%20daylight%2C%20premium%20food%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=square","dir":"categories"
  },
  {
    name: "coffee.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20top-down%20product%20photo%20of%20coffee%20beans%20and%20coffee%20cherries%2C%20clean%20neutral%20background%2C%20soft%20daylight%2C%20premium%20food%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=square","dir":"categories"
  },
  {
    name: "palm-oil.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20top-down%20product%20photo%20of%20palm%20fruit%20bunch%20and%20a%20small%20bowl%20of%20palm%20oil%2C%20clean%20neutral%20background%2C%20soft%20daylight%2C%20premium%20food%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=square","dir":"categories"
  },
  {
    name: "tomato.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20top-down%20product%20photo%20of%20fresh%20tomatoes%20and%20green%20leaves%2C%20clean%20neutral%20background%2C%20soft%20daylight%2C%20premium%20food%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=square","dir":"categories"
  },
  {
    name: "groundnut.jpg",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Photorealistic%20top-down%20product%20photo%20of%20groundnuts%20peanuts%20in%20shell%20and%20shelled%2C%20clean%20neutral%20background%2C%20soft%20daylight%2C%20premium%20food%20photography%2C%20no%20letters%2C%20no%20numbers%2C%20no%20text%2C%20no%20watermark&image_size=square","dir":"categories"
  }
];

async function downloadOne({ name, url }) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`${name}: HTTP ${res.status}`);
  }
  const arr = new Uint8Array(await res.arrayBuffer());
  const out = path.join(OUT_DIR, name);
  await writeFile(out, arr);
  process.stdout.write(`saved ${name} (${Math.round(arr.byteLength / 1024)}kb)\n`);
}

async function downloadCategory({ name, url }) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`${name}: HTTP ${res.status}`);
  }
  const arr = new Uint8Array(await res.arrayBuffer());
  const out = path.join(CATEGORIES_DIR, name);
  await writeFile(out, arr);
  process.stdout.write(`saved categories/${name} (${Math.round(arr.byteLength / 1024)}kb)\n`);
}

await mkdir(OUT_DIR, { recursive: true });
await mkdir(CATEGORIES_DIR, { recursive: true });
for (const h of heroes) {
  await downloadOne(h);
}
for (const h of heroesSm) {
  await downloadOne(h);
}
for (const c of categories) {
  await downloadCategory(c);
}
