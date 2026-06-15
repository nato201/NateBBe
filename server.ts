import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Lazy-initialized Gemini AI client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY.MISSING");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST Endpoint for AI chat interactions
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid request payload. 'messages' array is required." });
      return;
    }

    // Attempt to retrieve the Gemini client
    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      if (err.message === "GEMINI_API_KEY.MISSING") {
        res.status(500).json({
          error: "API_KEY_REQUIRED",
          message: "Please configure your GEMINI_API_KEY in the Settings > Secrets panel of the AI Studio UI to start chatting."
        });
        return;
      }
      throw err;
    }

    // Format the conversation history for @google/genai Content guidelines
    const contents = messages.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text || "" }],
    }));

    // Generate output from gemini-3.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: `You are "Nat bbe", a legendary, ultra-sleek, witty and warm AI companion.
You think beautifully, communicate clearly, and have an aesthetic, engaging, and dark-themed designer personality.
Always interact using a supportive, encouraging, and intelligent tone.
Use custom, well-formatted markdown (bullet points, italic accents, code highlights where necessary) to make your answers feel gorgeous and highly scannable.
Never sound like basic robotic templates. Express natural, humble human-like personality and charm.`,
      },
    });

    const replyText = response.text || "I apologize, but I couldn't formulate a reply. Let's try saying something else!";
    res.json({ reply: replyText });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      error: "SERVER_ERROR",
      message: error?.message || "An unexpected error occurred while communicating with Nat bbe.",
    });
  }
});

// Paths to configurations and log files
const CONFIG_PATH = path.join(process.cwd(), "morning_config.json");
const LOGS_PATH = path.join(process.cwd(), "morning_logs.json");

// Define Mime message formatting function per RFC 2822
function createMimeMessage(to: string, from: string, subject: string, htmlContent: string, imageBase64: string): string {
  const boundary = "boundary_nat_bbe_" + Date.now();
  const nl = "\r\n";
  const parts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString("base64")}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlContent,
    ``,
    `--${boundary}`,
    `Content-Type: image/png; name="morning_inspiration.png"`,
    `Content-Disposition: attachment; filename="morning_inspiration.png"`,
    `Content-Transfer-Encoding: base64`,
    `Content-ID: <morning_inspiration_image>`,
    ``,
    imageBase64.replace(/(.{76})/g, "$1" + nl),
    ``,
    `--${boundary}--`
  ];

  const rawMessage = parts.join(nl);
  return Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Log writer utility
function addLogEntry(type: "success" | "error", message: string, detail?: string) {
  let logs: any[] = [];
  try {
    if (fs.existsSync(LOGS_PATH)) {
      logs = JSON.parse(fs.readFileSync(LOGS_PATH, "utf8"));
    }
  } catch (err) {
    console.error("Failed to read log file:", err);
  }
  
  logs.unshift({
    timestamp: new Date().toISOString(),
    type,
    message,
    detail: detail || ""
  });
  
  if (logs.length > 50) {
    logs = logs.slice(0, 50);
  }
  
  try {
    fs.writeFileSync(LOGS_PATH, JSON.stringify(logs, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write log file:", err);
  }
}

// Read current config
function getMorningConfig() {
  const defaultConfig = {
    enabled: false,
    timezoneOffset: 420, // default to 420 minutes (7 hours, e.g. Pacific Time)
    timeString: "08:00",
    stylePrompt: "Breathtaking watercolor sunrise over mountains, elegant digital art, warm golden light, peaceful motivational theme",
    recipientEmail: "natomeko@gmail.com",
    accessToken: "",
    lastSentDate: ""
  };
  
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return { ...defaultConfig, ...JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) };
    }
  } catch (err) {
    console.error("Error reading morning config:", err);
  }
  return defaultConfig;
}

// Endpoints for Morning configuration and execution log inspection
app.get("/api/morning-config", (req, res) => {
  const config = getMorningConfig();
  // Sanitize accessToken slightly for security, returning only status of token presence
  res.json({
    enabled: config.enabled,
    timezoneOffset: config.timezoneOffset,
    timeString: config.timeString,
    stylePrompt: config.stylePrompt,
    recipientEmail: config.recipientEmail,
    hasToken: !!config.accessToken,
    lastSentDate: config.lastSentDate
  });
});

app.post("/api/morning-config", (req, res) => {
  try {
    const current = getMorningConfig();
    const updated = {
      enabled: req.body.enabled ?? current.enabled,
      timezoneOffset: req.body.timezoneOffset ?? current.timezoneOffset,
      timeString: req.body.timeString ?? current.timeString,
      stylePrompt: req.body.stylePrompt ?? current.stylePrompt,
      recipientEmail: req.body.recipientEmail ?? current.recipientEmail,
      accessToken: req.body.accessToken !== undefined ? req.body.accessToken : current.accessToken,
      lastSentDate: current.lastSentDate
    };
    
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), "utf-8");
    addLogEntry("success", "Morning delivery settings updated successfully.");
    res.json({ success: true, config: { ...updated, accessToken: undefined, hasToken: !!updated.accessToken } });
  } catch (err: any) {
    res.status(500).json({ error: "FAILED_SAVE", message: err.message });
  }
});

app.get("/api/morning-logs", (req, res) => {
  try {
    if (fs.existsSync(LOGS_PATH)) {
      const logs = JSON.parse(fs.readFileSync(LOGS_PATH, "utf8"));
      res.json(logs);
    } else {
      res.json([]);
    }
  } catch (err: any) {
    res.json([]);
  }
});

// Primary generation + delivery action function
async function executeMorningEmail(config: any): Promise<{ success: boolean; detail?: string }> {
  if (!config.accessToken) {
    throw new Error("No active Google Authorization Token is available. Please authenticate via standard Google Sign-in first.");
  }

  const ai = getGeminiClient();

  // 1. Generate custom text greeting & poem
  let quoteText = "May your morning shine bright with inspiration, logic, and boundless ambition.";
  try {
    const textRes = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate a beautiful, witty and poetic morning greeting. 
      Style target: Witty, warm, and poetic "Nat bbe" personality.
      Keep it short, highly personal and inspiring. Do not use generic corporate phrases.
      Include a short 4-line morning poem celebrating creative focus, technology, or sunrise.`,
    });
    if (textRes && textRes.text) {
      quoteText = textRes.text;
    }
  } catch (err: any) {
    console.error("Failed to generate morning text quote:", err);
    // Continue - non-blocking
  }

  // 2. Generate premium high-fidelity picture
  console.log("Generating picture with style prompt:", config.stylePrompt);
  const imageRes = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          text: config.stylePrompt || "A peaceful sunset watercolor background art piece"
        }
      ]
    }
  });

  let imageBase64: string | null = null;
  if (imageRes.candidates?.[0]?.content?.parts) {
    for (const part of imageRes.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        imageBase64 = part.inlineData.data;
        break;
      }
    }
  }

  if (!imageBase64) {
    throw new Error("Gemini Image Generator failed to return valid image bytes for style prompt: " + config.stylePrompt);
  }

  // 3. Construct HTML email body
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; padding: 0; background-color: #050505; color: #d4d4d8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .card { max-width: 600px; margin: 40px auto; background-color: #0b0b0e; border: 1px solid #1f1f2e; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }
        .header { padding: 35px 40px; text-align: center; border-bottom: 1px solid #181825; background: linear-gradient(135deg, #131221 0%, #06405c 100%); }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0 0; font-size: 11px; color: #22d3ee; font-family: monospace; text-transform: uppercase; letter-spacing: 2.5px; }
        .content { padding: 40px; line-height: 1.6; font-size: 15px; }
        .quote { font-style: italic; color: #f4f4f5; font-size: 15px; border-left: 3px solid #22d3ee; padding-left: 18px; margin: 25px 0; line-height: 1.8; background-color: #111116; padding-top: 12px; padding-bottom: 12px; border-radius: 0 8px 8px 0; }
        .image-container { margin: 30px 0; border-radius: 12px; overflow: hidden; border: 1px solid #1f1f2e; background-color: #050505; }
        .image-container img { width: 100%; height: auto; display: block; }
        .footer { padding: 25px; text-align: center; font-size: 11px; color: #52525b; border-top: 1px solid #181825; background-color: #07070a; }
        .footer a { color: #22d3ee; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Nat bbe morning companion</h1>
          <p>Visual Intelligence Synchronized</p>
        </div>
        <div class="content">
          <p>Greetings,</p>
          <p>I have synthesized a dedicated visual work of art alongside an original message to catalyze your thoughts and boost your morning energy:</p>
          
          <div class="quote">
            ${quoteText.replace(/\n/g, "<br>")}
          </div>
          
          <div class="image-container">
            <img src="cid:morning_inspiration_image" alt="Daily synthesized theme" />
          </div>
          
          <p>Engage your focus, conquer beautiful challenges, and bring your ideas to life.</p>
          <p>Warmly,<br><strong>Nat bbe Engine</strong></p>
        </div>
        <div class="footer">
          <p>Sent with authorization via Gmail API and Gemini • <a href="https://ai.studio/build">Google AI Studio Applet</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  // 4. Send via Gmail REST API
  const mimeMessage = createMimeMessage(config.recipientEmail, "me", "Your Premium Morning Inspiration", htmlContent, imageBase64);
  const gmailRes = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      raw: mimeMessage
    })
  });

  if (!gmailRes.ok) {
    const errorBody = await gmailRes.text();
    throw new Error(`Gmail Send API rejected request with status ${gmailRes.status}: ${errorBody}`);
  }

  return { success: true };
}

