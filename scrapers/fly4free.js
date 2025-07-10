// Importing libraries

const express = require('express');
const router = express.Router();
const { connect } = require('puppeteer-real-browser');

// Defining the route for the scraper
router.get('/', async (req, res) => {
  try {
    console.log('Starting Fly4Free scraper...');
    
    // Launch real chrome browser with Railway-compatible configuration
    const { browser, page } = await connect({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-web-security',
        '--disable-extensions'
      ],
      customConfig: {
        executablePath: process.env.CHROME_PATH || process.env.GOOGLE_CHROME_BIN || '/usr/bin/google-chrome-stable'
      },
      turnstile: true,
      connectOption: {},
      disableXvfb: false,
      ignoreAllFlags: false,
    });

    // Log the success message for debugging
    console.log('Browser connected successfully');

    // Set user agent and viewport to appear more like a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    // Navigate to the URL provided 
    const url = 'https://www.fly4free.com/flights/flight-deals/europe/';
    console.log(`Navigating to: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded successfully');

    // Wait to finish rendering
    console.log('Waiting for content to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract raw text content for LLM processing
    console.log('Extracting raw content...');
    const rawContent = await page.evaluate(() => {
      // Get the main content area that contains the deals
      const mainContent = document.querySelector('main') || document.querySelector('#main') || document.querySelector('.main-content') || document.body;
      
      // Extract all text content from links that appear to be deals
      const dealLinks = Array.from(document.querySelectorAll('a')).filter(link => {
        const text = link.textContent.trim();
        const href = link.href;
        // Filter for links that contain flight-related content
        return text.length > 20 && 
               href.includes('fly4free.com') && 
               (text.includes('€') || text.includes('$') || text.includes('£') || 
                text.toLowerCase().includes('flight') || 
                text.toLowerCase().includes('deal') ||
                text.toLowerCase().includes('from') ||
                href.includes('/deal/') || href.includes('/flight/'));
      });

      // Extract raw text data for each potential deal
      const rawDeals = dealLinks.map((link, index) => {
        return {
          id: index + 1,
          rawText: link.textContent.trim(),
          url: link.href,
          htmlContent: link.innerHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        };
      });

      //  getting the page title and any meta description
      const pageTitle = document.title || '';
      const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
      
      return {
        pageTitle,
        metaDescription,
        rawDeals,
        pageText: mainContent.textContent.replace(/\s+/g, ' ').trim() // Complete page content without limit
      };
    });

    // Log the number of raw deals extracted
    console.log(`Extracted ${rawContent.rawDeals.length} raw deals`);

    await page.close();
    await browser.close();

    // Return structured JSON response with raw content for LLM processing
    res.json({
      success: true,
      source: 'fly4free',
      url: url,
      timestamp: new Date().toISOString(),
      totalDeals: rawContent.rawDeals.length,
      rawContent: rawContent,
      instruction: "This raw content should be processed by an LLM to extract structured flight deal information including: title, price, destination, departure location, dates, and any other relevant details."
    });
    
  } catch (err) {
    console.error('Fly4Free scrape failed:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to scrape Fly4Free', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Exporting the router
module.exports = router;