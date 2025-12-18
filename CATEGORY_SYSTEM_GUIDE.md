# 3-Level Dynamic Category System Guide

## Overview

This guide explains how to use and manage the 3-level dynamic category system for the real estate portal. The system allows you to organize properties into three hierarchical levels:

1. **Category** (e.g., Buy, Rent, Commercial, Agricultural)
2. **Subcategory** (e.g., Residential, Commercial Spaces)
3. **Mini-subcategory** (e.g., 1 BHK, 2 BHK, Shop, Office Space)

## Data Model

### Collections

#### Categories
- `_id`: MongoDB ObjectId (unique)
- `name`: Category name (e.g., "Commercial")
- `slug`: URL-friendly identifier (e.g., "commercial")
- `icon`: Emoji or icon string
- `iconUrl`: URL to icon image
- `description`: Category description
- `type`: Category type (buy, rent, commercial, agricultural, etc.)
- `sortOrder`: Display order (0-based)
- `active`/`isActive`: Enable/disable the category
- `createdAt`, `updatedAt`: Timestamps

#### Subcategories
- `_id`: MongoDB ObjectId (unique)
- `categoryId`: Reference to parent category (as string ID)
- `name`: Subcategory name (e.g., "Commercial Spaces")
- `slug`: URL-friendly identifier (unique per category)
- `icon`: Emoji or icon string
- `iconUrl`: URL to icon image
- `description`: Subcategory description
- `sortOrder`: Display order
- `active`/`isActive`: Enable/disable the subcategory
- `createdAt`, `updatedAt`: Timestamps

#### Mini-subcategories
- `_id`: MongoDB ObjectId (unique)
- `subcategoryId`: Reference to parent subcategory (as string ID)
- `name`: Mini-subcategory name (e.g., "Shop")
- `slug`: URL-friendly identifier (unique per subcategory)
- `icon`: Emoji or icon string
- `iconUrl`: URL to icon image
- `description`: Mini-subcategory description
- `sortOrder`: Display order
- `active`/`isActive`: Enable/disable the mini-subcategory
- `createdAt`, `updatedAt`: Timestamps

#### Properties (Updated)
Properties now support the new 3-level system:
- `categoryId`: Optional reference to category ID
- `subcategoryId`: Optional reference to subcategory ID
- `miniSubcategoryId`: Optional reference to mini-subcategory ID
- `propertyType`, `subCategory`: Legacy fields (still supported for backward compatibility)

## Setup & Initialization

### Option 1: Automatic Seeding (Recommended)

1. **Make an admin API call to initialize the 3-level structure:**

```bash
curl -X POST http://localhost:5173/api/admin/init-3level-categories \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'
```

This will create:
- 4 main categories: Buy, Rent, Commercial, Agricultural
- Appropriate subcategories under each
- 6 mini-subcategories under Commercial (Shop, Office Space, Showroom, Warehouse, Factory, Restaurant Space)
- 8 mini-subcategories under Agricultural (Agricultural Land, Farmhouse, Orchard, Dairy Farm, Poultry Farm, Fish Farm, Polyhouse, Pasture)

### Option 2: Manual Script Execution

```bash
# From project root
npx tsx server/scripts/seed-3level-categories.ts
```

### Option 3: Manual Admin Panel

Navigate to Admin Panel → Categories Management → Mini-subcategories to manually create and manage the hierarchy.

## Admin Panel Features

### Accessing Admin Components

1. **Categories Management**: `/admin/categories`
   - Create, edit, delete categories
   - Manage main category-level settings

2. **Mini-subcategories Management**: Accessible from admin dashboard
   - View/manage categories and subcategories
   - Create, edit, delete mini-subcategories
   - Toggle active/inactive status
   - View property counts for each mini-subcategory

### Creating a New Mini-subcategory

1. Navigate to Admin → Mini-subcategories Management
2. Select a Category from the dropdown
3. Select a Subcategory from the dropdown
4. Click "Add Mini-Subcategory"
5. Fill in:
   - **Name**: Display name (e.g., "Shop")
   - **Slug**: URL-friendly identifier (auto-generated or custom)
   - **Description**: Brief description
   - **Sort Order**: Display order (0-based)
   - **Active**: Toggle to enable/disable
6. Click "Create" to save

### Editing a Mini-subcategory

1. In the mini-subcategories list, click the Edit icon
2. Update the fields as needed
3. Click "Update" to save changes

### Deleting a Mini-subcategory

1. In the mini-subcategories list, click the Delete icon
2. Confirm the deletion

**Note:** You cannot delete a mini-subcategory if it has linked properties. Delete or reassign those properties first.

## Frontend Features

### Post Property Form - Cascading Dropdowns

The form now includes 3-level cascading dropdowns:

1. **Step 1: Property Details**
   - **First dropdown**: Select Category (Buy, Rent, Commercial, etc.)
   - **Second dropdown** (appears after category selection): Select Subcategory
   - **Third dropdown** (appears only if mini-subcategories exist): Select Type/Mini-subcategory

### Commercial & Agricultural Pages

- `/commercial` - Shows all mini-subcategories for Commercial
- `/agricultural` - Shows all mini-subcategories for Agricultural

Each mini-subcategory is displayed as a card with:
- Name and description
- Property count badge (dynamic, based on approved listings)
- Click-through to view all properties in that mini-subcategory

## API Endpoints

### Public Endpoints

```
GET /api/categories
GET /api/categories/:slug
GET /api/categories/:categorySlug/subcategories
```

### Admin Endpoints

#### Mini-subcategories

