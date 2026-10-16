import { Router, type IRouter } from "express";
import {
  ParseGeminiCommandBody,
  ParseGeminiCommandResponse,
} from "@workspace/api-zod";
import {
  GeminiServiceError,
  parseGeminiTranscript,
} from "../lib/gemini";

const router: IRouter = Router();

router.post("/gemini/parse", async (req, res): Promise<void> => {
  const parsedRequest = ParseGeminiCommandBody.safeParse(req.body);
  if (!parsedRequest.success) {
    req.log.warn(
      { issueCount: parsedRequest.error.issues.length },
      "Rejected invalid Gemini command request",
    );
    res.status(400).json({
      error: "Transcript must be a non-empty string of at most 2000 characters.",
    });
    return;
  }

  try {
    const result = await parseGeminiTranscript(parsedRequest.data.transcript);
    const parsedResponse = ParseGeminiCommandResponse.safeParse(result);
    if (!parsedResponse.success) {
      req.log.error(
        { issueCount: parsedResponse.error.issues.length },
        "Gemini command response failed schema validation",
      );
      res.status(502).json({ error: "Gemini returned an invalid command." });
      return;
    }

    req.log.info({ action: parsedResponse.data.action }, "Gemini command parsed");
    res.json(parsedResponse.data);
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      req.log.warn(
        { statusCode: error.statusCode },
        "Gemini command request failed",
      );
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    req.log.error(
      { errorName: error instanceof Error ? error.name : typeof error },
      "Unexpected Gemini command server error",
    );
    res.status(502).json({ error: "The Gemini service failed unexpectedly." });
  }
});

export default router;
