import { MongoMemoryServer } from "mongodb-memory-server";
import { spawn } from "child_process";

const mongod = await MongoMemoryServer.create({ instance: { port: 27017, dbName: "jobapp" } });
const uri = mongod.getUri("jobapp");
console.log("Mongo URI:", uri);

process.env.MONGO_URI = uri;

await new Promise((resolve, reject) => {
  const seed = spawn("node", ["src/scripts/seed.js"], { env: { ...process.env }, stdio: "inherit" });
  seed.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("seed failed " + code))));
});

const server = spawn("node", ["src/server.js"], { env: { ...process.env }, stdio: "inherit" });
server.on("exit", (code) => process.exit(code));
