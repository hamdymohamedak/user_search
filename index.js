import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio'; // Correct import for cheerio in ES modules
import fs from 'fs';
import chalk from 'chalk'; // Correct way to import chalk in ES Module
import readline from 'readline'; // Import readline for user input

// Set up readline interface to prompt user for input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// دالة للبحث على الإنترنت باستخدام اسم المستخدم
async function searchSocialMediaAccounts(query, searchType) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  let searchQuery = '';

  if (searchType === 'username') {
    searchQuery = `${query} social media accounts`;
  } else if (searchType === 'phone') {
    searchQuery = `${query} phone social media`;
  }

  // البحث في جوجل عن حسابات السوشيال ميديا
  await page.goto(`https://www.google.com/search?q=${searchQuery}`, { waitUntil: 'domcontentloaded' });

  // استخراج الروابط التي تظهر في نتائج البحث
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'));
    return anchors
      .map(anchor => anchor.href)
      .filter(href => href.includes('twitter') || href.includes('instagram') || href.includes('facebook') || href.includes('linkedin'));
  });

  await browser.close();

  return links;
}

// دالة لاستخراج الروابط من صفحات معينة مثل فيسبوك أو تويتر
async function extractSocialLinks(pageUrl) {
  try {
    // Sending a request with a common browser user-agent
    const response = await axios.get(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Check if the response is successful (status code 200)
    if (response.status !== 200) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const $ = cheerio.load(response.data);
    const links = [];

    // Extract only social media links
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && (href.includes('twitter') || href.includes('instagram') || href.includes('facebook') || href.includes('linkedin'))) {
        links.push(href);
      }
    });

    return links;
  } catch (error) {
    // Log error details for better understanding
    console.error('Error extracting links from', pageUrl, error.message);
    return [];
  }
}

// دالة رئيسية للبحث عن حسابات وسائل التواصل الاجتماعي
async function main() {
  rl.question('Do you want to search by username or phone number? (Enter "username" or "phone"): ', async (searchType) => {
    if (searchType !== 'username' && searchType !== 'phone') {
      console.log('Invalid choice. Please enter either "username" or "phone".');
      rl.close();
      return;
    }

    rl.question(`Please enter the ${searchType} you want to search for: `, async (query) => {
      console.log(`Searching for social media accounts of: ${query}`);

      const socialLinks = await searchSocialMediaAccounts(query, searchType);

      console.log('Found links:');

      // Write the links to a text file next to index.js
      const fileName = './social_media_links.txt';
      let fileContent = '';

      socialLinks.forEach(link => {
        // Print the links in green in the terminal
        console.log(chalk.green(link));
        fileContent += link + '\n';
      });

      // Write to the file
      fs.writeFileSync(fileName, fileContent);

      console.log(`Links have been written to ${fileName}`);

      // If you want to extract data from these links further
      for (const link of socialLinks) {
        const accountLinks = await extractSocialLinks(link);
        console.log(`Links extracted from ${link}:`);
        accountLinks.forEach(l => console.log(chalk.green(l)));
      }

      // Close the readline interface
      rl.close();
    });
  });
}

main();
