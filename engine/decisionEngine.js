import { smartScore } from "./smartScoreEngine.js";

export async function makeDecision(data) {
    return smartScore(data);
}