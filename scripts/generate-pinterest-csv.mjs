/**
 * PosterGenius — Pinterest Bulk Upload CSV Generator
 *
 * Connects to MongoDB, pulls all products, and generates a CSV file
 * that can be bulk-uploaded to Pinterest via:
 * https://ads.pinterest.com/advertiser/bulk-editor/
 *
 * Usage:
 *   node scripts/generate-pinterest-csv.mjs
 *
 * Output:
 *   scripts/output/pinterest-pins.csv
 */

import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ─── Config ────────────────────────────────────────────────────────────────

const SITE_URL = "https://postergenius.ca";
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const UTM = "utm_source=pinterest&utm_medium=social&utm_campaign=organic";

// Map product categories → Pinterest board names
const CATEGORY_TO_BOARD = {
  animals:     "Animal Wall Art Prints",
  superheroes: "Comic Book & Hero Wall Art",
  scenery:     "Scenery & Landscape Wall Art",
  botanicals:  "Botanical Wall Art",
  wildlife:    "Wildlife Wall Art Prints",
  vintage:     "Vintage Poster Prints",
  sports:      "Sports Wall Art Prints",
};

// High-traffic generic boards every pin is also posted to
const ALWAYS_ADD_BOARDS = [
  "Minimalist Wall Art Prints",
  "Gallery Wall Ideas",
];

// ─── Per-Product Pin Overrides ─────────────────────────────────────────────
// Formula (digital): "[Keyword-rich subject] Printable Wall Art | [Room/Aesthetic]"
// Formula (physical): "[Keyword-rich subject] Wall Art Print | [Room/Aesthetic] Poster"
// Rule: first 30-35 chars = primary search term. Max 100 chars.
// Superhero titles: no trademarked character names — describe the visual instead.
//
// ⚠️  "big ass crocodile" and "cool lione" have category "Earphone" in the DB —
//     these appear to be miscategorized test products. Treating as animals for now.

