import { MongoMemoryServer } from "mongodb-memory-server";

const mongod = await MongoMemoryServer.create({
  instance: { port: 27017, dbName: "jobapp" },
});

console.log("In-memory MongoDB running at", mongod.getUri());

process.on("SIGINT", async () => {
  await mongod.stop();
  process.exit(0);
});
