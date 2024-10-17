import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './activities';

async function run() {
  // Step 1: Establish a connection with Temporal server.
  const connection = await NativeConnection.connect({
    address: 'localhost:7233',
  });
  // Step 2: Register Workflows and Activities with the Worker.
  const worker = await Worker.create({
    connection,
    // Your Worker is polling the `rss-summary` task queue looking for work to be done. We will add tasks to this task queue in `client.ts`.
    taskQueue: 'rss-summary',
    workflowsPath: require.resolve('./workflows'),
    activities,
  });

  // Step 3: Start accepting tasks on the `hello-world` queue
  //
  // The worker runs until it encounters an unexpected error or the process receives a shutdown 
  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});