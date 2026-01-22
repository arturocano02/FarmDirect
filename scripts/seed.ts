/**
 * FairFarm Seed Script
 *
 * Populates Supabase Cloud with test data using SERVICE ROLE KEY (bypasses RLS):
 * - 20 approved farms with realistic data and Unsplash images
 * - 12 products per farm with images
 *
 * Usage:
 *   pnpm db:seed
 *
 * Requirements:
 *   - .env.local with:
 *     - NEXT_PUBLIC_SUPABASE_URL
 *     - SUPABASE_SERVICE_ROLE_KEY
 *
 * This script is IDEMPOTENT:
 *   - Farms are upserted by slug
 *   - Products are upserted by (farm_id, name)
 *   - Safe to run multiple times
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment
if (!supabaseUrl) {
  console.error("\n❌ Missing NEXT_PUBLIC_SUPABASE_URL\n");
  console.error("Please create .env.local with your Supabase project URL.");
  console.error("Get it from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api\n");
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error("\n❌ Missing SUPABASE_SERVICE_ROLE_KEY\n");
  console.error("Please add the service_role key to .env.local.");
  console.error("Get it from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api");
  console.error("\n⚠️  The service role key is required to bypass RLS for seeding.\n");
  process.exit(1);
}

console.log("🔗 Connecting to Supabase:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Stats tracking
const stats = {
  farmsInserted: 0,
  farmsUpdated: 0,
  productsInserted: 0,
  productsUpdated: 0,
  totalProductsProcessed: 0,
};

// =============================================================================
// FARM SEED DATA (20 farms with Unsplash images)
// =============================================================================

const farms = [
  {
    name: "Meadowbrook Farm",
    slug: "meadowbrook-farm",
    short_description: "Heritage breed specialists raising grass-fed beef and free-range pork in the Cotswolds.",
    story: `Meadowbrook Farm has been in the Harrison family for four generations. Nestled in the heart of the Cotswolds, we raise heritage breed cattle and pigs the traditional way - on open pastures with plenty of space to roam.\n\nOur Aberdeen Angus cattle graze on wildflower meadows, developing the rich marbling that makes our beef so tender and flavourful. Our Gloucestershire Old Spots pigs forage freely, producing pork with unmatched depth of taste.\n\nWe believe in slow farming. No growth hormones, no routine antibiotics, no shortcuts.`,
    hero_image_url: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200&h=600&fit=crop&q=80",
    postcode: "GL7 5AB",
    postcode_rules: ["GL", "SN", "OX", "BA"],
    badges: ["grass-fed", "heritage-breed", "pasture-raised"],
    delivery_days: ["Wednesday", "Saturday"],
    cutoff_time: "18:00",
    min_order_value: 3500,
    delivery_fee: 595,
    status: "approved" as const,
  },
  {
    name: "Riverside Meats",
    slug: "riverside-meats",
    short_description: "Award-winning butchers sourcing from local farms within 30 miles of our shop.",
    story: `Riverside Meats was founded by James and Sarah Chen in 2015 with a simple mission: bring restaurant-quality meat directly to home cooks.\n\nWe work exclusively with small farms within a 30-mile radius of our butchery. Every animal we source is raised outdoors, fed on natural diets, and processed with care at our on-site facility.\n\nOur head butcher has over 25 years of experience and takes pride in every cut.`,
    hero_image_url: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1200&h=600&fit=crop&q=80",
    postcode: "RG9 1BH",
    postcode_rules: ["RG", "OX", "SL", "HP"],
    badges: ["award-winning", "local-sourced", "dry-aged"],
    delivery_days: ["Tuesday", "Friday"],
    cutoff_time: "12:00",
    min_order_value: 4000,
    delivery_fee: 495,
    status: "approved" as const,
  },
  {
    name: "Highland Heritage",
    slug: "highland-heritage",
    short_description: "Scottish Highland cattle and native sheep from the hills of Perthshire.",
    story: `High in the Perthshire hills, our Highland cattle have roamed the same land for centuries. These magnificent beasts are perfectly adapted to Scotland's rugged terrain, growing slowly on heather-rich pastures to produce beef of extraordinary depth and character.\n\nOur flock of Blackface sheep graze the hillsides alongside the cattle, producing lamb with a distinctive flavour that reflects our unique terroir.`,
    hero_image_url: "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=1200&h=600&fit=crop&q=80",
    postcode: "PH7 3LN",
    postcode_rules: ["PH", "FK", "DD", "KY", "EH"],
    badges: ["scottish", "native-breeds", "hill-reared"],
    delivery_days: ["Thursday"],
    cutoff_time: "10:00",
    min_order_value: 5000,
    delivery_fee: 795,
    status: "approved" as const,
  },
  {
    name: "Orchard End Farm",
    slug: "orchard-end-farm",
    short_description: "Free-range poultry and rare breed pork from our family farm in Kent.",
    story: `Welcome to Orchard End, where our chickens scratch beneath apple trees and our pigs rootle through woodland.\n\nWe started keeping a few hens for eggs fifteen years ago, and what began as a hobby has grown into a passion for raising exceptional poultry and pork. Our birds have the run of our traditional orchards.`,
    hero_image_url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=600&fit=crop&q=80",
    postcode: "ME13 8XY",
    postcode_rules: ["ME", "CT", "TN", "DA", "BR", "SE"],
    badges: ["free-range", "woodland-reared", "small-batch"],
    delivery_days: ["Wednesday", "Saturday"],
    cutoff_time: "16:00",
    min_order_value: 2500,
    delivery_fee: 450,
    status: "approved" as const,
  },
  {
    name: "Vale Farm Organics",
    slug: "vale-farm-organics",
    short_description: "Certified organic beef and lamb from our regenerative farm in Somerset.",
    story: `Vale Farm has been certified organic since 1998, but our journey towards truly sustainable farming goes much deeper.\n\nWe practice regenerative agriculture, using our cattle and sheep as partners in rebuilding soil health. Our Ruby Red Devon cattle are a traditional Somerset breed, perfectly suited to our lush pastures.`,
    hero_image_url: "https://images.unsplash.com/photo-1594489428504-5c0c480a15fd?w=1200&h=600&fit=crop&q=80",
    postcode: "BA10 0QE",
    postcode_rules: ["BA", "BS", "TA", "DT", "SP"],
    badges: ["organic", "regenerative", "sustainable"],
    delivery_days: ["Tuesday", "Friday"],
    cutoff_time: "14:00",
    min_order_value: 4500,
    delivery_fee: 650,
    status: "approved" as const,
  },
  {
    name: "North Moor Farms",
    slug: "north-moor-farms",
    short_description: "Traditional Hereford beef and Salt Marsh lamb from the North York Moors.",
    story: `On the edge of the North York Moors, where the heather meets the salt marshes of the coast, we raise some of Britain's finest meat.\n\nOur Hereford cattle thrive on the mineral-rich moorland grasses, developing the distinctive flavour that's made North York Moors beef famous among chefs.`,
    hero_image_url: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=1200&h=600&fit=crop&q=80",
    postcode: "YO21 1RX",
    postcode_rules: ["YO", "TS", "DL", "HG", "LS"],
    badges: ["moorland-grazed", "salt-marsh", "traditional"],
    delivery_days: ["Monday", "Thursday"],
    cutoff_time: "11:00",
    min_order_value: 3000,
    delivery_fee: 550,
    status: "approved" as const,
  },
  {
    name: "Willow Creek Ranch",
    slug: "willow-creek-ranch",
    short_description: "American-style ranch raising premium Wagyu-cross cattle in the Welsh borders.",
    story: `Inspired by the great ranches of America but rooted in Welsh farming traditions, Willow Creek combines the best of both worlds.\n\nOur Wagyu-cross cattle are raised on lush Welsh pastures, producing beef with exceptional marbling and a rich, buttery flavour.`,
    hero_image_url: "https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?w=1200&h=600&fit=crop&q=80",
    postcode: "SY21 8PP",
    postcode_rules: ["SY", "LD", "HR", "WR"],
    badges: ["grass-fed", "slow-grown", "artisan"],
    delivery_days: ["Wednesday", "Saturday"],
    cutoff_time: "15:00",
    min_order_value: 6000,
    delivery_fee: 695,
    status: "approved" as const,
  },
  {
    name: "Pennine Pastures",
    slug: "pennine-pastures",
    short_description: "Hill-farmed Swaledale lamb and Shorthorn beef from the Yorkshire Dales.",
    story: `For six generations, our family has farmed the high pastures of the Yorkshire Dales. Our Swaledale sheep are a hardy native breed, perfectly adapted to life on the hills.\n\nThe Pennine winds and mineral-rich grasses give our meat a distinctive, complex flavour you won't find anywhere else.`,
    hero_image_url: "https://images.unsplash.com/photo-1484557985045-edf25e08da73?w=1200&h=600&fit=crop&q=80",
    postcode: "DL8 3LJ",
    postcode_rules: ["DL", "BD", "HG", "LA"],
    badges: ["hill-reared", "native-breeds", "family-run"],
    delivery_days: ["Tuesday", "Friday"],
    cutoff_time: "12:00",
    min_order_value: 3500,
    delivery_fee: 595,
    status: "approved" as const,
  },
  {
    name: "Fenland Free Range",
    slug: "fenland-free-range",
    short_description: "Slow-grown chickens, ducks and geese from the Cambridgeshire fens.",
    story: `The flat, fertile fens of Cambridgeshire have been home to poultry farming for centuries. We continue that tradition with our flocks of slow-grown birds.\n\nOur chickens live twice as long as commercial birds, developing rich flavour and firm texture.`,
    hero_image_url: "https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=1200&h=600&fit=crop&q=80",
    postcode: "PE15 0QS",
    postcode_rules: ["PE", "CB", "IP", "NR"],
    badges: ["free-range", "slow-grown", "ethical"],
    delivery_days: ["Thursday", "Saturday"],
    cutoff_time: "14:00",
    min_order_value: 2000,
    delivery_fee: 395,
    status: "approved" as const,
  },
  {
    name: "Dartmoor Wild Meats",
    slug: "dartmoor-wild-meats",
    short_description: "Wild venison and game from the ancient forests and moors of Dartmoor.",
    story: `Dartmoor's ancient landscape provides the perfect habitat for wild deer and game birds. We work with skilled stalkers and beaters to sustainably harvest the finest wild meat.\n\nEvery animal is wild, free-ranging, and shot humanely by licensed professionals.`,
    hero_image_url: "https://images.unsplash.com/photo-1504472478235-9bc48ba4d60f?w=1200&h=600&fit=crop&q=80",
    postcode: "TQ13 8EJ",
    postcode_rules: ["TQ", "EX", "PL"],
    badges: ["wild", "sustainable", "traceable"],
    delivery_days: ["Monday", "Wednesday"],
    cutoff_time: "10:00",
    min_order_value: 4000,
    delivery_fee: 695,
    status: "approved" as const,
  },
  {
    name: "Suffolk Blacks",
    slug: "suffolk-blacks",
    short_description: "Heritage Large Black pigs raised in the woods of rural Suffolk.",
    story: `The Large Black is Britain's rarest native pig breed, and we're proud to be helping preserve this magnificent animal.\n\nOur pigs live in the ancient woodlands of Suffolk, foraging for acorns, roots, and fallen fruit just as pigs have for millennia.`,
    hero_image_url: "https://images.unsplash.com/photo-1605652515693-49a0cd2b8e4b?w=1200&h=600&fit=crop&q=80",
    postcode: "IP29 4BT",
    postcode_rules: ["IP", "CO", "CB", "NR"],
    badges: ["rare-breed", "woodland-reared", "heritage-breed"],
    delivery_days: ["Tuesday", "Friday"],
    cutoff_time: "11:00",
    min_order_value: 3000,
    delivery_fee: 495,
    status: "approved" as const,
  },
  {
    name: "Lakeland Lamb",
    slug: "lakeland-lamb",
    short_description: "Herdwick lamb from the high fells of the Lake District.",
    story: `Herdwick sheep have grazed the Lake District fells for over a thousand years. These hardy, intelligent animals are perfectly adapted to the harsh mountain environment.\n\nTheir meat has a unique, intense flavour that reflects the wild herbs and grasses of the fells.`,
    hero_image_url: "https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?w=1200&h=600&fit=crop&q=80",
    postcode: "CA12 5UJ",
    postcode_rules: ["CA", "LA", "TD"],
    badges: ["native-breeds", "hill-reared", "traditional"],
    delivery_days: ["Wednesday"],
    cutoff_time: "09:00",
    min_order_value: 4500,
    delivery_fee: 795,
    status: "approved" as const,
  },
  {
    name: "Cotswold Gold",
    slug: "cotswold-gold",
    short_description: "Golden Guernsey goats and award-winning goat meat from the Cotswolds.",
    story: `We're pioneers in British goat meat production, raising our beautiful Golden Guernsey goats on the rolling Cotswold hills.\n\nGoat meat is lean, sustainable, and delicious - yet barely known in Britain. We're on a mission to change that.`,
    hero_image_url: "https://images.unsplash.com/photo-1524024973431-2ad916746881?w=1200&h=600&fit=crop&q=80",
    postcode: "GL54 3BN",
    postcode_rules: ["GL", "OX", "WR", "CV"],
    badges: ["sustainable", "award-winning", "artisan"],
    delivery_days: ["Thursday", "Saturday"],
    cutoff_time: "13:00",
    min_order_value: 3500,
    delivery_fee: 550,
    status: "approved" as const,
  },
  {
    name: "Border Beef Co",
    slug: "border-beef-co",
    short_description: "Premium Aberdeen Angus beef from the Scottish-English border country.",
    story: `The rolling hills of the Borders have been cattle country for centuries. Our Aberdeen Angus herd grazes the same pastures their ancestors did hundreds of years ago.\n\nWe hang our beef for a minimum of 28 days, developing the deep, complex flavours our customers love.`,
    hero_image_url: "https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=1200&h=600&fit=crop&q=80",
    postcode: "TD9 0TA",
    postcode_rules: ["TD", "EH", "ML", "DG"],
    badges: ["dry-aged", "grass-fed", "traditional"],
    delivery_days: ["Tuesday", "Friday"],
    cutoff_time: "14:00",
    min_order_value: 4000,
    delivery_fee: 650,
    status: "approved" as const,
  },
  {
    name: "Welsh Mountain Meats",
    slug: "welsh-mountain-meats",
    short_description: "Mountain lamb and Welsh Black beef from the heart of Snowdonia.",
    story: `High in the mountains of Snowdonia, our animals live as they have for centuries - free on the open hillsides, breathing clean mountain air.\n\nThe Welsh Black cattle and Welsh Mountain sheep are native breeds, perfectly suited to this dramatic landscape.`,
    hero_image_url: "https://images.unsplash.com/photo-1506459225024-1428097a7e18?w=1200&h=600&fit=crop&q=80",
    postcode: "LL55 4SU",
    postcode_rules: ["LL", "SY", "SA"],
    badges: ["native-breeds", "mountain-raised", "welsh"],
    delivery_days: ["Monday", "Thursday"],
    cutoff_time: "10:00",
    min_order_value: 3500,
    delivery_fee: 595,
    status: "approved" as const,
  },
  {
    name: "Coastal Croft",
    slug: "coastal-croft",
    short_description: "Seaweed-fed lamb and beef from our clifftop croft in Cornwall.",
    story: `Our small croft clings to the dramatic north Cornwall coast, where Atlantic winds sweep across the pastures and our animals supplement their grazing with nutrient-rich seaweed.\n\nThis coastal diet gives our meat a subtle mineral quality that's truly unique.`,
    hero_image_url: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=1200&h=600&fit=crop&q=80",
    postcode: "PL34 0HB",
    postcode_rules: ["PL", "TR", "EX"],
    badges: ["small-batch", "sustainable", "artisan"],
    delivery_days: ["Wednesday", "Saturday"],
    cutoff_time: "12:00",
    min_order_value: 4000,
    delivery_fee: 695,
    status: "approved" as const,
  },
  {
    name: "Chiltern Charcuterie",
    slug: "chiltern-charcuterie",
    short_description: "British-cured meats and bacon from rare breed pigs in the Chiltern Hills.",
    story: `We're bringing the art of charcuterie back to Britain, using traditional methods and rare breed pigs raised on our Chiltern Hills farm.\n\nOur bacon, ham, and salami are cured slowly without nitrates, developing complex flavours over weeks and months.`,
    hero_image_url: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=1200&h=600&fit=crop&q=80",
    postcode: "HP23 6LY",
    postcode_rules: ["HP", "LU", "MK", "SG"],
    badges: ["artisan", "rare-breed", "traditional"],
    delivery_days: ["Tuesday", "Friday"],
    cutoff_time: "11:00",
    min_order_value: 2500,
    delivery_fee: 450,
    status: "approved" as const,
  },
  {
    name: "Peak District Pastures",
    slug: "peak-district-pastures",
    short_description: "Grass-fed beef and lamb from the limestone dales of Derbyshire.",
    story: `The White Peak's limestone grasslands produce some of the finest grazing in England. Our cattle and sheep thrive on these mineral-rich pastures, producing meat with exceptional flavour.\n\nWe farm in harmony with the landscape, maintaining the ancient field patterns and wildflower meadows.`,
    hero_image_url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&h=600&fit=crop&q=80",
    postcode: "SK17 8SU",
    postcode_rules: ["SK", "DE", "S", "NG"],
    badges: ["grass-fed", "welfare-certified", "sustainable"],
    delivery_days: ["Wednesday", "Saturday"],
    cutoff_time: "15:00",
    min_order_value: 3500,
    delivery_fee: 550,
    status: "approved" as const,
  },
  {
    name: "Essex Farm Butchers",
    slug: "essex-farm-butchers",
    short_description: "Traditional butchery and farm-reared meats from the Essex countryside.",
    story: `Essex Farm Butchers has served the local community for over 40 years. We rear our own cattle and pigs on the farm, and source lamb from trusted neighbours.\n\nOur shop combines old-fashioned butchery skills with modern food safety standards.`,
    hero_image_url: "https://images.unsplash.com/photo-1588347818036-558601350947?w=1200&h=600&fit=crop&q=80",
    postcode: "CM6 1QH",
    postcode_rules: ["CM", "SS", "RM", "IG", "E"],
    badges: ["local-sourced", "family-run", "traditional"],
    delivery_days: ["Tuesday", "Thursday", "Saturday"],
    cutoff_time: "16:00",
    min_order_value: 2000,
    delivery_fee: 395,
    status: "approved" as const,
  },
  {
    name: "New Forest Naturals",
    slug: "new-forest-naturals",
    short_description: "Free-roaming pork and venison from the ancient New Forest.",
    story: `The New Forest is one of the last places in Britain where pigs still have the ancient right to roam free during pannage season, foraging for acorns and beechmast.\n\nOur pigs and deer live as wild as any farm animals can be, producing meat with unrivalled depth of flavour.`,
    hero_image_url: "https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=1200&h=600&fit=crop&q=80",
    postcode: "SO43 7GN",
    postcode_rules: ["SO", "BH", "SP", "PO"],
    badges: ["free-range", "woodland-reared", "ethical"],
    delivery_days: ["Monday", "Thursday"],
    cutoff_time: "12:00",
    min_order_value: 3500,
    delivery_fee: 550,
    status: "approved" as const,
  },
];

// =============================================================================
// PRODUCT TEMPLATES (12 products per farm)
// =============================================================================

const baseProducts = [
  { name: "Ribeye Steak", description: "Beautifully marbled with rich beefy flavour. Perfect for pan-frying or grilling.", price: 2495, unit_label: "per steak", weight_label: "300g", stock_qty: 24 },
  { name: "Sirloin Steak", description: "Classic cut with the perfect balance of lean meat and flavourful fat cap.", price: 2195, unit_label: "per steak", weight_label: "280g", stock_qty: 30 },
  { name: "Fillet Steak", description: "The most tender cut, melt-in-your-mouth texture. Ideal for special occasions.", price: 3295, unit_label: "per steak", weight_label: "200g", stock_qty: 12 },
  { name: "Beef Mince", description: "Freshly ground from prime cuts, perfect for burgers, bolognese, or meatballs.", price: 895, unit_label: "per pack", weight_label: "500g", stock_qty: 40 },
  { name: "Beef Brisket", description: "Perfect for slow cooking. Becomes incredibly tender with rich, deep flavour.", price: 1495, unit_label: "per piece", weight_label: "1.2kg", stock_qty: 8 },
  { name: "Lamb Leg", description: "Bone-in leg, perfect for Sunday roast. Feeds 6-8 people with leftovers.", price: 3295, unit_label: "per leg", weight_label: "2kg", stock_qty: 10 },
  { name: "Lamb Chops", description: "Succulent chops, great on the barbecue or under the grill.", price: 1695, unit_label: "pack of 4", weight_label: "400g", stock_qty: 20 },
  { name: "Pork Belly", description: "Fantastic crackling when roasted. Rich, succulent meat beneath.", price: 1295, unit_label: "per piece", weight_label: "1kg", stock_qty: 15 },
  { name: "Pork Chops", description: "Thick-cut, bone-in chops full of flavour. Best served pink.", price: 1095, unit_label: "pack of 2", weight_label: "500g", stock_qty: 25 },
  { name: "Sausages", description: "Traditional recipe sausages made with our own meat and natural casings.", price: 795, unit_label: "pack of 6", weight_label: "400g", stock_qty: 35 },
  { name: "Beef Burgers", description: "Handmade burgers with our signature seasoning blend. Perfect for BBQs.", price: 995, unit_label: "pack of 4", weight_label: "450g", stock_qty: 25 },
  { name: "Roasting Joint", description: "Rolled and tied, ready for the oven. A spectacular centrepiece.", price: 2995, unit_label: "per joint", weight_label: "1.5kg", stock_qty: 8 },
];

// Product image map - high quality meat photos from Unsplash
const productImages: Record<string, string> = {
  "ribeye": "https://images.unsplash.com/photo-1615937722923-67f6deaf2cc9?w=400&h=400&fit=crop&q=80",
  "sirloin": "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400&h=400&fit=crop&q=80",
  "fillet": "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=400&fit=crop&q=80",
  "mince": "https://images.unsplash.com/photo-1602473812169-fc1eda6e1d9c?w=400&h=400&fit=crop&q=80",
  "brisket": "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=400&fit=crop&q=80",
  "lamb leg": "https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=400&h=400&fit=crop&q=80",
  "lamb chops": "https://images.unsplash.com/photo-1624174503860-46d11f3a9fbc?w=400&h=400&fit=crop&q=80",
  "pork belly": "https://images.unsplash.com/photo-1623653387945-2fd25214f8fc?w=400&h=400&fit=crop&q=80",
  "pork chops": "https://images.unsplash.com/photo-1607116667211-4fdc27c7fe57?w=400&h=400&fit=crop&q=80",
  "sausages": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=400&fit=crop&q=80",
  "burgers": "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=400&fit=crop&q=80",
  "roasting": "https://images.unsplash.com/photo-1544025162-d76694bfecd0?w=400&h=400&fit=crop&q=80",
  "default": "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=400&fit=crop&q=80",
};

function getProductImage(productName: string): string {
  const lowerName = productName.toLowerCase();
  for (const [key, url] of Object.entries(productImages)) {
    if (key !== "default" && lowerName.includes(key)) {
      return url;
    }
  }
  return productImages.default;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Ensure a profile exists for the system user
 * This is critical because farms.owner_user_id references profiles(id)
 */
