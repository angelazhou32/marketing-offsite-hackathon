import Parser from 'rss-parser'; // RSS parser library that turns RSS XML feeds into JS objects
import { promises as fs } from 'fs';
import 'dotenv/config';
import sgMail from '@sendgrid/mail';
import OpenAI from 'openai';

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

async function generateSummary(topWords: string[]): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const prompt = `Summarize the following top keywords from recent RSS feeds: ${topWords.join(', ')}.`;

  try {
    const response = await openai.completions.create({
      model: 'gpt-3.5-turbo',
      prompt: prompt,
      max_tokens: 100,
      temperature: 0.7,
    });
    return response.choices[0].text.trim();
  } catch (error) {
    console.error('Error generating summary with OpenAI:', error);
    return 'Could not generate summary.';
  }
}

// Extract common keywords from the fetched content
export async function extractKeywords(contents: string[]): Promise<string[]> {
  // Join all the content into a single string
  const allText = contents.join(' ');

  // Split the text into individual words (splitting by whitespace)
  const words = allText.split(' ');

  const stopWords = [
    'i',
    'me',
    'my',
    'myself',
    'we',
    'our',
    'ours',
    'ourselves',
    'you',
    'your',
    'yours',
    'yourself',
    'yourselves',
    'he',
    'him',
    'his',
    'himself',
    'she',
    'her',
    'hers',
    'herself',
    'it',
    'its',
    'itself',
    'they',
    'them',
    'their',
    'theirs',
    'themselves',
    'what',
    'which',
    'who',
    'whom',
    'this',
    'that',
    'these',
    'those',
    'am',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'having',
    'do',
    'does',
    'did',
    'doing',
    'a',
    'an',
    'the',
    'and',
    'but',
    'if',
    'or',
    'because',
    'as',
    'until',
    'while',
    'of',
    'at',
    'by',
    'for',
    'with',
    'about',
    'against',
    'between',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'to',
    'from',
    'up',
    'down',
    'in',
    'out',
    'on',
    'off',
    'over',
    'under',
    'again',
    'further',
    'then',
    'once',
    'here',
    'there',
    'when',
    'where',
    'why',
    'how',
    'all',
    'any',
    'both',
    'each',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'nor',
    'not',
    'only',
    'own',
    'same',
    'so',
    'than',
    'too',
    'very',
    's',
    't',
    'can',
    'will',
    'just',
    'don',
    'should',
    'now',
    'says',
    'said',
    'near',
    'could',
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

// Create a file
export async function generateFile(keywords: string[]): Promise<any> {
  // BONUS: Generate summary or insights
  const summary = await generateSummary(keywords);
  const listOfKeywords = keywords.join(', ');
  const report = `Top Keywords: ${keywords.join(', ')}. The summary of the keywords are the following: ${summary}`;
  try {
    // Write the report to a file called 'keyword-report.txt'
    await fs.writeFile('keyword-report.txt', report, 'utf-8');
    console.log('Report saved to keyword-report.txt');
  } catch (error) {
    console.error('Error saving report:', error);
  }
}

// Send an email report
export async function sendReportByEmail(keywords: string[]): Promise<any> {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
  const keywordString = keywords.join(', ');
  const msg = {
    to: 'angela.zhou@temporal.io',
    from: 'temporal.hackathon@gmail.com',
    subject: 'Most Common Words from RSS Feed',
    text: `The most common keywords from October's NPR and Yahoo News RSS Feeds are: ${keywordString}`, // Include keywords in text
    html: `<strong>The most common keywords from October's NPR and Yahoo News RSS Feeds are:</strong> ${keywordString}`, // Include keywords in HTML
  };
  sgMail
    .send(msg)
    .then(() => {
      console.log(`Report sent to ${msg.to}`);
    })
    .catch((error) => {
      console.error(error);
    });
}
