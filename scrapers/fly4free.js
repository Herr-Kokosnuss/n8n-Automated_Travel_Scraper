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
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'chromium'
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

    // Extract raw text content for LLM processing using GPT's HTML filtering approach
    console.log('Extracting raw content...');
    const rawContent = await page.evaluate(() => {
      // 🗑️ Remove noise tags completely
      const noiseTags = ['script', 'style', 'noscript', 'iframe', 'svg', 'canvas', 'form', 'input', 'button', 'select', 'textarea'];
      noiseTags.forEach(tag => {
        document.querySelectorAll(tag).forEach(el => el.remove());
      });

      // Focus on content-rich tags
      const contentSelectors = [
        'article',
        'main', 
        'section',
        'div[class*="content"]',
        'div[class*="deal"]',
        'div[class*="post"]',
        'div[class*="item"]',
        'p',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li'
      ];

      // Get clean content container - prioritize semantic containers
      let mainContent = document.querySelector('main') || 
                       document.querySelector('article') || 
                       document.querySelector('#main') || 
                       document.querySelector('.main-content') ||
                       document.querySelector('[class*="content"]') ||
                       document.querySelector('[class*="deals"]');
      
      // Only if no semantic container found, fallback to body
      if (!mainContent) {
        mainContent = document.body;
      }

      // Extract flight deals from links within clean content
      const dealLinks = Array.from(mainContent.querySelectorAll('a')).filter(link => {
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

      // Extract raw text data for each potential deal with duplicate detection
      const seenUrls = new Set();
      const rawDeals = [];
      
      dealLinks.forEach((link) => {
        const url = link.href;
        const text = link.textContent.trim();
        
        // Skip duplicates and empty content
        if (!seenUrls.has(url) && text.length > 20) {
          seenUrls.add(url);
          rawDeals.push({
            id: rawDeals.length + 1,
            rawText: text,
            url: url,
            htmlContent: link.innerHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
          });
        }
      });

      // Clean up the page text by removing common noise patterns
      let cleanPageText = mainContent.textContent || '';
      
      // Remove common noise patterns
      const noisePatterns = [
        /cookie|gdpr|privacy policy|terms of service|accept|consent/gi,
        /subscribe|newsletter|follow us|sign up|login|register/gi,
        /loading\.\.\.|please wait|redirecting/gi,
        /©.*\d{4}|copyright|all rights reserved/gi,
        /\b(home|about|contact|help|support|faq)\b/gi,
        /\s+/g // Multiple spaces to single space
      ];
      
      noisePatterns.forEach(pattern => {
        if (pattern.source === '\\s+') {
          cleanPageText = cleanPageText.replace(pattern, ' ');
        } else {
          cleanPageText = cleanPageText.replace(pattern, ' ');
        }
      });

      // Get page metadata
      const pageTitle = document.title || '';
      const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
      
      return {
        pageTitle,
        metaDescription,
        rawDeals,
        pageText: cleanPageText.trim().substring(0, 10000) // Limit to 10k chars of clean content
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