async function ensureProfileExists(userId: string): Promise<void> {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (!existingProfile) {
    console.log("   Creating profile for system user...");
    const { error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        role: "farm",
        name: "System Seed User",
      });
    
    if (error && !error.message.includes("duplicate")) {
      console.error("   ⚠️  Could not create profile:", error.message);
    } else {
      console.log("   ✅ Profile created");
    }
  }
}

/**
 * Get or create a system user for farm ownership
 */
async function getOrCreateSystemUser(): Promise<string> {
  const systemEmail = "system@farmdirect.local";
  
  // Try to find existing user
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error("❌ Error listing users:", listError.message);
    throw listError;
  }
  
  const existingUser = existingUsers?.users.find((u) => u.email === systemEmail);
  
  if (existingUser) {
    console.log("   Using existing system user:", existingUser.id);
    await ensureProfileExists(existingUser.id);
    return existingUser.id;
  }
  
  // Create new user
  const { data: authData, error: createError } = await supabase.auth.admin.createUser({
    email: systemEmail,
    password: "system-seed-password-not-for-login-" + Date.now(),
    email_confirm: true,
    user_metadata: {
      name: "System Seed User",
      role: "farm",
    },
  });
  
  if (createError) {
    console.error("❌ Error creating system user:", createError.message);
    throw createError;
  }
  
  console.log("   Created new system user:", authData.user.id);
  
  // The trigger should create the profile, but let's ensure it exists
  await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for trigger
  await ensureProfileExists(authData.user.id);
  
  return authData.user.id;
}

