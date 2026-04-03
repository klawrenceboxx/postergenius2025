# PosterGenius — Image Assets

## Cloudinary (Primary Image Store)

Cloudinary is already integrated with the site as the main product image CDN.

- **Config vars:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (in `.env`)
- **Usage in code:** `lib/cdn.js` — image URL generation and transformation
- **What's stored:** all product listing images uploaded through the seller dashboard

Cloudinary supports on-the-fly transformations (resize, crop, format conversion) via URL params — useful for generating Pinterest pin sizes without re-uploading.

## AWS S3 (Digital Downloads Only)

- Stores the actual downloadable poster files (not display images)
- Generates presigned URLs for secure, expiring download links
- **Config:** `lib/s3.js`, env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`

## Local Image Repo

- User has a local folder of poster images/mockups — location TBD (to be added when confirmed)
- Intended use: source material for Pinterest pins, Etsy listing thumbnails, new site uploads

## Reviews / Product Data File

- File: `C:\Users\Kalee\OneDrive\Desktop\PG Website posters.xlsx`
- Contains product and review data — reference for product decisions and listing audits

## Image Workflow (Recommended)

1. Upload new product images → Cloudinary via seller dashboard
2. Use Cloudinary URLs for Pinterest pins (add `/w_1000,h_1500,c_fill` for portrait pin format)
3. Use same Cloudinary images for Etsy listing thumbnails
4. Keep local folder as a staging area for new mockups before upload
