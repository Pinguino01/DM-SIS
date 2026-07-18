import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, () => {
  console.log(`DM-SIS API escuchando en http://localhost:${env.port}`);
});
