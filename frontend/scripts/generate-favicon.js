// This script converts the SVG logo to various PNG sizes and generates a favicon.ico file
// You'll need to install these packages:
// npm install --save-dev sharp favicon

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const favicon = require('favicon');

const SVG_PATH = path.resolve(__dirname, '../public/logo.svg');
const OUTPUT_DIR = path.resolve(__dirname, '../public');

// Sizes for favicon and app icons
const sizes = [16, 32, 48, 64, 192, 512];

async function generateIcons() {
  try {
    // Read the SVG file
    const svgBuffer = fs.readFileSync(SVG_PATH);
    
    // Generate PNGs of different sizes
    const pngPaths = [];
    
    for (const size of sizes) {
      const outputPath = path.join(OUTPUT_DIR, `logo${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`Generated ${outputPath}`);
      
      if (size <= 64) {
        pngPaths.push(outputPath);
      }
      
      // Rename specific sizes for manifest.json
      if (size === 192) {
        fs.copyFileSync(outputPath, path.join(OUTPUT_DIR, 'logo192.png'));
        console.log('Created logo192.png');
      } else if (size === 512) {
        fs.copyFileSync(outputPath, path.join(OUTPUT_DIR, 'logo512.png'));
        console.log('Created logo512.png');
      }
    }
    
    // Generate favicon.ico from the smaller PNGs
    favicon.generate(pngPaths, path.join(OUTPUT_DIR, 'favicon.ico'), (err, result) => {
      if (err) {
        console.error('Error generating favicon:', err);
        return;
      }
      
      console.log('Generated favicon.ico');
      
      // Clean up temporary PNG files
      for (const size of sizes) {
        if (size <= 64) {
          fs.unlinkSync(path.join(OUTPUT_DIR, `logo${size}.png`));
        }
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

generateIcons();