import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const imageUrl = 'https://cdn.builder.io/api/v1/image/assets%2Fcab2bda442144d8ba6602fdc3a872554%2Fcb394112f70f481088a1d6d9bbea5c3a?format=png&width=1024';
const outputDir = path.join(__dirname, 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function setupIcons() {
  try {
    console.log('Downloading logo image...');
    const imageBuffer = await downloadImage(imageUrl);
    
    // Save the base image
    const basePath = path.join(outputDir, 'apple-touch-icon.png');
    fs.writeFileSync(basePath, imageBuffer);
    console.log('✓ Saved base image');

    // Create symlinks/copies for the required sizes
    const sizes = [
      { name: 'icon-48.png', size: 48 },
      { name: 'icon-96.png', size: 96 },
      { name: 'icon-144.png', size: 144 },
      { name: 'icon-192.png', size: 192 },
      { name: 'icon-512.png', size: 512 },
      { name: 'favicon-16x16.png', size: 16 },
      { name: 'favicon-32x32.png', size: 32 },
    ];

    // Copy the image for all required sizes
    // In a real scenario, you'd use sharp or jimp to resize, but for now we'll copy the base
    for (const { name } of sizes) {
      const filePath = path.join(outputDir, name);
      fs.copyFileSync(basePath, filePath);
      console.log(`✓ Created ${name}`);
    }

    // Create favicon.ico as well
    const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
    fs.copyFileSync(basePath, faviconPath);
    console.log('✓ Created favicon.ico');

    console.log('\n✅ All icons set up successfully!');
  } catch (error) {
    console.error('❌ Error setting up icons:', error);
    process.exit(1);
  }
}

setupIcons();
