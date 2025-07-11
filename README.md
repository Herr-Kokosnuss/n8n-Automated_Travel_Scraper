# Travel Scraper

A web scraper that extracts flight deals from travel websites and provides raw content for further processing. The scraper is designed to work with modern websites that use dynamic content loading and optimized for fly4free.com website.

## Live Demo

🚀 **Test the API live:** https://travel-scraper.up.railway.app/scrape/fly4free

This endpoint returns JSON output with scraped flight deals from Fly4Free. You can test it directly in your browser or use it in your applications.

## What it does

This app scrapes flight deals from Fly4Free and returns raw content that can be processed by language models or other tools. Instead of trying to parse specific HTML elements (which break easily), it extracts the full content and lets you process it however you need.

## How to run it

First, install the required packages:

```bash
npm install
```

Then start the server:

```bash
npm start
```

Or run directly with Node:

```bash
node app.js
```

The server will start on port 4000. You can access the flight deals at:

```
http://localhost:4000/api/scrape/fly4free
```

## What you get back

The API returns a JSON response with:
- Raw text content from each deal
- Full page text (cleaned up)
- URLs for each deal
- Instructions for processing the content

## Requirements

- Node.js (version 18 or higher)
- Chrome or Chromium browser (for headless scraping)
- Internet connection

## Deployment

The app is configured to deploy on Railway. It includes the necessary configuration files and Chrome setup for cloud deployment.

## Note

This scraper extracts raw content rather than trying to parse specific HTML elements. This makes it more reliable when websites change their structure, but you'll need to process the raw text to get structured data. 