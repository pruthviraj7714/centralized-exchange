import startEngineConsumer from "./redisConsumer";
import { startWsServer } from "./ws-server";

async function main() {
    startEngineConsumer();
    startWsServer();
}

main();