// Immediately sends a test email
app.post("/api/morning-send-test", async (req, res) => {
  try {
    const config = getMorningConfig();
    // Support temporary direct token override from body
    if (req.body.accessToken) {
      config.accessToken = req.body.accessToken;
    }
    
    if (req.body.recipientEmail) {
      config.recipientEmail = req.body.recipientEmail;
    }
    
    if (req.body.stylePrompt) {
      config.stylePrompt = req.body.stylePrompt;
    }

    addLogEntry("success", "Manually triggered morning generation started...");
    
    const outcome = await executeMorningEmail(config);
    addLogEntry("success", `Manual test email successfully dispatched via Gmail API to ${config.recipientEmail}.`);
    
    res.json({ success: true, message: `Email successfully sent to ${config.recipientEmail}!` });
  } catch (error: any) {
    console.error("Test execution failure:", error);
    addLogEntry("error", "Manual morning execution failed", error.message || error.toString());
    res.status(500).json({ error: "EXECUTION_FAILED", message: error.message || "Unknown delivery failure" });
  }
});

// Periodic automated checker loop running on Express server backend
setInterval(async () => {
  try {
    const config = getMorningConfig();
    if (!config.enabled || !config.accessToken) return;

    // Determine current user local time based on their timezoneOffset (in minutes, negative for ahead, positive for behind)
    const nowUtc = Date.now();
    // Offset difference: timezoneOffset is in minutes, e.g. -420 for Pacific Standard Time
    // Adjust UTC milliseconds to the user's localized time value
    const userLocalTime = new Date(nowUtc - (config.timezoneOffset * 60 * 1000));
    const userHours = userLocalTime.getUTCHours();
    const userMinutes = userLocalTime.getUTCMinutes();
    const userDateString = `${userLocalTime.getUTCFullYear()}-${(userLocalTime.getUTCMonth() + 1).toString().padStart(2, "0")}-${userLocalTime.getUTCDate().toString().padStart(2, "0")}`;

    // Map user "timeString" e.g., "08:15"
    const [targetHourStr, targetMinStr] = config.timeString.split(":");
    const targetHour = parseInt(targetHourStr || "8", 10);
    const targetMin = parseInt(targetMinStr || "0", 10);

    // If it is the correct hour and we are within +/- 1 minute of the target minute
    if (userHours === targetHour && Math.abs(userMinutes - targetMin) <= 1) {
      // Check if already dispatched for this specific user local date
      if (config.lastSentDate !== userDateString) {
        console.log(`[AUTOPILOT SENDER] Daily time window match! Processing automated picture for ${userDateString}...`);
        addLogEntry("success", `Automated delivery triggered for local morning date ${userDateString}.`);
        
        try {
          await executeMorningEmail(config);
          config.lastSentDate = userDateString;
          fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
          addLogEntry("success", `Daily morning email beautifully sent to ${config.recipientEmail}.`);
        } catch (deliveryError: any) {
          console.error("Automated delivery error:", deliveryError);
          addLogEntry("error", `Daily automated sender failed for ${userDateString}.`, deliveryError.message || "Gmail delivery error");
        }
      }
    }
  } catch (cronErr) {
    console.error("Critical error in automated morning background loop:", cronErr);
  }
}, 30000); // Polls every 30 seconds

// Setup Vite Dev Server in Development, static serving in Production
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with active Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nat bbe Server is beautifully running on http://localhost:${PORT}`);
  });
}

initializeServer().catch((err) => {
  console.error("Failed to start server:", err);
});
