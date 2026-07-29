import "dotenv/config";
import express from "express";

const app = express();

const PORT = 8181;

app.listen(PORT, () => {
  console.log("Server active on ", PORT);
});