```
GET /api/admin/mini-subcategories
  - Query params: ?subcategoryId=ID&search=QUERY&page=1&limit=10&active=true

POST /api/admin/mini-subcategories
  - Body: {
      subcategoryId: string,
      name: string (required),
      slug: string (optional, auto-generated),
      description: string,
      sortOrder: number,
      active: boolean
    }

GET /api/admin/mini-subcategories/by-subcategory/:subcategoryId
  - Returns all mini-subcategories for a specific subcategory

GET /api/admin/mini-subcategories/:subcategoryId/with-counts
  - Returns mini-subcategories with property counts

PUT /api/admin/mini-subcategories/:miniSubcategoryId
  - Update mini-subcategory

DELETE /api/admin/mini-subcategories/:miniSubcategoryId
  - Delete mini-subcategory (fails if linked properties exist)

PUT /api/admin/mini-subcategories/:miniSubcategoryId/toggle
  - Toggle active/inactive status
```

## Complete Workflow Example

### 1. Initialize the System

```bash
# Admin initializes the 3-level structure
POST /api/admin/init-3level-categories
```

### 2. Post a Property

1. User navigates to `/post-property`
2. In Step 1 - Property Details:
   - Selects "Commercial" from Category dropdown
   - Selects "Commercial Spaces" from Subcategory dropdown
   - Selects "Shop" from Type (Mini-subcategory) dropdown
3. Continues with remaining steps
4. Property is created with:
   - `categoryId`: "commercial" category ID
   - `subcategoryId`: "commercial-spaces" subcategory ID
   - `miniSubcategoryId`: "shop" mini-subcategory ID

### 3. View Listings

#### Option A: Commercial Category Page
- User clicks "Commercial" on homepage
- `/commercial` page loads
- Shows all 6 mini-subcategories for Commercial:
  - Shop (12 properties)
  - Office Space (8 properties)
  - Showroom (5 properties)
  - Warehouse (3 properties)
  - Factory (2 properties)
  - Restaurant Space (1 property)
- Click on "Shop" → shows all 12 shop properties

#### Option B: Direct Listing Search
- Navigate to `/listings?category=commercial&miniSubcategory=shop`
- Shows all properties matching that mini-subcategory

### 4. Manage from Admin Panel

1. Navigate to Admin → Mini-subcategories Management
2. Select Commercial category → Commercial Spaces subcategory
3. See all 6 mini-subcategories with live property counts
4. Can edit names, descriptions, enable/disable them
5. Cannot delete a mini-subcategory with linked properties

## Property Filtering

### By Mini-subcategory

Properties can be filtered by mini-subcategory in listings:

```
GET /api/properties?miniSubcategoryId=ID
```

### Counts

Get dynamic property counts for mini-subcategories:

```
GET /api/admin/mini-subcategories/:subcategoryId/with-counts
```

Returns each mini-subcategory with a `count` field showing active, approved properties.

## Backward Compatibility

The system maintains backward compatibility with legacy property records:

- Properties can still use `propertyType` and `subCategory` fields
- New properties should use `categoryId`, `subcategoryId`, and `miniSubcategoryId`
- The API supports querying by either system
- Legacy slugs are automatically mapped where possible

## Database Indexes

The system creates/uses these indexes for performance:

```
Categories:
- slug (unique)

Subcategories:
- categoryId
- (categoryId, slug)

Mini-subcategories:
- subcategoryId
- (subcategoryId, slug)

Properties:
- categoryId
- subcategoryId
- miniSubcategoryId
```

## Validation Rules

1. **Categories**: Slug must be globally unique
2. **Subcategories**: 
   - Must reference a valid category via `categoryId`
   - Slug must be unique per category
3. **Mini-subcategories**:
   - Must reference a valid subcategory via `subcategoryId`
   - Slug must be unique per subcategory
4. **Properties**:
   - If using new system, must have valid `categoryId` and `subcategoryId`
   - `miniSubcategoryId` is optional (only required if the subcategory has mini-subcategories)

## Troubleshooting

### Mini-subcategories not showing in form

**Issue**: Third dropdown not appearing in Post Property form

**Solutions**:
1. Verify mini-subcategories exist for the selected subcategory
2. Check that mini-subcategories have `active: true` or `isActive: true`
3. Clear browser cache and refresh the page

### Property count is 0 or incorrect

**Issue**: Mini-subcategory shows wrong property count

**Solutions**:
1. Verify properties have correct `miniSubcategoryId`
2. Check property `status: "active"` and `approvalStatus: "approved"`
3. Wait a moment (counts are cached), then refresh the page

### Cannot delete mini-subcategory

**Issue**: Delete button is disabled or returns error

**Solution**:
- The mini-subcategory has linked properties
- Reassign or delete those properties first
- Then delete the mini-subcategory

### Slugs auto-generating with suffixes

**Issue**: Slugs are becoming "shop-2", "shop-3", etc.

**Reason**: This is intentional auto-suffix behavior for uniqueness per subcategory

**Solution**: Use custom slugs that are unique within the subcategory

## Performance Considerations

1. **Caching**: Mini-subcategory counts are fetched fresh on each request
2. **Pagination**: Use limit/offset for large category lists
3. **Indexes**: All foreign key relationships are indexed
4. **Slug Lookups**: Slugs are case-sensitive; normalize inputs

## Future Enhancements

Potential improvements to the system:

1. **Bulk Operations**: Import categories from Excel/CSV
2. **Category Icons**: Upload custom icons per level
3. **Descriptions**: Rich text descriptions with images
4. **Search Integration**: Full-text search across all levels
5. **Analytics**: Track popular categories and subcategories
6. **Caching**: Redis caching for frequently accessed categories
7. **Permissions**: Granular admin permissions per category
8. **Translations**: Multi-language support for categories

## Support

For issues or questions about the category system:

1. Check this guide for common problems
2. Review the admin panel interface
3. Check browser console for errors
4. Contact admin support with category slug and specific issue

---

**Last Updated**: 2024
**Version**: 1.0