/**
 * Upsert a farm by slug
 */
async function upsertFarm(farm: typeof farms[0], ownerUserId: string): Promise<string | null> {
  // Check if farm exists
  const { data: existing } = await supabase
    .from("farms")
    .select("id")
    .eq("slug", farm.slug)
    .single();
  
  const farmData = {
    ...farm,
    owner_user_id: ownerUserId,
    logo_url: null,
    address: `${farm.name}, ${farm.postcode}`,
  };
  
  if (existing) {
    // Update existing farm
    const { error } = await supabase
      .from("farms")
      .update(farmData)
      .eq("slug", farm.slug);
    
    if (error) {
      console.error(`   ❌ Error updating ${farm.name}:`, error.message);
      return null;
    }
    
    stats.farmsUpdated++;
    return existing.id;
  } else {
    // Insert new farm
    const { data, error } = await supabase
      .from("farms")
      .insert(farmData)
      .select("id")
      .single();
    
    if (error) {
      console.error(`   ❌ Error inserting ${farm.name}:`, error.message);
      return null;
    }
    
    stats.farmsInserted++;
    return data.id;
  }
}

/**
 * Upsert a product by (farm_id, name)
 */
async function upsertProduct(
  farmId: string,
  product: typeof baseProducts[0],
  sortOrder: number
): Promise<void> {
  const productData = {
    farm_id: farmId,
    name: product.name,
    description: product.description,
    price: product.price,
    unit_label: product.unit_label,
    weight_label: product.weight_label,
    stock_qty: product.stock_qty,
    image_url: getProductImage(product.name),
    is_active: true,
    sort_order: sortOrder,
  };
  
  // Check if product exists
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("farm_id", farmId)
    .eq("name", product.name)
    .single();
  
  if (existing) {
    // Update existing product
    const { error } = await supabase
      .from("products")
      .update(productData)
      .eq("id", existing.id);
    
    if (error) {
      console.error(`      ❌ Error updating product ${product.name}:`, error.message);
      return;
    }
    
    stats.productsUpdated++;
  } else {
    // Insert new product
    const { error } = await supabase
      .from("products")
      .insert(productData);
    
    if (error) {
      console.error(`      ❌ Error inserting product ${product.name}:`, error.message);
      return;
    }
    
    stats.productsInserted++;
  }
  
  stats.totalProductsProcessed++;
}

