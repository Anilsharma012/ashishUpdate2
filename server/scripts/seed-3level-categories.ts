/**
 * Seed script for 3-level category structure
 * Creates categories, subcategories, and mini-subcategories
 *
 * Run with: npx tsx server/scripts/seed-3level-categories.ts
 */

import { connectToDatabase, getDatabase } from "../db/mongodb";
import { ObjectId } from "mongodb";

interface SeedCategory {
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  subcategories?: Array<{
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    miniSubcategories?: Array<{
      name: string;
      slug: string;
      description?: string;
      icon?: string;
    }>;
  }>;
}

const seedCategories: SeedCategory[] = [
  {
    name: "Buy",
    slug: "buy",
    icon: "🏠",
    description: "Buy residential and commercial properties",
    subcategories: [
      {
        name: "Residential",
        slug: "residential",
        description: "Residential properties for purchase",
        miniSubcategories: [
          {
            name: "1 BHK",
            slug: "1-bhk",
            description: "1 Bedroom, Hall, Kitchen apartments",
          },
          {
            name: "2 BHK",
            slug: "2-bhk",
            description: "2 Bedroom, Hall, Kitchen apartments",
          },
          {
            name: "3 BHK",
            slug: "3-bhk",
            description: "3 Bedroom, Hall, Kitchen apartments",
          },
          {
            name: "4+ BHK",
            slug: "4-plus-bhk",
            description: "4 or more bedroom apartments and homes",
          },
        ],
      },
    ],
  },
  {
    name: "Rent",
    slug: "rent",
    icon: "🏘️",
    description: "Rent residential and commercial properties",
    subcategories: [
      {
        name: "Residential",
        slug: "residential",
        description: "Residential properties for rent",
        miniSubcategories: [
          {
            name: "1 BHK",
            slug: "1-bhk",
            description: "1 Bedroom apartments on rent",
          },
          {
            name: "2 BHK",
            slug: "2-bhk",
            description: "2 Bedroom apartments on rent",
          },
          {
            name: "3+ BHK",
            slug: "3-plus-bhk",
            description: "3 or more bedroom homes on rent",
          },
        ],
      },
    ],
  },
  {
    name: "Commercial",
    slug: "commercial",
    icon: "🏢",
    description: "Commercial spaces and offices",
    subcategories: [
      {
        name: "Commercial Spaces",
        slug: "commercial-spaces",
        description: "Various commercial property types",
        miniSubcategories: [
          {
            name: "Shop",
            slug: "shop",
            description: "Retail shops and storefronts",
          },
          {
            name: "Office Space",
            slug: "office-space",
            description: "Office spaces and suites",
          },
          {
            name: "Showroom",
            slug: "showroom",
            description: "Showrooms and display spaces",
          },
          {
            name: "Warehouse",
            slug: "warehouse",
            description: "Warehouses and storage facilities",
          },
          {
            name: "Factory",
            slug: "factory",
            description: "Industrial factories and units",
          },
          {
            name: "Restaurant Space",
            slug: "restaurant-space",
            description: "Food and beverage spaces",
          },
        ],
      },
    ],
  },
  {
    name: "Agricultural",
    slug: "agricultural",
    icon: "🌾",
    description: "Agricultural lands and farming properties",
    subcategories: [
      {
        name: "Agricultural Land",
        slug: "agricultural-land",
        description: "Agricultural properties and farming lands",
        miniSubcategories: [
          {
            name: "Agricultural Land",
            slug: "agricultural-land",
            description: "Vacant agricultural land for cultivation",
          },
          {
            name: "Farmhouse with Land",
            slug: "farmhouse-with-land",
            description: "Farmhouses with surrounding agricultural land",
          },
          {
            name: "Orchard/Plantation",
            slug: "orchard-plantation",
            description: "Fruit orchards and tree plantations",
          },
          {
            name: "Dairy Farm",
            slug: "dairy-farm",
            description: "Dairy farming properties with facilities",
          },
          {
            name: "Poultry Farm",
            slug: "poultry-farm",
            description: "Poultry farming properties and units",
          },
          {
            name: "Fish/Prawn Farm",
            slug: "fish-prawn-farm",
            description: "Aquaculture and fish farming properties",
          },
          {
            name: "Polyhouse/Greenhouse",
            slug: "polyhouse-greenhouse",
            description: "Protected cultivation structures",
          },
          {
            name: "Pasture/Grazing Land",
            slug: "pasture-grazing-land",
            description: "Land for cattle grazing and pasturing",
          },
        ],
      },
    ],
  },
];

async function seed() {
  try {
    console.log("🌱 Starting 3-level category seed...");
    await connectToDatabase();
    const db = getDatabase();

    // Check if data already exists
    const existingCategories = await db.collection("categories").countDocuments();
    if (existingCategories > 0) {
      console.log("✅ Categories already exist, skipping seed");
      return;
    }

    let categoryCount = 0;
    let subcategoryCount = 0;
    let miniSubcategoryCount = 0;

    for (const catData of seedCategories) {
      // Create category
      const categoryId = new ObjectId();
      const category = {
        _id: categoryId,
        name: catData.name,
        slug: catData.slug,
        icon: catData.icon || "",
        iconUrl: "",
        description: catData.description || "",
        type: catData.slug,
        sortOrder: 0,
        order: categoryCount,
        active: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection("categories").insertOne(category);
      console.log(`✅ Created category: ${category.name}`);
      categoryCount++;

      // Create subcategories and mini-subcategories
      if (catData.subcategories && Array.isArray(catData.subcategories)) {
        for (const subData of catData.subcategories) {
          const subcategoryId = new ObjectId();
          const subcategory = {
            _id: subcategoryId,
            categoryId: categoryId.toString(),
            name: subData.name,
            slug: subData.slug,
            icon: subData.icon || "",
            iconUrl: "",
            description: subData.description || "",
            sortOrder: 0,
            active: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await db.collection("subcategories").insertOne(subcategory);
          console.log(`  ✅ Created subcategory: ${subcategory.name}`);
          subcategoryCount++;

          // Create mini-subcategories
          if (
            subData.miniSubcategories &&
            Array.isArray(subData.miniSubcategories)
          ) {
            for (let i = 0; i < subData.miniSubcategories.length; i++) {
              const miniData = subData.miniSubcategories[i];
              const miniSubcategory = {
                _id: new ObjectId(),
                subcategoryId: subcategoryId.toString(),
                name: miniData.name,
                slug: miniData.slug,
                icon: miniData.icon || "",
                iconUrl: "",
                description: miniData.description || "",
                sortOrder: i,
                active: true,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              await db
                .collection("mini_subcategories")
                .insertOne(miniSubcategory);
              console.log(`    ✅ Created mini-subcategory: ${miniSubcategory.name}`);
              miniSubcategoryCount++;
            }
          }
        }
      }
    }

    console.log("\n📊 Seed Summary:");
    console.log(`   Categories created: ${categoryCount}`);
    console.log(`   Subcategories created: ${subcategoryCount}`);
    console.log(`   Mini-subcategories created: ${miniSubcategoryCount}`);
    console.log("\n✨ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