const PIN_OVERRIDES = {
  // ── Animals ───────────────────────────────────────────────────────────────
  "big ass crocodile": {
    title: "Crocodile Wildlife Printable Wall Art | Reptile Nature Home Decor",
    description: "Bold crocodile wildlife art print — a striking statement piece for any nature lover's space. Available as an instant digital download in 12×18, 18×24, and 24×36. Print at home and frame it your way. Shop at postergenius.ca. #wildlifeprint #animalposter",
  },
  "cool lione": {
    title: "Majestic Lion Portrait Printable Wall Art | Wildlife Home Decor",
    description: "A commanding lion portrait print that brings bold African wildlife energy into any room. Instant digital download available in multiple sizes. Perfect for living rooms, offices, and gallery walls. Shop at postergenius.ca. #lionprint #wildlifewallart",
  },
  "Monochromatic Bear": {
    title: "Monochromatic Bear Printable Wall Art | Black White Animal Print",
    description: "Minimalist black and white bear art print — clean, modern, and versatile. Instant digital download in 12×18, 18×24, and 24×36. Pairs beautifully with neutral and Scandinavian-style interiors. Shop at postergenius.ca. #blackwhitewallart #animalprintables",
  },
  "Beige Equestrian": {
    title: "Beige Horse Equestrian Printable Wall Art | Neutral Animal Print",
    description: "Warm beige equestrian horse art print — elegant and timeless. Instant digital download in multiple sizes. Ideal for neutral, earthy, or boho-style interiors and bedroom gallery walls. Shop at postergenius.ca. #equestrianprint #horsewallart",
  },
  "Chill Poster": {
    title: "Relaxed Animal Printable Wall Art | Laid-Back Home Decor Print",
    description: "Easygoing animal wall art with a cool, understated vibe. Instant digital download available in 12×18, 18×24, and 24×36. A great fit for casual living spaces, dorms, and eclectic gallery walls. Shop at postergenius.ca. #animalprintable #casualhomedecor",
  },
  "Nature's Guardian ": {
    title: "Nature's Guardian Animal Printable Wall Art | Wildlife Home Decor",
    description: "Powerful wildlife guardian art print — bold and atmospheric. Instant digital download in multiple sizes. Perfect for nature lovers and anyone who wants striking wall art with a story. Shop at postergenius.ca. #wildlifewallart #natureposter",
  },
  "Double Exposure": {
    title: "Double Exposure Animal Printable Wall Art | Modern Art Print",
    description: "Striking double exposure animal portrait — nature and artistry layered into one. Instant digital download in 12×18, 18×24, and 24×36. A modern statement piece for minimalist and contemporary spaces. Shop at postergenius.ca. #doubleexposure #modernwallart",
  },
  "Dreaming in the Wild": {
    title: "Dreaming in the Wild Animal Printable Wall Art | Nature Bedroom Decor",
    description: "Dreamy, atmospheric wildlife art print that brings the outdoors in. Instant digital download in multiple sizes. Perfect above a bed or as a soft focal point in a nature-inspired bedroom. Shop at postergenius.ca. #wildlifeprintable #bedroomwallart",
  },
  "Bubble Trouble": {
    title: "Playful Animal Printable Wall Art | Fun Kids Room Decor Print",
    description: "Whimsical and playful animal wall art that brings personality to any room. Instant digital download in 12×18, 18×24, and 24×36. Great for kids' rooms, playrooms, or anyone who likes art with a sense of humor. Shop at postergenius.ca. #kidsroomdecor #funwallart",
  },
  "Sunset Silhouette": {
    title: "Sunset Silhouette Animal Printable Wall Art | Golden Hour Nature Print",
    description: "Warm golden-hour animal silhouette print — dramatic, minimal, and beautiful. Instant digital download in multiple sizes. Stunning in living rooms or as a bedroom focal point. Shop at postergenius.ca. #sunsetwallart #silhouetteprint",
  },
  "Leopard Print": {
    title: "Leopard Portrait Printable Wall Art | Big Cat Animal Art Print",
    description: "Bold leopard portrait wall art for those who love wild and exotic home decor. Instant digital download in 12×18, 18×24, and 24×36. A standout piece for living rooms, offices, and gallery walls. Shop at postergenius.ca. #leopardprint #bigcatwallart",
  },
  "Majestic White Warhorse": {
    title: "White Horse Printable Wall Art | Majestic Equestrian Art Print",
    description: "A powerful white warhorse — regal, dramatic, and full of presence. Instant digital download in multiple sizes. Perfect for equestrian lovers and anyone drawn to bold, commanding wall art. Shop at postergenius.ca. #horseposter #equestrianwallart",
  },
  "Don't be Koi with me": {
    title: "Koi Fish Printable Wall Art | Japanese Zen Home Decor Print",
    description: "Elegant koi fish art print inspired by Japanese tradition and Zen aesthetics. Instant digital download in 12×18, 18×24, and 24×36. Beautiful in meditation spaces, living rooms, and eclectic galleries. Shop at postergenius.ca. #koifish #japanesewallart",
  },

  // ── Scenery ───────────────────────────────────────────────────────────────
  "True Dad-ication": {
    title: "Father & Child Scenery Printable Wall Art | Sentimental Gift Print",
    description: "A heartfelt scenery print celebrating the bond between parent and child. Instant digital download in multiple sizes. A meaningful gift for dads and a beautiful addition to a family home. Shop at postergenius.ca. #dadgift #familywallart",
  },
  "Grand Canal": {
    title: "Venice Grand Canal Printable Wall Art | Travel Scenery Print",
    description: "Capture the timeless beauty of Venice's Grand Canal in your home. Instant digital download in 12×18, 18×24, and 24×36. A stunning travel-inspired print for living rooms, offices, and gallery walls. Shop at postergenius.ca. #veniceposter #travelwallart",
  },
  "Parisian Rhapsody": {
    title: "Paris Cityscape Printable Wall Art | Parisian Home Decor Print",
    description: "Bring the romance of Paris into your space with this elegant cityscape print. Instant digital download in multiple sizes. Perfect for French-inspired interiors, reading nooks, and gallery walls. Shop at postergenius.ca. #parisposter #frenchhomedecor",
  },

  // ── Wildlife ──────────────────────────────────────────────────────────────
  "Leopard's Verdant Watch": {
    title: "Leopard in Jungle Printable Wall Art | Wildlife Nature Art Print",
    description: "A leopard at rest in lush green foliage — wild, watchful, and striking. Instant digital download in 12×18, 18×24, and 24×36. A bold statement piece for nature lovers and wildlife enthusiasts. Shop at postergenius.ca. #leopardposter #wildlifeprint",
  },
  "A Classic Dove Story": {
    title: "Dove Bird Printable Wall Art | Peaceful Wildlife Home Decor",
    description: "A serene and classic dove print — timeless, peaceful, and elegant. Instant digital download in multiple sizes. Perfect for calm, light-filled spaces and minimalist interiors. Shop at postergenius.ca. #birdwallart #doveposter",
  },
  "Majestic Autumn King": {
    title: "Autumn Stag Deer Printable Wall Art | Wildlife Nature Art Print",
    description: "A majestic stag set against the warm tones of autumn — dramatic and breathtaking. Instant digital download in 12×18, 18×24, and 24×36. Perfect for rustic, earthy, and nature-inspired interiors. Shop at postergenius.ca. #stagposter #autumnwallart",
  },
  "Lion Mane Golden Hour": {
    title: "Lion Golden Hour Printable Wall Art | Majestic Wildlife Art Print",
    description: "A breathtaking lion portrait bathed in golden hour light. Instant digital download in multiple sizes. A bold, cinematic piece for living rooms, offices, and feature walls. Shop at postergenius.ca. #lionwallart #goldenhourprint",
  },
  "Africa's Friendly Giant": {
    title: "Elephant African Wildlife Printable Wall Art | Safari Home Decor",
    description: "A gentle giant of the African savanna — warm, majestic, and full of character. Instant digital download in 12×18, 18×24, and 24×36. Beautiful in living rooms and gallery wall arrangements. Shop at postergenius.ca. #elephantprint #safaridecor",
  },

  // ── Botanicals ────────────────────────────────────────────────────────────
  "Desert lines": {
    title: "Desert Botanical Line Art Printable Wall Art | Minimalist Print",
    description: "Clean desert botanical line art — minimal, modern, and endlessly versatile. Instant digital download in multiple sizes. A perfect fit for neutral, Scandinavian, and boho interiors. Shop at postergenius.ca. #botanicalprint #lineartwallart",
  },
  "Ceaser's Snack": {
    title: "Fresh Greens Botanical Printable Wall Art | Kitchen Home Decor",
    description: "A vibrant botanical print celebrating fresh greens — playful and kitchen-perfect. Instant digital download in 12×18, 18×24, and 24×36. Brighten up your kitchen, dining room, or any casual space. Shop at postergenius.ca. #kitchenwallart #botanicalposter",
  },
  "Perfect Pear-ing": {
    title: "Pear Botanical Printable Wall Art | Fruit Kitchen Decor Print",
    description: "A charming pear botanical print that adds warmth and character to any kitchen or dining space. Instant digital download in multiple sizes. Simple, stylish, and easy to frame. Shop at postergenius.ca. #fruitwallart #kitchenposter",
  },
  "Pink Pomegranate Poster": {
    title: "Pink Pomegranate Botanical Printable Wall Art | Fruit Home Decor",
    description: "A rich, jewel-toned pomegranate botanical print — striking and sophisticated. Instant digital download in 12×18, 18×24, and 24×36. Great for kitchens, dining rooms, and eclectic gallery walls. Shop at postergenius.ca. #botanicalprintable #pomegranateprint",
  },
  "Rustic Charm": {
    title: "Rustic Botanical Printable Wall Art | Farmhouse Home Decor Print",
    description: "Warm rustic botanical wall art with earthy farmhouse charm. Instant digital download in multiple sizes. Perfect for cozy kitchens, dining rooms, and country-style interiors. Shop at postergenius.ca. #farmhousedecor #rusticwallart",
  },
  "Ink Essence": {
    title: "Ink Botanical Plant Printable Wall Art | Abstract Nature Print",
    description: "Expressive ink botanical art — raw, organic, and beautifully imperfect. Instant digital download in 12×18, 18×24, and 24×36. A striking choice for modern, artistic, and eclectic interiors. Shop at postergenius.ca. #inkwallart #botanicalprintable",
  },
  "Zesty Appeal": {
    title: "Citrus Botanical Printable Wall Art | Bright Kitchen Home Decor",
    description: "Vibrant citrus botanical art print full of sunshine and energy. Instant digital download in multiple sizes. Perfect for kitchens, breakfast nooks, and any space that needs a pop of colour. Shop at postergenius.ca. #citruswallart #botanicalposter",
  },

  // ── Superheroes (no trademark names) ─────────────────────────────────────
  "Venomous Encounter": {
    title: "Dark Symbiote Antihero Comic Style Printable Wall Art | Villain Print",
    description: "Intense, dark comic book-style antihero wall art — bold and unapologetic. Instant digital download in 12×18, 18×24, and 24×36. Perfect for comics fans, man caves, and edgy gallery walls. Shop at postergenius.ca. #comicbookwallart #antiheroposter",
  },
  "RDJ brings the Doom": {
    title: "Iron Genius vs Armored Villain Comic Printable Wall Art | Marvel Style",
    description: "An epic comic-style showdown between genius and doom — dramatic and detailed. Instant digital download in multiple sizes. A must-have for comic book fans and superhero decor lovers. Shop at postergenius.ca. #comicwallart #superheroposter",
  },
  "Deadpool broke the fourth wall... again": {
    title: "Merc with a Mouth Comic Style Printable Wall Art | Funny Hero Print",
    description: "The mouthy merc breaks the fourth wall — again. Bold comic-style art for fans who get the joke. Instant digital download in 12×18, 18×24, and 24×36. Ideal for office walls, dorm rooms, and anyone with a great sense of humor. Shop at postergenius.ca. #comicposter #funnywallart",
  },
  "Hunt & Gather": {
    title: "Comic Book Action Hero Printable Wall Art | Adventure Home Decor",
    description: "Dynamic comic book action hero art — energetic, bold, and made for fans. Instant digital download in multiple sizes. Great for kids' rooms, gaming setups, and adventure-themed gallery walls. Shop at postergenius.ca. #comicbookprint #actionwallart",
  },
  "Silver Finish - Herald of Galactus": {
    title: "Silver Cosmic Herald Comic Style Printable Wall Art | Space Art Print",
    description: "A gleaming cosmic herald soars through the stars — dramatic, otherworldly, and stunning. Instant digital download in 12×18, 18×24, and 24×36. Perfect for sci-fi fans and anyone who loves bold, cinematic wall art. Shop at postergenius.ca. #cosmicwallart #scifiposter",
  },
  "Blade ": {
    title: "Vampire Hunter Comic Style Printable Wall Art | Dark Hero Art Print",
    description: "A sleek and powerful dark hero poster — brooding, stylish, and iconic. Instant digital download in multiple sizes. Perfect for fans of dark comic aesthetics, man caves, and edgy interiors. Shop at postergenius.ca. #darkheroposter #comicwallart",
  },
  "An Agent of Chaos": {
    title: "Clown Prince Villain Comic Style Printable Wall Art | Dark Art Print",
    description: "Why so serious? Iconic dark comic villain art — dramatic, theatrical, and unforgettable. Instant digital download in 12×18, 18×24, and 24×36. A bold statement piece for comic fans and dark aesthetic interiors. Shop at postergenius.ca. #villainposter #comicstyleprint",
  },
  "Nightwing New 52": {
    title: "Acrobatic Hero Comic Style Printable Wall Art | Blue Bird Art Print",
    description: "The agile blue-suited hero in action — dynamic, sleek, and fan-favourite. Instant digital download in multiple sizes. Perfect for DC fans and superhero-themed rooms and gallery walls. Shop at postergenius.ca. #comicheroposter #superherowallart",
  },
  "A strange Spellbinding": {
    title: "Sorcerer Supreme Comic Style Wall Art Print | Magic Hero Poster",
    description: "Mystical sorcerer art that blends comic book style with magical wonder. Available as a physical print (ships to your door) and instant digital download. Sizes 12×18, 18×24, 24×36. Perfect for fans of magic and the mystic arts. Shop at postergenius.ca. #magicwallart #comicstyleprint",
  },
  "8-Bit Adventures": {
    title: "8-Bit Retro Gaming Heroes Wall Art Print | Pixel Art Poster",
    description: "Classic 8-bit pixel art heroes — nostalgic, fun, and endlessly cool. Available as a physical print and instant digital download in 12×18, 18×24, and 24×36. Perfect for gaming rooms, dorm walls, and retro-style spaces. Shop at postergenius.ca. #pixelwallart #gamingdecor",
  },

  // ── Sports ────────────────────────────────────────────────────────────────
  "Mamba Mentality": {
    title: "Basketball Legend Motivational Wall Art Print | Sports Home Decor",
    description: "Elite basketball mindset — bold, motivational, and built for champions. Available as a physical print and instant digital download in 12×18, 18×24, and 24×36. Perfect for home gyms, offices, and sports-themed rooms. Shop at postergenius.ca. #basketballposter #motivationalwallart",
  },

  // ── More Superheroes ──────────────────────────────────────────────────────
  "Claws & Quips": {
    title: "Clawed Hero Comic Style Wall Art Print | Witty Action Poster",
    description: "The best there is at what he does — sharp claws and sharper wit. Available as a physical print and instant digital download in 12×18, 18×24, and 24×36. A fan-favourite for comic lovers and bold gallery walls. Shop at postergenius.ca. #comicwallart #heroprint",
  },
};

