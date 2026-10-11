// Street name suggestions (docs/street-addressing.md section 3): a curated STARTER pool of trees, fruits, flowers and
// birds, and a seeded picker that offers three words not already used nearby. Pure and client-safe so the tiles work
// offline. The list still needs review by local readers (party symbols, slang, first names) before launch.
import { clashesWith } from "./streetNames.js";

const entries = (group, tier, text) =>
  text.split(" · ").map((pair) => {
    const [fr, en] = pair.split(" / ");
    return { id: fr.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, ""), fr, en, group, tier };
  });

export const NOUNS = [
  ...entries("fruit", 1, "Manguier / Mango · Safoutier / Safou · Goyavier / Guava · Avocatier / Avocado · Papayer / Pawpaw · Citronnier / Lemon · Cocotier / Coconut · Bananier / Banana · Palmier / Palm · Figuier / Fig · Tamarinier / Tamarind · Cacaoyer / Cocoa · Karité / Shea · Ananas / Pineapple · Corossol / Soursop · Pastèque / Watermelon · Melon / Melon · Cerise / Cherry · Fraise / Strawberry · Raisin / Grape · Pomme / Apple · Arachide / Groundnut · Manioc / Cassava · Plantain / Plantain · Macabo / Cocoyam · Maïs / Corn · Piment / Pepper · Vanille / Vanilla · Cannelle / Cinnamon · Sésame / Sesame · Miel / Honey · Citrouille / Pumpkin · Tomate / Tomato · Haricot / Bean · Gingembre / Ginger"),
  ...entries("tree", 1, "Baobab / Baobab · Acajou / Mahogany · Kapokier / Kapok · Flamboyant / Flame Tree · Acacia / Acacia · Bambou / Bamboo · Raphia / Raffia · Jacaranda / Jacaranda · Mimosa / Mimosa · Magnolia / Magnolia · Tournesol / Sunflower · Hibiscus / Hibiscus · Lotus / Lotus · Lavande / Lavender · Lilas / Lilac · Camélia / Camellia · Iris / Iris · Tulipe / Tulip · Azalée / Azalea · Gardénia / Gardenia · Orchidée / Orchid · Jasmin / Jasmine · Pétale / Petal"),
  ...entries("bird", 1, "Colibri / Hummingbird · Calao / Hornbill · Touraco / Turaco · Tisserin / Weaver · Perroquet / Parrot · Héron / Heron · Aigrette / Egret · Aigle / Eagle · Faucon / Falcon · Pélican / Pelican · Canari / Canary · Moineau / Sparrow · Hirondelle / Swallow · Merle / Blackbird · Rossignol / Nightingale · Perdrix / Partridge · Caille / Quail · Toucan / Toucan · Cigogne / Stork · Pinson / Finch"),
  ...entries("animal", 2, "Papillon / Butterfly · Abeille / Honeybee · Libellule / Dragonfly · Coccinelle / Ladybird · Gazelle / Gazelle · Antilope / Antelope · Girafe / Giraffe · Zèbre / Zebra · Tortue / Tortoise · Hérisson / Hedgehog · Cheval / Horse · Hippocampe / Seahorse · Grillon / Cricket · Cigale / Cicada · Lamantin / Manatee"),
  ...entries("object", 2, "Calebasse / Calabash · Panier / Basket · Tambour / Drum · Balafon / Balafon · Natte / Mat · Lanterne / Lantern · Bougie / Candle · Boussole / Compass · Plume / Feather · Miroir / Mirror · Ballon / Ball · Pirogue / Canoe · Hamac / Hammock · Pilon / Pestle · Sifflet / Whistle · Guitare / Guitar · Flûte / Flute · Horloge / Clock · Ruche / Beehive · Verger / Orchard · Jardin / Garden · Vélo / Bicycle · Crayon / Pencil · Chapeau / Hat · Parapluie / Umbrella · Échelle / Ladder · Brouette / Wheelbarrow"),
  ...entries("sky", 2, "Soleil / Sun · Lune / Moon · Étoile / Star · Nuage / Cloud · Comète / Comet · Planète / Planet · Horizon / Horizon · Brise / Breeze"),
  ...entries("stone", 2, "Perle / Pearl · Corail / Coral · Cristal / Crystal · Saphir / Sapphire · Émeraude / Emerald · Rubis / Ruby · Opale / Opal · Topaze / Topaz · Turquoise / Turquoise · Quartz / Quartz"),
];

const TILE_GROUPS = ["fruit", "tree", "bird"];

// Small seeded generator (mulberry32): the same seed and page always give the same set.
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list, rand) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Three words, one per tile group (fruit tree, big tree or flower, bird), none used or sounding like a used name.
// `used` are the street names already around (any language). `page` asks for "other ideas".
// A group with nothing left borrows from the second tier.
/** @param {{ used?: string[], lang?: 'fr' | 'en', seed?: number, page?: number, count?: number }} [options] */
export function suggestNames({ used = [], lang = "fr", seed = 1, page = 0, count = 3 } = {}) {
  const rand = random(seed * 7919 + page * 104729);
  const free = (noun) => !clashesWith(noun[lang], used);
  const taken = new Set();
  const picks = [];
  const take = (group, tier) => {
    const pool = shuffled(NOUNS.filter((n) => n.group === group && n.tier === tier && !taken.has(n.id) && free(n)), rand);
    if (pool.length === 0) return false;
    taken.add(pool[0].id);
    picks.push(pool[0]);
    return true;
  };
  for (const group of TILE_GROUPS.slice(0, count)) take(group, 1);
  const spare = ["animal", "object", "sky", "stone"];
  while (picks.length < count) {
    if (!spare.some((group) => take(group, 2))) break;
  }
  return picks.map((n) => ({ id: n.id, name: n[lang], twin: n[lang === "fr" ? "en" : "fr"], group: n.group }));
}
