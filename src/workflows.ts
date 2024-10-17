import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

const { fetchRSSFeeds, extractKeywords, generateFile, sendReportByEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: '3 minutes', // Allow a bit more time for fetching and processing
});

// Define a workflow to automate RSS feed summary
export async function summarizeRSSFeed(urls: string[]): Promise<string> {
  // Step 1: Fetch content from RSS feeds
  const contents = await fetchRSSFeeds(urls);

  // Step 2: Extract keywords from the content
  const keywords = await extractKeywords(contents);

  // Step 3 Option 1: Create a summary file
  await generateFile(keywords);
  // Step 3 Option 2: Send an email
  // await sendReportByEmail(keywords);
  return 'Report generated';
}