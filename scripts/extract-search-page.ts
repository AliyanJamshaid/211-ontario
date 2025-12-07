import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function extractSearchPage() {
  console.log('🚀 Launching Puppeteer to extract search page...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    console.log('📄 Loading https://211ontario.ca/search/\n');
    await page.goto('https://211ontario.ca/search/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait for topics to load
    await page.waitForSelector('#topic-search', { timeout: 10000 });

    console.log('⏳ Waiting for all content to load...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get the full HTML
    const html = await page.content();

    // Save to file
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const filepath = path.join(dataDir, 'search-page.html');
    fs.writeFileSync(filepath, html);

    console.log(`💾 Saved full HTML to data/search-page.html`);
    console.log(`📊 File size: ${(html.length / 1024).toFixed(2)} KB\n`);

    return html;

  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('211 ONTARIO - EXTRACT SEARCH PAGE');
  console.log('='.repeat(60) + '\n');

  await extractSearchPage();

  console.log('='.repeat(60));
  console.log('✨ Extraction completed!');
  console.log('='.repeat(60) + '\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
