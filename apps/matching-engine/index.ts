import startEngineConsumer from "./redisConsumer";
import { initializeSubscriber } from "./subscriber";
import { startWsServer } from "./ws-server";

async function main() {
  try {
    console.log('Starting trading engine...');
    
    await initializeSubscriber();
    await startEngineConsumer();
    await startWsServer();
    console.log('All services started successfully!');
  } catch (error) {
    console.error('Failed to start services:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error in main:', error);
  process.exit(1);
});