import Parser from 'rss-parser'; // RSS parser library that turns RSS XML feeds into JS objects
import { promises as fs } from 'fs';

// Fetch RSS feeds from given URLs
export async function fetchRSSFeeds(urls: string[]): Promise<string[]> {
  const parser = new Parser();
  let titles: string[] = [];

  for (const url of urls) {
    // Each feed is a list of JS objects from the RSS feed like:
    // {
    //   items: [
    //     {
    //       title: 'A South Korean adoptee needed answers about the past. She got them — just not the ones she wanted',
    //       link: 'https://www.yahoo.com/news/am-south-korean-adoptee-finds-014733163.html',
    //       pubDate: '2024-10-15T01:47:33Z',
    //       guid: 'am-south-korean-adoptee-finds-014733163.html',
    //       isoDate: '2024-10-15T01:47:33.000Z'
    //     },
    //     {
    //       title: 'Jim Cramer on NVIDIA Corporation (NVDA): ‘You Probably Won’t Be Able To Sell It High And Then Get Back In Low’',
    //       link: 'https://finance.yahoo.com/news/jim-cramer-nvidia-corporation-nvda-191225120.html',
    //       pubDate: '2024-10-16T19:12:25Z',
    //       guid: 'jim-cramer-nvidia-corporation-nvda-191225120.html',
    //       isoDate: '2024-10-16T19:12:25.000Z'
    //     },
    // ...
    const feed = await parser.parseURL(url);
    for (let i = 0; i < feed.items.length; i++) {
      const item = feed.items[i];
      // Now titles is an array of article titles:
      // [
      //   'A South Korean adoptee needed answers about the past. She got them — just not the ones she wanted',
      //   'Florida couple dies of possible carbon monoxide poisoning from generator after Milton, report says', ...]
      if (item.title) {
        titles.push(item.title);
      }
    }
  }
  return titles;
}

// Extract common keywords from the fetched content
export async function extractKeywords(contents: string[]): Promise<string[]> {
  // Join all the content into a single string
  const allText = contents.join(' ');

  // Split the text into individual words (splitting by whitespace)
  const words = allText.split(' ');

  const stopWords = [
    'the',
    'and',
    'is',
    'in',
    'it',
    'to',
    'of',
    'a',
    'on',
    'for',
    'with',
    'by',
    'at', 'that', 'could', 'says', 'said', 'can', 'as', 'but', 'he', 'him', 'she', 'her', 'it', 'was', 'be', 'after', 'before', 'over', 'from', 'say', 'said', 'will', 'can', 'more', 'his', 'hers', 'their', 'them' // Add more common stop words as needed
  ];

  // An object to store word counts
  const wordFrequency: { [key: string]: number } = {};

  words.forEach((word) => {
    // Convert to lowercase and remove punctuation
    word = word.toLowerCase().replace(/[^a-z0-9]/g, ''); // Removes everything except letters and numbers

    // If the word is not a stop word and not empty, count it
    // Now have an obj like this: {sea: 2, national: 2, descend: 1, voters: 1}
    if (word && !stopWords.includes(word)) {
      if (!wordFrequency[word]) {
        wordFrequency[word] = 1;
      } else {
        wordFrequency[word] += 1;
      }
    }
  });

  // Convert the wordFrequency object into an array of [word, frequency] pairs. It will look like this: [['antelope, 2', ['deliver, 2']]]
  const wordEntries = Object.entries(wordFrequency);

  // Sort the wordEntries array by frequency
  // Now it looks like this: [['california', 15], ['after', 13]]
  wordEntries.sort(function (a, b) {
    return b[1] - a[1]; // Compare the second item (frequency) in each entry
  });

  // Get the top 10 words by taking the first 10 elements from the sorted array
  const top10Entries = wordEntries.slice(0, 10);

  // Extract only the words (without their counts) from the top 10 entries
  const topWords = [];
  for (let i = 0; i < top10Entries.length; i++) {
    topWords.push(top10Entries[i][0]); // Push only the word (first element in each entry)
  }
  return topWords;
}

// Create a file (e.g., via email or webhook)
export async function generateFile(keywords: string[]): Promise<any> {
  const report = `Top Keywords: ${keywords.join(', ')}`;

  try {
    // Write the report to a file called 'keyword-report.txt'
    await fs.writeFile('keyword-report.txt', report, 'utf-8');
    console.log('Report saved to keyword-report.txt');
  } catch (error) {
    console.error('Error saving report:', error);
  }
}