/**
 * Get database counts for verification
 */
async function getDatabaseCounts() {
  const { count: farmsCount } = await supabase
    .from("farms")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");
  
  const { count: productsCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  
  return { farmsCount: farmsCount || 0, productsCount: productsCount || 0 };
}

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function seed() {
  console.log("\n🌱 FairFarm Database Seed\n");
  console.log("=".repeat(60));
  console.log(`   Target: ${farms.length} farms × ${baseProducts.length} products = ${farms.length * baseProducts.length} products`);
  console.log("=".repeat(60));
  
  try {
    // Step 1: Get or create system user
    console.log("\n👤 Setting up system user...");
    const systemUserId = await getOrCreateSystemUser();
    
    // Step 2: Upsert farms and products
    console.log("\n🏠 Upserting farms and products...\n");
    
    for (const farm of farms) {
      process.stdout.write(`   ${farm.name}... `);
      const farmId = await upsertFarm(farm, systemUserId);
      
      if (farmId) {
        for (let i = 0; i < baseProducts.length; i++) {
          await upsertProduct(farmId, baseProducts[i], i);
        }
        console.log("✅");
      } else {
        console.log("❌ (skipped products)");
      }
    }
    
    // Step 3: Verify database state
    console.log("\n📊 Verifying database...");
    const { farmsCount, productsCount } = await getDatabaseCounts();
    
    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("\n✅ Seed completed successfully!\n");
    console.log("Changes this run:");
    console.log(`   Farms inserted:    ${stats.farmsInserted}`);
    console.log(`   Farms updated:     ${stats.farmsUpdated}`);
    console.log(`   Products inserted: ${stats.productsInserted}`);
    console.log(`   Products updated:  ${stats.productsUpdated}`);
    console.log("\nDatabase totals:");
    console.log(`   Approved farms:    ${farmsCount}`);
    console.log(`   Active products:   ${productsCount}`);
    
    if (farmsCount === 0) {
      console.log("\n⚠️  WARNING: No approved farms in database!");
      console.log("   Check that migrations have been applied.");
    }
    
    console.log("\n🚀 Next steps:");
    console.log("   1. Run: pnpm db:sanity (verify data)");
    console.log("   2. Run: pnpm dev");
    console.log("   3. Visit: http://localhost:3000\n");
    
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  }
}

// Run
seed();
