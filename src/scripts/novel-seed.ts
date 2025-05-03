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