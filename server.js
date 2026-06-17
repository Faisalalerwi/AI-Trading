import "dotenv/config";
import express from "express";
import { makeDecision } from "./engine/decisionEngine.js";
import { sendToTradersPost } from "./traderspost/sendSignal.js";
import { log } from "./utils/logger.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
    res.send("AI Trading Server يعمل بنجاح");
});

app.post("/webhook-tv", async (req, res) => {
    try {
        const data = req.body;

        log("وصل Webhook من TradingView", data);

        const decision = await makeDecision(data);

        log("قرار النظام", decision);

        if (decision.decision === "WAIT") {
            return res.json({
                status: "wait",
                decision
            });
        }

        const tradersPostResult = await sendToTradersPost(data, decision);

        return res.json({
            status: "sent",
            decision,
            tradersPostResult
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server Running on Port ${process.env.PORT || 3000}`);
});
