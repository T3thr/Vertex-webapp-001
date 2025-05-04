import { Types } from "mongoose";
import dbConnect from "@/backend/lib/mongodb";
import getNovelModel from "@/backend/models/Novel";
import { INovel } from "@/backend/models/Novel";

// Sample novel data
const sampleNovels: Omit<INovel, "_id" | "createdAt" | "updatedAt">[] = [
  {
    title: "The Shadow of Eternity",
    description:
      "In a world where time bends at the will of ancient sorcerers, a young apprentice discovers a forbidden spell that could unravel the fabric of reality.",
    coverImage: "https://example.com/images/shadow-eternity.jpg",
    tags: ["Fantasy", "Adventure", "Magic"],
    status: "Published",
    config: { theme: "dark", engineLogic: "progressive" },
    episodes: [],
    author: new Types.ObjectId("507f1f77bcf86cd799439011"), // Placeholder ObjectId
  },
  {
    title: "Neon Dreams",
    description:
      "A cyberpunk thriller following a rogue AI programmer navigating a dystopian city to uncover a conspiracy threatening humanity's freedom.",
    coverImage: "https://example.com/images/neon-dreams.jpg",
    tags: ["Sci-Fi", "Cyberpunk", "Thriller"],
    status: "Draft",
    config: { theme: "futuristic" },
    episodes: [new Types.ObjectId()],
    author: new Types.ObjectId("507f1f77bcf86cd799439011"),
  },
  {
    title: "Whispers of the Forest",
    description:
      "A young girl discovers she can communicate with ancient spirits in a mystical forest, but her gift comes with a dangerous price.",
    coverImage: "https://example.com/images/whispers-forest.jpg",
    tags: ["Fantasy", "Mystery", "Supernatural"],
    status: "Published",
    config: { theme: "nature" },
    episodes: [],
    author: new Types.ObjectId("507f1f77bcf86cd799439011"),
  },
  {
    title: "Starborn Legacy",
    description:
      "An interstellar war forces a reluctant hero to wield a cosmic artifact that could either save or destroy the galaxy.",
    coverImage: "https://example.com/images/starborn-legacy.jpg",
    tags: ["Sci-Fi", "Space Opera", "Action"],
    status: "Archived",
    config: { engineLogic: "episodic" },
    episodes: [new Types.ObjectId(), new Types.ObjectId()],
    author: new Types.ObjectId("507f1f77bcf86cd799439011"),
  },
  {
    title: "Crimson Skies",
    description:
      "In a world ruled by airships and floating kingdoms, a disgraced pilot seeks redemption by uncovering a skybound conspiracy.",
    coverImage: "https://example.com/images/crimson-skies.jpg",
    tags: ["Steampunk", "Adventure", "Redemption"],
    status: "Published",
    config: { theme: "steampunk", engineLogic: "chaptered" },
    episodes: [],
    author: new Types.ObjectId("507f1f77bcf86cd799439011"),
  },

  // 🎉 Novel เพิ่มใหม่ 2
  {
    title: "Echoes of the Deep",
    description:
      "Beneath the ocean’s surface lies a hidden civilization guarding secrets that could reshape the world — until a deep-sea diver stumbles upon them.",
    coverImage: "https://example.com/images/echoes-deep.jpg",
    tags: ["Mystery", "Ocean", "Sci-Fi"],
    status: "Draft",
    config: { theme: "aqua", engineLogic: "progressive" },
    episodes: [new Types.ObjectId()],
    author: new Types.ObjectId("507f1f77bcf86cd799439011"),
  },
  {
    title: "Moonlight Requiem",
    description:
      "A cursed violinist roams the cities under moonlight, playing melodies that summon memories of lost souls — and sometimes something darker.",
    coverImage: "https://example.com/images/moonlight-requiem.jpg",
    tags: ["Fantasy", "Horror", "Music"],
    status: "Published",
    config: { theme: "dark", engineLogic: "episodic" },
    episodes: [],
    author: new Types.ObjectId("507f1f77bcf86cd799439011"),
  },

  // 🎉 Novel เพิ่มใหม่ 4
  {
    title: "Digital Prophet",
    description:
      "In a future where algorithms predict every move, a rogue mathematician writes a formula that can defy fate itself.",
    coverImage: "https://example.com/images/digital-prophet.jpg",
    tags: ["Sci-Fi", "Techno-thriller", "Philosophy"],
    status: "Draft",
    config: { theme: "neon", engineLogic: "progressive" },
    episodes: [],
    author: new Types.ObjectId("507f1f77bcf86cd799439011"),
  },

  // 🎉 Novel เพิ่มใหม่ 5
  {
    title: "Ashes of the Phoenix",
    description:
      "After the fall of a great empire, a lone warrior rises from the ashes to ignite a rebellion — guided by visions of a flaming bird.",
    coverImage: "https://example.com/images/ashes-phoenix.jpg",
    tags: ["Action", "Myth", "Rebellion"],
    status: "Published",
    config: { theme: "fire", engineLogic: "chaptered" },
    episodes: [new Types.ObjectId()],
    author: new Types.ObjectId("507f1f77bcf86cd799439011"),
  },

  // 🎉 Novel เพิ่มใหม่ 6
  {
    title: "The Librarian's Code",
    description:
      "Hidden within an ancient library lies a code that connects every story ever written — and a librarian sworn to protect it.",
    coverImage: "https://example.com/images/librarians-code.jpg",
    tags: ["Mystery", "Fantasy", "Library"],
    status: "Draft",
    config: { theme: "classic", engineLogic: "episodic" },
    episodes: [],
    author: new Types.ObjectId("507f1f77bcf86cd799439011"),
  },
  // 🎉 Novel เพิ่มใหม่ 7
  {
    title: "Echoes of the Deep",
    description:
      "Beneath the ocean’s surface lies an ancient city whose siren songs call to a deep-sea diver haunted by his past.",
    coverImage: "https://example.com/images/echoes-deep.jpg",
    tags: ["Mystery", "Horror", "Underwater"],
    status: "Published",
    config: { theme: "aqua", engineLogic: "episodic" },
    episodes: [],
    author: new Types.ObjectId("507f1f77bcf86cd799439011"),
  },

  // 🎉 Novel เพิ่มใหม่ 8
  {
    title: "Chrono Alchemist",
    description:
      "An alchemist discovers how to manipulate time itself, but every change in the past demands a sacrifice in the present.",
    coverImage: "https://example.com/images/chrono-alchemist.jpg",
    tags: ["Fantasy", "Time Travel", "Alchemy"],
    status: "Draft",
    config: { theme: "steampunk", engineLogic: "progressive" },
    episodes: [new Types.ObjectId()],
    author: new Types.ObjectId("507f1f77bcf86cd799439011"),
  },

  // 🎉 Novel เพิ่มใหม่ 9
  {
    title: "Silent Frequency",
    description:
      "A radio engineer intercepts a mysterious broadcast that reveals future disasters — and now must stop them before the world listens.",
    coverImage: "https://example.com/images/silent-frequency.jpg",
    tags: ["Sci-Fi", "Thriller", "Mystery"],
    status: "Published",
    config: { theme: "noir", engineLogic: "episodic" },
    episodes: [],
    author: new Types.ObjectId("507f1f77bcf86cd799439011"),
  },

  // 🎉 Novel เพิ่มใหม่ 10
  {
    title: "Garden of Glass",
    description:
      "In a city where flowers are forbidden, a young botanist creates a secret glasshouse — and discovers life that fights back.",
    coverImage: "https://example.com/images/garden-glass.jpg",
    tags: ["Dystopia", "Nature", "Drama"],
    status: "Archived",
    config: { theme: "greenhouse", engineLogic: "chaptered" },
    episodes: [new Types.ObjectId(), new Types.ObjectId()],
    author: new Types.ObjectId("507f1f77bcf86cd799439011"),
  },
];

/**
 * Seeds the MongoDB database with sample novel data
 */
async function seedNovels() {
  try {
    // Connect to MongoDB
    await dbConnect();
    console.log("✅ Connected to MongoDB");

    // Get the Novel model
    const Novel = getNovelModel();

    // Clear existing novels (optional, comment out if you want to keep existing data)
    await Novel.deleteMany({});
    console.log("🧹 Cleared existing novels");

    // Insert sample novels
    const insertedNovels = await Novel.insertMany(sampleNovels);
    console.log(`🎉 Successfully seeded ${insertedNovels.length} novels`);

    // Display inserted novels
    insertedNovels.forEach((novel, index) => {
      console.log(`📚 Novel ${index + 1}: ${novel.title} (${novel.status})`);
    });

    // Exit with success code
    process.exit(0);
  } catch (error: unknown) {
    console.error("❌ Error seeding novels:", error);
    process.exit(1);
  }
}

// Run the seeding function
seedNovels();