// ─── Cloudinary URL Builder ────────────────────────────────────────────────

function toPinterestUrl(cloudinaryUrl) {
  if (!cloudinaryUrl) return null;

  if (cloudinaryUrl.includes("res.cloudinary.com")) {
    // Avoid double-injecting transforms
    if (cloudinaryUrl.includes("w_1000,h_1500")) return cloudinaryUrl;
    return cloudinaryUrl.replace(
      "/image/upload/",
      "/image/upload/w_1000,h_1500,c_fill,g_auto,f_auto,q_auto/"
    );
  }

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_1000,h_1500,c_fill,g_auto,f_auto,q_auto/${cloudinaryUrl}`;
}

// ─── Fallback generators (for any future products without an override) ─────

const CATEGORY_DESCRIPTIONS = {
  animals:     "Premium animal wall art print available as an instant digital download. Print at home in 12×18, 18×24, or 24×36. Shop at postergenius.ca. #animalprintable #wallartprint",
  superheroes: "Bold comic book style wall art — instant digital download in multiple sizes. Perfect for fans and gallery walls. Shop at postergenius.ca. #comicwallart #superheroposter",
  scenery:     "Beautiful scenery and landscape wall art — instant digital download in 12×18, 18×24, 24×36. Shop at postergenius.ca. #landscapeposter #travelwallart",
  botanicals:  "Elegant botanical wall art print — instant digital download in multiple sizes. Perfect for kitchens, living rooms, and gallery walls. Shop at postergenius.ca. #botanicalprint #plantposter",
  wildlife:    "Stunning wildlife art print — instant digital download in 12×18, 18×24, 24×36. Shop at postergenius.ca. #wildlifeprint #natureposter",
  vintage:     "Classic vintage poster print — instant digital download in multiple sizes. Timeless style for any interior. Shop at postergenius.ca. #vintageposter #retroprint",
  sports:      "Bold sports wall art — instant digital download in 12×18, 18×24, 24×36. Perfect for home gyms and sports rooms. Shop at postergenius.ca. #sportsposter #motivationalwallart",
};

function buildFallbackTitle(product) {
  const isPhysical = product.isPrintfulEnabled || product.printfulEnabled;
  const suffix = isPhysical ? "Wall Art Print" : "Printable Wall Art";
  const base = `${product.name} ${suffix}`;
  return base.length <= 100 ? base : base.slice(0, 97) + "...";
}

function buildFallbackDescription(product) {
  return CATEGORY_DESCRIPTIONS[product.category] ||
    "Premium wall art print — instant digital download in multiple sizes. Shop at postergenius.ca.";
}

// ─── Link Builder ──────────────────────────────────────────────────────────

function buildLink(product) {
  const slug = product.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${SITE_URL}/product/${slug}?${UTM}`;
}

