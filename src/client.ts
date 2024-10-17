import { Connection, Client } from '@temporalio/client';
import { summarizeRSSFeed } from './workflows';

async function run() {
  // Connect to the default Server location
  const connection = await Connection.connect({ address: 'localhost:7233' });

  const rssFeed = ['https://www.latimes.com/local/rss2.0.xml', 'https://www.yahoo.com/news/rss'];

  const client = new Client({
    connection,
  });

  // We are starting the `summarizeRSSFeed` Workflow
  const handle = await client.workflow.start(summarizeRSSFeed, {
    // We are placing the `example` Workflow on the `rss-summary` task queue. We have a Worker configured to poll for tasks on the `hello-world` task-queue in `worker.ts`.
    taskQueue: 'rss-summary',
    // The `rssFeed` will be the argument provided to the `summarizeRSSFeeds` Workflow.
    args: [rssFeed],
    workflowId: 'rss-summary-workflow'
  });
  console.log(`Started workflow ${handle.workflowId}`);

  // optional: wait for client result
  console.log(await handle.result());
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
