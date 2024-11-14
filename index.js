import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio'; // Correct import for cheerio in ES modules
import fs from 'fs';
import chalk from 'chalk'; // Correct way to import chalk in ES Module
import readline from 'readline'; // Import readline for user input
import os from 'os'; // To get user system information

// Set up readline interface to prompt user for input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to search for social media accounts based on username or phone number
async function searchSocialMediaAccounts(query) {
  const searchQuery = `site:twitter.com ${query} OR site:facebook.com ${query} OR site:instagram.com ${query} OR site:linkedin.com ${query}`;

  console.log(`Searching for: ${searchQuery}`);

  // Launch Puppeteer to scrape the search results from Google
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, { waitUntil: 'domcontentloaded' });

  // Extract links from the search results page
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'));
    return anchors
      .map(anchor => anchor.href)
      .filter(href => href.includes('twitter') || href.includes('instagram') || href.includes('facebook') || href.includes('linkedin'));
  });

  await browser.close();
  
  return links;
}

// Function to search for social media accounts based on field and location
async function searchByFieldAndLocation(field, location) {
  const searchQuery = `${field} site:twitter.com OR site:facebook.com OR site:instagram.com OR site:linkedin.com ${location}`;
  
  console.log(`Searching for: ${searchQuery}`);

  // Launch Puppeteer to scrape the search results from Google
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, { waitUntil: 'domcontentloaded' });

  // Extract links from the search results page
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'));
    return anchors
      .map(anchor => anchor.href)
      .filter(href => href.includes('twitter') || href.includes('instagram') || href.includes('facebook') || href.includes('linkedin'));
  });

  await browser.close();
  
  return links;
}

// Function to extract social media links from a given page URL
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

// Function to log user system information
function logUserInformation(userData) {
  console.log(chalk.blue('User Information:'));
  console.log('Platform:', userData.platform);
  console.log('Architecture:', userData.architecture);
  console.log('System Uptime:', userData.systemUptime);
  console.log('User Info:', userData.userInfo);
  fs.appendFileSync('./user_info_log.txt', JSON.stringify(userData) + '\n');
}

// Main function to run the search
async function main() {
  rl.question('Do you want to search by username, phone number, or field and location? (Enter [1] "username",[2] "phone",[3] "field"): ', async (searchType) => {
    if (![ '1', '2', '3'].includes(searchType)) {
      console.log('Invalid choice. Please enter either "1", "2", or "3".');
      rl.close();
      return;
    }

    if (searchType === '3') {
      rl.question('Please enter the field you want to search for (e.g., programming, marketing): ', async (field) => {
        rl.question('Please enter the location (e.g., Egypt, Cairo): ', async (location) => {
          const socialLinks = await searchByFieldAndLocation(field, location);
          console.log('Found links related to this field and location:');

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

          // Log User Info
          const userData = {
            searchType: searchType,
            field: field,
            location: location,
            platform: os.platform(),
            architecture: os.arch(),
            systemUptime: os.uptime(),
            userInfo: os.userInfo()
          };
          logUserInformation(userData);

          // Close the readline interface
          rl.close();
        });
      });
    } else {
      rl.question(`Please enter the Keyword:`, async (query) => {
        console.log(`Searching for social media accounts of: ${query}`);

        const socialLinks = await searchSocialMediaAccounts(query);

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

        // Log User Info
        const userData = {
          searchType: searchType,
          query: query,
          platform: os.platform(),
          architecture: os.arch(),
          systemUptime: os.uptime(),
          userInfo: os.userInfo()
        };
        logUserInformation(userData);

        rl.close();
      });
    }
  });
}

main();
