import { RequestHandler } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../db/mongodb";
import { ApiResponse } from "@shared/types";

interface MiniSubcategoryData {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

interface SubcategoryData {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  miniSubcategories?: MiniSubcategoryData[];
}

interface CategoryData {
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  type?: string;
  subcategories?: SubcategoryData[];
}

const seedCategories: CategoryData[] = [
  {
    name: "Buy",
    slug: "buy",
    icon: "🏠",
    description: "Buy residential and commercial properties",
    type: "buy",
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
      {
        name: "Agricultural",
        slug: "agricultural",
        description: "Agricultural lands and farming properties for purchase",
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
  {
    name: "Rent",
    slug: "rent",
    icon: "🏘️",
    description: "Rent residential and commercial properties",
    type: "rent",
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
      {
        name: "Agricultural",
        slug: "agricultural",
        description: "Agricultural lands and farming properties for rent",
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
  {
    name: "Commercial",
    slug: "commercial",
    icon: "🏢",
    description: "Commercial spaces and offices",
    type: "commercial",
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
    type: "agricultural",
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

export const initializeCategoriesWithMinis: RequestHandler = async (
  req,
  res,
) => {
  try {
    const db = getDatabase();
    const { force = false } = req.body;

    // Check if categories already exist
    const existingCategories = await db
      .collection("categories")
      .countDocuments();
    if (existingCategories > 0 && !force) {
      return res.json({
        success: true,
        message: "Categories already initialized",
        data: {
          categoriesCount: existingCategories,
          skipped: true,
        },
      });
    }

    // Clear existing data if force = true
    if (force) {
      await db.collection("categories").deleteMany({});
      await db.collection("subcategories").deleteMany({});
      await db.collection("mini_subcategories").deleteMany({});
    }

    let categoryCount = 0;
    let subcategoryCount = 0;
    let miniSubcategoryCount = 0;

    for (let catIdx = 0; catIdx < seedCategories.length; catIdx++) {
      const catData = seedCategories[catIdx];

      // Create category
      const categoryId = new ObjectId();
      const category = {
        _id: categoryId,
        name: catData.name,
        slug: catData.slug,
        icon: catData.icon || "",
        iconUrl: "",
        description: catData.description || "",
        type: catData.type || catData.slug,
        sortOrder: catIdx,
        order: catIdx,
        active: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection("categories").insertOne(category);
      categoryCount++;

      // Create subcategories and mini-subcategories
      if (catData.subcategories && Array.isArray(catData.subcategories)) {
        for (let subIdx = 0; subIdx < catData.subcategories.length; subIdx++) {
          const subData = catData.subcategories[subIdx];
          const subcategoryId = new ObjectId();
          const subcategory = {
            _id: subcategoryId,
            categoryId: categoryId.toString(),
            name: subData.name,
            slug: subData.slug,
            icon: subData.icon || "",
            iconUrl: "",
            description: subData.description || "",
            sortOrder: subIdx,
            active: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await db.collection("subcategories").insertOne(subcategory);
          subcategoryCount++;

          // Create mini-subcategories
          if (
            subData.miniSubcategories &&
            Array.isArray(subData.miniSubcategories)
          ) {
            for (
              let miniIdx = 0;
              miniIdx < subData.miniSubcategories.length;
              miniIdx++
            ) {
              const miniData = subData.miniSubcategories[miniIdx];
              const miniSubcategory = {
                _id: new ObjectId(),
                subcategoryId: subcategoryId.toString(),
                name: miniData.name,
                slug: miniData.slug,
                icon: miniData.icon || "",
                iconUrl: "",
                description: miniData.description || "",
                sortOrder: miniIdx,
                active: true,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              await db
                .collection("mini_subcategories")
                .insertOne(miniSubcategory);
              miniSubcategoryCount++;
            }
          }
        }
      }
    }

    const response: ApiResponse<{
      categoriesCount: number;
      subcategoriesCount: number;
      miniSubcategoriesCount: number;
    }> = {
      success: true,
      data: {
        categoriesCount: categoryCount,
        subcategoriesCount: subcategoryCount,
        miniSubcategoriesCount: miniSubcategoryCount,
      },
      message: `Successfully initialized 3-level category structure: ${categoryCount} categories, ${subcategoryCount} subcategories, ${miniSubcategoryCount} mini-subcategories`,
    };

    res.json(response);
  } catch (error) {
    console.error("Error initializing categories:", error);
    res.status(500).json({
      success: false,
      error: "Failed to initialize 3-level category structure",
    });
  }
};
