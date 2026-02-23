import { job, enqueue } from "./dist/index.js";

job("slow", async () => {
  console.log("job started");
  await new Promise((r) => setTimeout(r, 4000));
  console.log("job finished");
});

await enqueue("slow", {});
