import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://Aashishpropeorty:SACHIN123@property.zn2cowc.mongodb.net/?retryWrites=true&w=majority&appName=Property";
const DB_NAME = process.env.DB_NAME || "aashish_property";

async function verifyMiniSubcategoryFix() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log("🔍 Verifying mini-subcategory fix...\n");

    // 1. Check if mini-subcategories exist
    const miniCount = await db
      .collection("mini_subcategories")
      .countDocuments();
    console.log(`✅ Mini-subcategories in DB: ${miniCount}`);

    // 2. Check properties with miniSubcategoryId
    const propertiesWithMini = await db
      .collection("properties")
      .countDocuments({ miniSubcategoryId: { $exists: true } });
    console.log(
      `✅ Properties with miniSubcategoryId: ${propertiesWithMini}\n`,
    );

    // 3. Show sample properties with miniSubcategoryId
    const sampleProperties = await db
      .collection("properties")
      .find({ miniSubcategoryId: { $exists: true } })
      .limit(3)
      .toArray();

    if (sampleProperties.length > 0) {
      console.log("📋 Sample properties with miniSubcategoryId:");
      sampleProperties.forEach((prop, idx) => {
        console.log(`  ${idx + 1}. Title: ${prop.title}`);
        console.log(`     Category: ${prop.propertyType}`);
        console.log(`     Subcategory: ${prop.subCategory}`);
        console.log(`     MiniSubcategoryId: ${prop.miniSubcategoryId}`);
        console.log(
          `     Status: ${prop.status} (${prop.approvalStatus || "no approval status"})\n`,
        );
      });
    } else {
      console.log(
        "ℹ️  No properties with miniSubcategoryId found yet.\n" +
          "   This is expected if no properties have been posted with a mini-subcategory yet.\n" +
          "   Try posting a property under Buy → Commercial → Factory to test.\n",
      );
    }

    // 4. Check factory mini-subcategory
    const factoryMini = await db
      .collection("mini_subcategories")
      .findOne({ slug: "factory" });

    if (factoryMini) {
      console.log("✅ Factory mini-subcategory found:");
      console.log(`   ID: ${factoryMini._id}`);
      console.log(`   Name: ${factoryMini.name}`);
      console.log(`   Slug: ${factoryMini.slug}`);
      console.log(`   Parent Subcategory ID: ${factoryMini.subcategoryId}\n`);

      // Check if any properties have this mini-category
      const factoryProperties = await db
        .collection("properties")
        .countDocuments({ miniSubcategoryId: factoryMini._id.toString() });

      if (factoryProperties > 0) {
        console.log(
          `✅ Found ${factoryProperties} properties in Factory category!`,
        );
        const firstProperty = await db
          .collection("properties")
          .findOne({ miniSubcategoryId: factoryMini._id.toString() });

        if (firstProperty) {
          console.log(`   Example: ${firstProperty.title}`);
          console.log(`   Status: ${firstProperty.status}`);
        }
      } else {
        console.log(
          "ℹ️  No properties posted in Factory category yet.\n" +
            "   Try posting a property under Buy → Commercial → Factory to test.\n",
        );
      }
    } else {
      console.log(
        "⚠️  Factory mini-subcategory not found in database.\n" +
          "   Make sure to create mini-categories for Commercial and Agricultural.\n",
      );
    }

    console.log("\n✅ Verification complete!");
  } catch (error) {
    console.error("❌ Error verifying fix:", error);
  } finally {
    await client.close();
  }
}

verifyMiniSubcategoryFix();
