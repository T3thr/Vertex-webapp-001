# Cloudinary Setup for DivWy Visual Novel Editor

## Overview
This implementation adds character and background management functionality to the DirectorTab component with Cloudinary integration for media uploads.

## Environment Variables Required

Add these variables to your `.env.local` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

## How to Get Cloudinary Credentials

1. Go to [Cloudinary](https://cloudinary.com/) and create a free account
2. In your Dashboard, you'll find:
   - **Cloud Name**: Your unique cloud name
   - **API Key**: Your API key
   - **API Secret**: Your API secret (keep this secure!)

## Features Added

### 1. Media Upload API (`/api/media/upload`)
- **POST**: Upload images/media to Cloudinary
- **GET**: Retrieve uploaded media for the current user
- Supports different media types: character, background, audio, other
- Auto-organizes files in folders by type

### 2. Character Management Modal
- Add, edit, and delete characters
- Upload character images via Cloudinary
- Tag system for organization
- Search and filter functionality

### 3. Background Management Modal
- Support for three background types:
  - **Images**: Upload via Cloudinary
  - **Colors**: Color picker with presets
  - **Gradients**: CSS gradient editor with presets
- Add, edit, and delete backgrounds
- Tag system and search functionality

### 4. DirectorTab Integration
- New buttons in header: "ตัวละคร" (Characters) and "พื้นหลัง" (Backgrounds)
- Mobile-responsive design
- Integrated with existing timeline and preview system

## Usage

1. **Setting up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Cloudinary credentials
   ```

2. **Installing dependencies**:
   ```bash
   bun install
   # lodash is now included for Cloudinary compatibility
   ```

3. **Running the application**:
   ```bash
   bun run dev
   ```

4. **Using the features**:
   - Navigate to any novel's overview page
   - Click on the "Director Studio" tab
   - Use the "ตัวละคร" button to manage characters
   - Use the "พื้นหลัง" button to manage backgrounds
   - Upload images directly through the modals

## File Structure

```
src/
├── app/api/media/upload/
│   └── route.ts                    # Cloudinary upload API
├── components/director/
│   ├── CharacterManagementModal.tsx # Character management UI
│   └── BackgroundManagementModal.tsx # Background management UI
└── app/novels/[slug]/overview/components/tabs/
    └── DirectorTab.tsx             # Updated with modal integration
```

## Security Notes

- All uploads are authenticated (requires user session)
- Files are organized by user ID to prevent access conflicts
- API routes include proper error handling and validation
- Cloudinary credentials should never be exposed to client-side code

## Troubleshooting

1. **Lodash Error**: Fixed by installing lodash dependency
2. **Build Errors**: Ensure all environment variables are set
3. **Upload Failures**: Check Cloudinary credentials and network connectivity
4. **Permission Errors**: Verify user authentication is working

## Next Steps

- Add support for audio file uploads
- Implement drag-and-drop functionality
- Add batch upload capabilities
- Integrate with the timeline system for character/background placement
