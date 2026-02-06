import express from "express";
import cors from "cors";
import { resolveRouter } from "./routes/resolve.js";
import { getSignerAddress } from "./services/signer.js";

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — CCIP-Read requests come from any origin
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// Health check
app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    service: "voidmarket-ens-gateway",
    signer: getSignerAddress(),
  });
});

// CCIP-Read resolve endpoint
app.use("/resolve", resolveRouter);

app.listen(PORT, () => {
  console.log(`VoidMarket ENS Gateway running on port ${PORT}`);
  console.log(`Trusted signer: ${getSignerAddress()}`);
});
