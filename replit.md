# Overview

A production-ready full-stack property management application built with React and Express, designed for property listings, chat functionality, and comprehensive user management. The platform supports buyers, sellers, agents, and administrators with role-based access control, real-time messaging, and advanced property search capabilities.

## Recent Changes (November 2025)

### Blog Management System for SEO (November 22, 2025)
- Implemented complete blog management system with SEO optimization features
- Admin blog creation interface with rich text editor, featured image upload, and comprehensive SEO fields
- Blog schema includes: title, custom slug/URL, content, excerpt, meta description, meta keywords, tags, publish status
- Secure backend API routes for blog CRUD operations:
  - `POST /api/admin/blogs` - Create blog (admin only)
  - `GET /api/blogs` - List all published blogs (public)
  - `GET /api/blogs/:slug` - Get blog by slug with automatic view counting (public)
  - `PUT /api/admin/blogs/:id` - Update blog (admin only)
  - `DELETE /api/admin/blogs/:id` - Delete blog (admin only)
- All admin routes protected with `authenticateToken` and `requireAdmin` middleware
- Frontend blog listing page at `/blogs` with search and tag filtering
- Individual blog detail pages at `/blog/:slug` with SEO meta tags via react-helmet-async
- Automatic slug generation from blog titles with uniqueness validation
- View counter increments automatically when blogs are accessed
- "Blog" link added to footer Quick Links section for easy navigation
- Robust input validation with try-catch for JSON parsing (tags, keywords)
- Featured image upload support with 5MB limit
- Draft and published status workflow for content management

### Property Rejection and Resubmission Workflow
- Implemented complete property rejection and resubmission system with admin moderation
- Admin rejection UI requires specific rejection reasons with region dropdown and detailed explanation
- Added "Edit & Resubmit" button to MyProperties dashboard for rejected properties
- Rejection reasons displayed prominently to sellers with formatted "Region: Specific Reason" structure
- Enhanced PostProperty page to support editing mode via URL parameter (`?edit=propertyId`)
- Automatic property data fetching and form pre-filling for rejected properties
- Resubmission workflow automatically updates property status from "Rejected" to "Pending Review"
- Backend resubmit endpoint at `/api/seller/properties/:id/resubmit` handles status transitions
- Comprehensive error handling and user feedback throughout the workflow

### Category-Property Filtering Enhancement
- Fixed critical category filtering logic in `CategoryProperties.tsx` to properly separate `priceType` (sale/rent) from `propertyType` (residential/commercial/plot)
- Properties now display correctly in their respective category pages based on URL structure (e.g., /buy/residential/1bhk)
- Updated filtering to properly map URL parameters to MongoDB query filters

### Image Watermark & Zoom System
- Implemented comprehensive image viewer with zoom functionality (`ImageViewerWithZoom.tsx`)
- Added configurable watermark system with three positioning modes (bottom-right, center, pattern)
- Built admin watermark management panel with logo upload, position control, and opacity settings
- Created secure backend API routes for watermark configuration:
  - Public endpoint: `GET /api/watermark-settings` (for display)
  - Protected admin endpoints: `/api/admin/watermark-settings` (GET/POST) and `/api/admin/watermark-logo` (POST)
- Implemented download functionality with and without watermark
- All admin routes protected with `authenticateToken` and `requireAdmin` middleware
- Dynamic watermark configuration fetched from MongoDB and applied in real-time on property detail pages

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 18** with TypeScript for type safety and modern React features
- **React Router 6** in SPA mode for client-side routing with dynamic page handling
- **Vite** as the build tool for fast development and optimized production builds
- **TailwindCSS 3** with Radix UI components for consistent design system
- **Tanstack Query** for server state management and caching
- Component-based architecture with reusable UI components in `/client/components/ui/`
- Responsive design with mobile-first approach

## Backend Architecture
- **Express.js** server integrated with Vite development server
- **RESTful API** design with role-based authentication middleware
- **JWT authentication** for secure user sessions
- **File upload** handling with Multer for property images and documents
- **Socket.io** integration for real-time chat functionality
- **WebSocket** support for live notifications and messaging

## Database Design
- **MongoDB** as the primary database with collections for:
  - Properties with approval workflows and premium listings
  - Users with role-based access (buyer/seller/agent/admin)
  - Categories and subcategories for property classification
  - Conversations and messages for chat system
  - Banners and advertisements for content management
  - Notifications for user engagement

## Authentication & Authorization
- **JWT-based authentication** with role-specific access controls
- **Firebase Authentication** integration for enhanced security
- **Admin middleware** for protected administrative endpoints
- **Token-based API** authentication for secure operations

## Real-time Features
- **Socket.io** for instant messaging between users
- **WebSocket connections** for live notifications
- **Real-time property updates** and status changes
- **Live chat system** with typing indicators and message delivery

## Content Management
- **Dynamic banner system** with admin controls
- **Category management** with hierarchical organization
- **Property approval workflow** with admin oversight
- **User notification system** for engagement

# External Dependencies

## Core Technologies
- **Node.js/Express** - Server runtime and web framework
- **React/TypeScript** - Frontend framework with type safety
- **MongoDB** - Primary database for all application data
- **Socket.io** - Real-time bidirectional communication

## Authentication Services
- **Firebase Admin SDK** - Enhanced authentication and push notifications
- **JWT (jsonwebtoken)** - Token-based authentication
- **bcrypt** - Password hashing and security

## File Management
- **Multer** - File upload handling for property images
- **Express static** - Serving uploaded media files

## Email & SMS Services
- **Nodemailer** - Email notifications and communication
- **Twilio** - SMS notifications and OTP verification

## Frontend Libraries
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon system
- **React Router** - Client-side routing
- **Tanstack Query** - Server state management
- **React Hook Form** - Form handling and validation

## Development Tools
- **Vite** - Build tool and development server
- **Vitest** - Testing framework
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - Type safety across the application

## Production Infrastructure
- **Environment variables** for configuration management
- **CORS configuration** for cross-origin requests
- **Production build** optimization with code splitting
- **Static file serving** for efficient asset delivery