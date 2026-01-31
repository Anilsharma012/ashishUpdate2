export interface Property {
  _id?: string;
  title: string;
  description: string;
  price: number;
  priceType: "sale" | "rent"; // per month for rent
  propertyType: string; // "residential", "commercial", "plot", etc. (legacy, use categoryId/subcategoryId for new system)
  subCategory: string; // "1bhk", "2bhk", "shop", etc. (legacy, use categoryId/subcategoryId for new system)
  categoryId?: string; // New 3-level system: Category ID
  subcategoryId?: string; // New 3-level system: Subcategory ID
  miniSubcategoryId?: string; // New 3-level system: Mini-subcategory ID (optional, only if defined for the subcategory)
  location: {
    sector?: string;
    mohalla?: string;
    landmark?: string;
    area?: string; // Rohtak specific areas
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  specifications: {
    bedrooms?: number;
    bathrooms?: number;
    area: number; // in sq ft
    facing?: string;
    floor?: number;
    totalFloors?: number;
    parking?: boolean;
    furnished?: "furnished" | "semi-furnished" | "unfurnished";
  };
  images: string[];
  amenities: string[];
  ownerId: string;
  ownerType: "seller" | "agent";
  contactInfo: {
    name: string;
    phone: string;
    alternativePhone?: string;
    whatsappNumber?: string;
    email?: string;
  };
  status: "active" | "sold" | "rented" | "inactive";
  approvalStatus: "pending" | "approved" | "rejected";
  adminComments?: string;
  rejectionReason?: string;
  rejectionRegion?: string; // Category of issue that caused rejection
  rejectedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string; // admin user ID
  featured: boolean;
  premium: boolean; // Is this a premium listing
  premiumApprovalStatus?: "pending" | "approved" | "rejected"; // Premium listing approval
  premiumApprovedAt?: Date;
  premiumApprovedBy?: string; // admin user ID
  contactVisible: boolean; // Whether contact info should be visible publicly
  shareContactInfo?: boolean; // Legacy field - use contactVisible instead
  packageId?: string; // Advertisement package
  packageExpiry?: Date;
  boosted?: boolean; // Is this a boosted listing
  boostPlanId?: string; // Boost plan ID
  boostStartTime?: Date; // When boost started
  boostEndTime?: Date; // When boost expires
  boostApprovalStatus?: "pending" | "approved" | "rejected"; // Boost approval status
  views: number;
  inquiries: number;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string; // admin user ID who deleted
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  password: string; // hashed
  userType: "buyer" | "seller" | "agent" | "admin";
  profileImage?: string;
  preferences?: {
    propertyTypes: string[];
    priceRange: {
      min: number;
      max: number;
    };
    locations: string[];
  };
  favorites: string[]; // property IDs
  freeListingLimit?: {
    limit: number; // max free listings
    period: "monthly" | "yearly"; // reset period
    limitType: number; // days: 30 for monthly, 365 for yearly
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent extends User {
  agentProfile: {
    licenseNumber?: string;
    experience: number; // years
    specializations: string[];
    rating: number;
    reviewCount: number;
    aboutMe: string;
    serviceAreas: string[];
  };
  properties: string[]; // property IDs listed by agent
}

export interface Category {
  _id?: string;
  name: string;
  slug: string; // unique
  icon?: string;
  iconUrl?: string;
  type?:
    | "buy"
    | "rent"
    | "commercial"
    | "agricultural"
    | "co-living"
    | "new-projects"
    | "maps"
    | "other-services"; // Category type
  description?: string;
  sortOrder?: number;
  order?: number;
  active?: boolean;
  isActive?: boolean;
  subcategories?: Subcategory[]; // Optional embedded subcategories
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Subcategory {
  _id?: string;
  categoryId?: string; // Reference to parent Category ID
  name: string;
  slug: string; // unique per category
  icon?: string;
  iconUrl?: string;
  description?: string;
  sortOrder?: number;
  order?: number;
  active?: boolean;
  isActive?: boolean;
  miniSubcategories?: MiniSubcategory[]; // Optional embedded mini-subcategories
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MiniSubcategory {
  _id?: string;
  subcategoryId?: string; // Reference to parent Subcategory ID
  name: string;
  slug: string; // unique per subcategory
  icon?: string;
  iconUrl?: string;
  description?: string;
  sortOrder?: number;
  order?: number;
  active?: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ServiceListing {
  _id?: string;
  category: string; // Category slug
  subcategory: string; // Subcategory slug
  name: string;
  phone: string;
  address: string;
  photos: string[]; // Max 4 photos
  geo: {
    lat: number;
    lng: number;
  };
  open: string; // Opening time
  close: string; // Closing time
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ServiceListing {
  _id?: string;
  category: string; // Category slug
  subcategory: string; // Subcategory slug
  name: string;
  phone: string;
  address: string;
  photos: string[]; // Max 4 photos
  geo: {
    lat: number;
    lng: number;
  };
  open: string; // Opening time
  close: string; // Closing time
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SearchFilters {
  propertyType?: string;
  subCategory?: string;
  priceType?: "sale" | "rent";
  location?: {
    sector?: string;
    mohalla?: string;
    landmark?: string;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  bedrooms?: number;
  bathrooms?: number;
  areaRange?: {
    min: number;
    max: number;
  };
  amenities?: string[];
  sortBy?: "price_asc" | "price_desc" | "date_desc" | "date_asc" | "area_desc";
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    updatedAt?: string;
    etag?: string;
    [key: string]: any;
  };
}

// Other Services Models
export interface OsCategory {
  _id?: string;
  slug: string;
  name: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OsSubcategory {
  _id?: string;
  category: string; // slug reference to OsCategory
  slug: string;
  name: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OsListing {
  _id?: string;
  category: string; // slug reference to OsCategory
  subcategory: string; // slug reference to OsSubcategory
  name: string;
  phone: string;
  address: string;
  photos: string[]; // array of up to 4 photo URLs
  geo: {
    lat: number;
    lng: number;
  };
  open: string; // opening time (e.g., "09:00")
  close: string; // closing time (e.g., "18:00")
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Custom Field Types
export interface CustomField {
  _id?: string;
  name: string;
  slug: string;
  type:
    | "text"
    | "number"
    | "select"
    | "multiselect"
    | "checkbox"
    | "date"
    | "textarea";
  label: string;
  placeholder?: string;
  required: boolean;
  active: boolean;
  order: number;
  options?: string[];
  categories: string[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Advertisement Package Types
export interface AdPackage {
  _id?: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in days
  features: string[];
  type: "basic" | "featured" | "premium";
  category: "property" | "general";
  location: "rohtak" | "all";
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Payment Transaction Types
export interface Transaction {
  _id?: string;
  userId: string;
  propertyId?: string;
  packageId: string;
  amount: number;
  paymentMethod: "upi" | "bank_transfer" | "online";
  paymentDetails?: {
    upiId?: string;
    bankAccount?: string;
    transactionId?: string;
    gatewayResponse?: any;
  };
  status: "pending" | "paid" | "failed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

// Banner Ad Types
export interface BannerAd {
  _id?: string;
  title: string;
  imageUrl: string;
  link: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

// Analytics Types
export interface PropertyAnalytics {
  propertyId: string;
  views: number;
  inquiries: number;
  favorites: number;
  phoneClicks: number;
  lastViewed: Date;
}

// Boost Plan Types
export interface BoostPlan {
  _id?: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in hours (e.g., 24, 48)
  features: string[];
  active: boolean;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Rohtak Areas
export const ROHTAK_AREAS = [
  "Model Town",
  "Suncity",
  "Suncity Heights",
  "Sector 1",
  "Sector 2",
  "Sector 3",
  "Sector 3 P",
  "Sector 4",
  "Sector 5",
  "Sector 6",
  "Sector 7",
  "Sector 8",
  "Sector 9",
  "Sector 10",
  "Sector 11",
  "Sector 12",
  "Sector 13",
  "Sector 14",
  "Sector 15",
  "Sector 16",
  "Sector 17",
  "Sector 18",
  "Sector 19",
  "Sector 20",
  "Sector 21",
  "Sector 22",
  "Sector 25D",
  "Sector 27",
  "Sector 27C",
  "Sector 28",
  "Sector 30",
  "Sector 33",
  "Sector 34",
  "Sector 35",
  "Sector 36",
  "Sector 36A",
  "Sector 37",
  "Delhi Road",
  "Delhi Hisar Road",
  "Sonipat Road",
  "Jind Road",
  "Bhiwani Road",
  "Hisar Road",
  "Hissar Road",
  "Jhajjar Road",
  "Panipat Road",
  "Gohana Road",
  "Civil Lines",
  "Civil Road",
  "Old City",
  "Railway Road",
  "Jail Road",
  "Bohar Road",
  "Subhash Nagar",
  "Subhash Road",
  "Shastri Nagar",
  "Prem Nagar",
  "DLF Colony",
  "Ram Nagar",
  "Krishan Nagar",
  "Krishna Nagar",
  "Krishna Colony",
  "Vikas Nagar",
  "Ashok Nagar",
  "Nehru Nagar",
  "Nehru Colony",
  "Gandhi Nagar",
  "Gandhi Camp",
  "Indira Colony",
  "Arya Nagar",
  "Saraswati Nagar",
  "Hanuman Nagar",
  "Gayatri Nagar",
  "Laxmi Nagar",
  "Durga Colony",
  "Shiv Colony",
  "Shiv Nagar",
  "Rama Park",
  "Bal Bhawan Road",
  "Bal Bhawan",
  "Near Bus Stand",
  "Near Railway Station",
  "Gali Baldev Singh",
  "Gali Toshan Singh",
  "Main Market",
  "Sunheri Gate",
  "Kachha Bazar",
  "Grain Market",
  "Cloth Market",
  "Hardware Market",
  "Industrial Area",
  "HUDA Sector",
  "Huda Complex",
  "IMT Rohtak",
  "Mansarovar Park",
  "Mansarovar Colony",
  "Pushpa Vihar",
  "Ashoka Enclave",
  "Green City",
  "Green Road",
  "Omaxe City",
  "Omaxe Society",
  "Supertech Eco Village",
  "TDI City",
  "Ansal Royal Heritage",
  "Near PGI Rohtak",
  "Near AIIMS Rohtak",
  "Near MDU",
  "Near District Court",
  "Near Government College",
  "Near Rohtak Medical College",
  "GPS Colony",
  "Police Lines",
  "Police Line",
  "ITI Road",
  "College Road",
  "Stadium Road",
  "Hospital Road",
  "Mini Secretariat",
  "DC Office Area",
  "SP Office Area",
  "Collectorate Area",
  "Bank Colony",
  "Teacher Colony",
  "Doctor Colony",
  "Engineer Colony",
  "Adarsh Nagar",
  "Agrasen Colony",
  "Agroha Village",
  "Ambedkar Colony",
  "Ambedkar Nagar",
  "Anand Pura",
  "Anwal",
  "Arjun Nagar",
  "Atmanand Hostel",
  "Azad Garh",
  "Azad Nagar",
  "Baba Laxmanpuri Colony",
  "Babra Mohalla",
  "Bainsi",
  "Balmiki Basti",
  "Balwant Colony",
  "Bara Bazar",
  "Barbal Village",
  "Bass Village",
  "Beniwal Nagar",
  "Beri Village",
  "Bhagat Singh Colony",
  "Bhagwan Colony",
  "Bharan Gaon",
  "Bharat Colony",
  "Bohar",
  "Byepass Rohtak",
  "Canal Colony",
  "Chamanpura",
  "Chameli Market",
  "Chanakya Puri Colony",
  "Chand Nagar",
  "Chawla Colony",
  "Chinyot Colony",
  "Chottu Ram Chowk",
  "Chotu Ram Nagar",
  "Chulana Village",
  "Chunni Pura",
  "Circular Road",
  "Company Bagh",
  "Dairies Behind Durga Bhawan",
  "Dairy Mohalla",
  "Damar Village",
  "Dariyao Nagar",
  "Darwaja Mohalla",
  "Dehri Mohalla",
  "Delhi Gate",
  "Dev Colony",
  "Dhobi Mohalla",
  "Ekta Colony",
  "Fatehpuri Colony",
  "Friends Colony",
  "Gani Pura",
  "Garhi Bohar",
  "Garhi Mohalla",
  "Geeta Colony",
  "Gopal Pura",
  "Guru Nanak Pura",
  "Hafed Chowk",
  "Hakikat Nagar",
  "Hari Nagar",
  "Hari Singh Colony",
  "IDC",
  "Jagdish Colony",
  "Janta Colony",
  "Jasbir Colony",
  "Jawahar Road",
  "Jhang Colony",
  "JP Colony",
  "Julaha Wala Mohalla",
  "Kabir Colony",
  "Kaccha Beri Road",
  "Kacchi Garhi",
  "Kailash Colony",
  "Kalalan Mohalla",
  "Kalanaur Village",
  "Kamal Colony",
  "Kamla Nagar",
  "Kamp",
  "Kanheli",
  "Karan Vihar",
  "Kath Mandi",
  "Kayastan Mohalla",
  "Kewal Ganj",
  "Kheri Sadh",
  "Khurd Village",
  "Kirpal Nagar",
  "Kirti Nagar",
  "Kishan Pura",
  "Kodhi Colony",
  "Labour Chowk",
  "Ladhot Road",
  "Lal Bhadur Shastry Nagar",
  "Link Road",
  "Madina Village",
  "Mahabir Colony",
  "Mahilla Ashram",
  "Mahilla College",
  "Maina",
  "Makrauli Kalan",
  "Makroli",
  "Mal Godam Road",
  "Markoli Lagghot",
  "Mata Darwaja",
  "Medical Mor",
  "Mohalla Khatikan",
  "New Anaj Mandi",
  "New Bus Stand",
  "New Chinyot Colony",
  "New Grain Market",
  "New Janta Colony",
  "New Rajendra Colony",
  "Old Anaj Mandi",
  "Old Arya Nagar/Sanjay Nagar",
  "Old Bus Stand Rohtak",
  "Old Housing Board Colony",
  "Old Power House Colony",
  "Pahara Mohalla",
  "Pahrawar",
  "Palika Colony",
  "Paras Mohalla",
  "Partap Mohalla",
  "Partap Nagar",
  "Patel Nagar",
  "Pech Paras Ram",
  "Peer Colony",
  "Pirji Mohalla",
  "Power House",
  "Preet Vihar",
  "Quilla Mohalla",
  "Quilla Road",
  "Rainak Pura",
  "Raj Garden",
  "Rajender Nagar",
  "Rajendra Colony",
  "Rajendra Nagar",
  "Rajindera Colony",
  "Ram Gopal Colony",
  "Ravi Dass Nagar",
  "Rishi Nagar",
  "Rohtak Station Diary Mohalla",
  "Roop Nagar",
  "Sadar Thana Road",
  "Sai Dass Colony",
  "Saini Pura",
  "Samaria Village",
  "Sampla",
  "Sanjay Colony",
  "Sant Nagar",
  "Sarai Mohalla",
  "Savitri Road",
  "Shakti Nagar",
  "Shivaji Colony",
  "Shivam Enclave",
  "Shivam Road",
  "Shyam Colony",
  "Singhpura Khurd",
  "Sisana Village",
  "Sital Nagar",
  "Sonaria Road",
  "Srinagar Colony",
  "Sugar Mill Colony",
  "Sun City",
  "Suncity Township",
  "Sunari Kalan",
  "Sunari Village",
  "Surya Nagar",
  "Tau Nagar",
  "Tej Colony",
  "Tek Nagar",
  "Tibri Mohalla",
  "Tilak Nagar",
  "Uttam Vihar",
  "Vijay Nagar",
  "Vishal Nagar",
  "Vishkarma Nagar",
] as const;

export type RohtakArea = (typeof ROHTAK_AREAS)[number];

export interface Blog {
  _id?: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  featuredImage?: string;
  authorId: string;
  authorName: string;
  publishStatus: "draft" | "published";
  publishedAt?: Date;
  tags?: string[];
  views: number;
  createdAt: Date;
  updatedAt: Date;
}