// ─── CSV Helpers ───────────────────────────────────────────────────────────

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

function csvRow(cells) {
  return cells.map(csvCell).join(",");
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("❌  MONGODB_URI not found in .env");
    process.exit(1);
  }
  if (!CLOUD_NAME) {
    console.error("❌  CLOUDINARY_CLOUD_NAME not found in .env");
    process.exit(1);
  }

  console.log("🔌  Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅  Connected\n");

  const productSchema = new mongoose.Schema({
    name: String,
    description: String,
    category: String,
    image: [String],
    digitalFileKey: String,
    isPrintfulEnabled: Boolean,
    printfulEnabled: Boolean,
  });

  const Product =
    mongoose.models.product || mongoose.model("product", productSchema);

  const products = await Product.find({}).lean();
  console.log(`📦  Found ${products.length} products\n`);

  const rows = [];
  const HEADER = ["Title", "Media URL", "Description", "Link", "Board"];
  rows.push(csvRow(HEADER));

  let pinCount = 0;
  let overrideCount = 0;
  let fallbackCount = 0;
  const skipped = [];

  for (const product of products) {
    const imageUrl = toPinterestUrl(product.image?.[0]);
    if (!imageUrl) {
      skipped.push(product.name);
      continue;
    }

    const override = PIN_OVERRIDES[product.name] ?? PIN_OVERRIDES[product.name?.trim()];
    const title = override?.title ?? buildFallbackTitle(product);
    const description = override?.description ?? buildFallbackDescription(product);
    const link = buildLink(product);
    const primaryBoard = CATEGORY_TO_BOARD[product.category] || "Minimalist Wall Art Prints";

    if (override) overrideCount++; else fallbackCount++;

    // Primary category board
    rows.push(csvRow([title, imageUrl, description, link, primaryBoard]));
    pinCount++;

    // High-traffic generic boards
    for (const board of ALWAYS_ADD_BOARDS) {
      rows.push(csvRow([title, imageUrl, description, link, board]));
      pinCount++;
    }
  }

  const outputDir = path.resolve(__dirname, "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.resolve(outputDir, "pinterest-pins.csv");
  fs.writeFileSync(outputPath, rows.join("\n"), "utf-8");

  console.log(`✅  Generated ${pinCount} pins from ${products.length} products`);
  console.log(`   ├─ ${overrideCount} with optimized titles`);
  console.log(`   └─ ${fallbackCount} with auto-generated fallback titles`);
  if (skipped.length) {
    console.log(`\n⚠️   Skipped (no image): ${skipped.join(", ")}`);
  }
  console.log(`\n📄  Saved to: ${outputPath}`);
  console.log(`\n📌  Next steps:`);
  console.log(`    1. Go to https://ads.pinterest.com → Bulk editor`);
  console.log(`    2. Upload pinterest-pins.csv`);
  console.log(`    3. Review pins before publishing\n`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
