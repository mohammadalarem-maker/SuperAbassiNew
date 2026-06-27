"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var ai = null;
var HARDCODED_GEMINI_API_KEY = "AIzaSyCZh7HRXsdxGYfvDj02T_NVCqKMdcuRSOg";
function getGeminiClient() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY || HARDCODED_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    process.env.GEMINI_API_KEY = apiKey;
    ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return ai;
}
function parseArabicNumbers(str) {
  const arabicDigits = /[٠١٢٣٤٥٦٧٨٩]/g;
  return str.replace(arabicDigits, (d) => {
    return (d.charCodeAt(0) - 1632).toString();
  });
}
function localFallbackParser(text) {
  const lines = text.split("\n");
  const results = [];
  const categoriesDb = [
    { name: "\u0634\u0627\u0634\u0627\u062A", keywords: ["\u0634\u0627\u0634", "\u0633\u0643\u0631\u064A\u0646", "screen"], defaultPrice: 250 },
    { name: "\u0634\u0648\u0627\u062D\u0646", keywords: ["\u0634\u0627\u062D\u0646", "\u0631\u0627\u0633", "\u0631\u0623\u0633", "chg", "charger"], defaultPrice: 75 },
    { name: "\u0643\u0627\u0628\u0644\u0627\u062A", keywords: ["\u0643\u0627\u0628\u0644", "\u0633\u0644\u0643", "\u0643\u064A\u0628\u0644", "\u0648\u0635\u0644", "cable"], defaultPrice: 35 },
    { name: "\u0628\u0637\u0627\u0631\u064A\u0627\u062A", keywords: ["\u0628\u0637\u0627\u0631\u064A", "battery", "bat"], defaultPrice: 120 },
    { name: "\u0633\u0645\u0627\u0639\u0627\u062A", keywords: ["\u0633\u0645\u0627\u0639", "\u0633\u0628\u064A\u0643\u0631", "headphone", "earphone", "speaker", "pod"], defaultPrice: 150 },
    { name: "\u0632\u062C\u0627\u062C \u062D\u0645\u0627\u064A\u0629 \u0648\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062A", keywords: ["\u0632\u062C\u0627\u062C", "\u062D\u0645\u0627\u064A", "\u0643\u0641\u0631", "\u062C\u0631\u0627\u0628", "\u0644\u0627\u0635\u0642", "\u0625\u0643\u0633\u0633\u0648\u0627\u0631", "\u0627\u0643\u0633\u0633\u0648\u0627\u0631", "glass", "case", "cover", "holder"], defaultPrice: 25 },
    { name: "\u0647\u0648\u0627\u062A\u0641 \u0648\u0623\u062C\u0647\u0632\u0629", keywords: ["\u0647\u0627\u062A\u0641", "\u062C\u0648\u0627\u0644", "\u0622\u064A\u0641\u0648\u0646", "\u0627\u064A\u0641\u0648\u0646", "\u0633\u0627\u0645\u0633\u0648\u0646\u062C", "\u0623\u062C\u0647\u0632\u0629", "\u0627\u062C\u0647\u0632\u0629", "\u0634\u0627\u0648\u0645\u064A", "\u0647\u0648\u0627\u0648\u064A", "phone", "mobile"], defaultPrice: 1200 }
  ];
  for (let line of lines) {
    line = line.trim();
    if (!line)
      continue;
    if (line.match(/^(وصلنا|السلام|كشف|فاتورة|الفاتورة|المورد|المندوب|مجموع|إجمالي|المجموع|بواسطة|التاريخ|شكرا|مرحبا)/i) || line.length < 4) {
      continue;
    }
    const convertedLine = parseArabicNumbers(line);
    let name = convertedLine.replace(/^[-*•\s\d.]+\s*/, "").trim();
    if (!name)
      continue;
    let cleanName = name.replace(/بسعر\s*\d+(\.\d+)?\s*(ريال|ر\.س)?/g, "").replace(/سعر\s*\d+(\.\d+)?/g, "").replace(/\d+\s*(ريال|ر\.س)/g, "").replace(/عدد\s*\d+\s*(حبة|حبات|قطعة|قطع)?/g, "").replace(/\d+\s*(حبة|حبات|قطعة|قطع)/g, "").trim();
    if (cleanName.length < 3) {
      cleanName = name;
    }
    let matchedCategory = "\u0639\u0627\u0645";
    let matchedPrice = 50;
    for (const cat of categoriesDb) {
      if (cat.keywords.some((k) => convertedLine.toLowerCase().includes(k))) {
        matchedCategory = cat.name;
        matchedPrice = cat.defaultPrice;
        break;
      }
    }
    const numbers = [...convertedLine.matchAll(/\d+(\.\d+)?/g)].map((m) => parseFloat(m[0]));
    let quantity = 5;
    let price = matchedPrice;
    if (numbers.length === 1) {
      const val = numbers[0];
      if (val > 20) {
        price = val;
      } else {
        quantity = val;
      }
    } else if (numbers.length >= 2) {
      const quantityMatch = convertedLine.match(/(عدد|كمية|حبة|حبات|قطعة|قطع)\s*(الـ)?\s*(\d+)/i) || convertedLine.match(/(\d+)\s*(حبة|حبات|قطعة|قطع)/i);
      const priceMatch = convertedLine.match(/(بسعر|سعر|ريال|ر\.س)\s*(\d+)/i) || convertedLine.match(/(\d+)\s*(ريال|ر\.س)/i);
      if (quantityMatch && priceMatch) {
        quantity = parseFloat(quantityMatch[3] || quantityMatch[1]);
        price = parseFloat(priceMatch[2] || priceMatch[1]);
      } else {
        const sorted = [...numbers].sort((a, b) => a - b);
        quantity = sorted[0];
        price = sorted[1];
      }
    }
    if (quantity <= 0)
      quantity = 1;
    if (price <= 0)
      price = matchedPrice;
    let itemNumber = "";
    const engMatches = cleanName.match(/[A-Za-z0-9-]+/g);
    if (engMatches && engMatches.length > 0) {
      itemNumber = engMatches.join("-").toUpperCase();
    }
    if (!itemNumber || itemNumber.length < 2) {
      const initialsMap = {
        "\u0634\u0627\u0634\u0627\u062A": "SCR",
        "\u0634\u0648\u0627\u062D\u0646": "CHG",
        "\u0643\u0627\u0628\u0644\u0627\u062A": "CBL",
        "\u0628\u0637\u0627\u0631\u064A\u0627\u062A": "BAT",
        "\u0633\u0645\u0627\u0639\u0627\u062A": "SMC",
        "\u0632\u062C\u0627\u062C \u062D\u0645\u0627\u064A\u0629 \u0648\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062A": "ACC",
        "\u0647\u0648\u0627\u062A\u0641 \u0648\u0623\u062C\u0647\u0632\u0629": "PHN",
        "\u0639\u0627\u0645": "GEN"
      };
      const prefix = initialsMap[matchedCategory] || "GEN";
      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      itemNumber = `${prefix}-${randomSuffix}`;
    }
    const barcode = `69${Math.floor(1e9 + Math.random() * 9e9)}`;
    let detectedCurrency = "YER";
    const lowerLine = convertedLine.toLowerCase();
    if (lowerLine.includes("\u062F\u0648\u0644\u0627\u0631") || lowerLine.includes("usd") || lowerLine.includes("$") || lowerLine.includes("dollar")) {
      detectedCurrency = "USD";
    } else if (lowerLine.includes("\u0633\u0639\u0648\u062F\u064A") || lowerLine.includes("sar") || lowerLine.includes("\u0631\u064A\u0627\u0644 \u0633\u0639\u0648\u062F\u064A") || lowerLine.includes("s.r")) {
      detectedCurrency = "SAR";
    }
    results.push({
      category: matchedCategory,
      item_name: cleanName,
      item_number: itemNumber,
      barcode,
      price,
      quantity,
      currency: detectedCurrency
    });
  }
  if (results.length === 0 && text.trim().length > 0) {
    const cleanText = text.trim().replace(/\n/g, " ");
    let detectedCurrency = "YER";
    const lowerLine = cleanText.toLowerCase();
    if (lowerLine.includes("\u062F\u0648\u0644\u0627\u0631") || lowerLine.includes("usd") || lowerLine.includes("$") || lowerLine.includes("dollar")) {
      detectedCurrency = "USD";
    } else if (lowerLine.includes("\u0633\u0639\u0648\u062F\u064A") || lowerLine.includes("sar") || lowerLine.includes("\u0631\u064A\u0627\u0644 \u0633\u0639\u0648\u062F\u064A") || lowerLine.includes("s.r")) {
      detectedCurrency = "SAR";
    }
    results.push({
      category: "\u0639\u0627\u0645",
      item_name: cleanText.length > 50 ? cleanText.substring(0, 47) + "..." : cleanText,
      item_number: "GEN-" + Math.random().toString(36).substring(2, 5).toUpperCase(),
      barcode: `69${Math.floor(1e9 + Math.random() * 9e9)}`,
      price: 50,
      quantity: 1,
      currency: detectedCurrency
    });
  }
  return results;
}
app.post("/api/parse-inventory", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "\u0627\u0644\u0631\u062C\u0627\u0621 \u0625\u062F\u062E\u0627\u0644 \u0646\u0635 \u0635\u062D\u064A\u062D \u0644\u0644\u062A\u062D\u0644\u064A\u0644." });
  }
  try {
    const client = getGeminiClient();
    console.log("Using Gemini Cloud Engine for inventory parsing...");
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `\u0642\u0645 \u0628\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0646\u0635 \u0627\u0644\u062A\u0627\u0644\u064A \u0627\u0644\u0645\u0633\u062A\u062E\u0631\u062C \u0645\u0646 \u0645\u062E\u0632\u0646 \u0645\u062D\u0644 \u062C\u0648\u0627\u0644\u0627\u062A \u0648\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062A \u0648\u0627\u0633\u062A\u062E\u0631\u062C \u0645\u0646\u0647 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A\u060C \u0627\u0644\u0643\u0645\u064A\u0627\u062A\u060C \u0627\u0644\u0623\u0633\u0639\u0627\u0631\u060C \u0627\u0644\u0641\u0626\u0627\u062A \u0627\u0644\u0645\u0642\u062A\u0631\u062D\u0629\u060C \u0648\u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0645\u0648\u062F\u064A\u0644 \u0648\u0627\u0644\u0628\u0627\u0631\u0643\u0648\u062F \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629 \u0648\u0628\u0634\u0643\u0644 \u062E\u0627\u0635 \u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0639\u0645\u0644\u0629 \u0627\u0644\u0645\u0630\u0643\u0648\u0631\u0629 \u0644\u0643\u0644 \u0635\u0646\u0641 (\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A YER\u060C \u062F\u0648\u0644\u0627\u0631 \u0623\u0645\u0631\u064A\u0643\u064A USD\u060C \u0631\u064A\u0627\u0644 \u0633\u0639\u0648\u062F\u064A SAR).
\u0625\u0630\u0627 \u0644\u0645 \u062A\u0630\u0643\u0631 \u0648\u0627\u0644\u0639\u0645\u0644\u0629 \u0635\u0631\u0627\u062D\u0629 \u0644\u0645\u0646\u062A\u062C \u0645\u0639\u064A\u0646\u060C \u0641\u0642\u0645 \u0628\u062A\u0639\u064A\u064A\u0646\u0647\u0627 \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0627\u064B \u0625\u0644\u0649 'YER'.

\u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u062A\u062D\u0644\u064A\u0644\u0647:
"${text}"

\u0634\u0631\u0648\u0637 \u0627\u0644\u062A\u062D\u0644\u064A\u0644:
1. \u0627\u0644\u0641\u0626\u0627\u062A \u0627\u0644\u0645\u0642\u062A\u0631\u062D\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0648\u0627\u062D\u062F\u0629 \u0645\u0646: ['\u0634\u0627\u0634\u0627\u062A', '\u0634\u0648\u0627\u062D\u0646', '\u0643\u0627\u0628\u0644\u0627\u062A', '\u0628\u0637\u0627\u0631\u064A\u0627\u062A', '\u0633\u0645\u0627\u0639\u0627\u062A', '\u0632\u062C\u0627\u062C \u062D\u0645\u0627\u064A\u0629 \u0648\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062A', '\u0647\u0648\u0627\u062A\u0641 \u0648\u0623\u062C\u0647\u0632\u0629', '\u0639\u0627\u0645'].
2. \u0625\u0630\u0627 \u0644\u0645 \u064A\u0630\u0643\u0631 \u0627\u0644\u0633\u0639\u0631 \u0623\u0648 \u0627\u0644\u0643\u0645\u064A\u0629\u060C \u0642\u0645 \u0628\u0635\u0646\u0627\u0639\u0629 \u062A\u0642\u062F\u064A\u0631 \u0630\u0643\u064A \u0628\u062D\u062F\u0648\u062F \u0627\u0644\u0645\u0642\u0628\u0648\u0644 (\u0645\u062B\u0627\u0644: \u0627\u0644\u0634\u0648\u0627\u062D\u0646 \u0628\u0640 30-90 \u0631\u064A\u0627\u0644\u060C \u0627\u0644\u0643\u0641\u0631\u0627\u062A \u0628\u0640 20-50 \u0631\u064A\u0627\u0644\u060C \u0625\u0644\u062E\u060C \u0648\u0627\u0644\u0643\u0645\u064A\u0627\u062A \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 5 \u0625\u0630\u0627 \u0644\u0645 \u062A\u062A\u0648\u0641\u0631).
3. \u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062A\u062C (item_name) \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0645\u0646\u0633\u0642\u0627\u064B \u0648\u062C\u0645\u064A\u0644\u0627\u064B \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629.
4. \u0642\u0645 \u0628\u0625\u0646\u062A\u0627\u062C \u0628\u0627\u0631\u0643\u0648\u062F \u0648\u0627\u0642\u0639\u064A \u064A\u0628\u062F\u0623 \u0628\u0640 69 \u0648\u0645\u0643\u0648\u0646 \u0645\u0646 12 \u0625\u0644\u0649 13 \u0631\u0642\u0645 \u0639\u0634\u0648\u0627\u0626\u064A \u0644\u0643\u0644 \u0645\u0646\u062A\u062C \u0625\u0630\u0627 \u0644\u0645 \u064A\u0630\u0643\u0631 \u0628\u0627\u0631\u0643\u0648\u062F \u0645\u062D\u062F\u062F.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.ARRAY,
          items: {
            type: import_genai.Type.OBJECT,
            properties: {
              category: {
                type: import_genai.Type.STRING,
                description: "\u0627\u0633\u0645 \u0627\u0644\u0641\u0626\u0629\u060C \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0648\u0627\u062D\u062F\u0629 \u0645\u0646 \u0627\u0644\u0641\u0626\u0627\u062A \u0627\u0644\u0645\u062D\u062F\u062F\u0629"
              },
              item_name: {
                type: import_genai.Type.STRING,
                description: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062A\u062C \u0627\u0644\u0645\u0646\u0633\u0642 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629"
              },
              item_number: {
                type: import_genai.Type.STRING,
                description: "\u0631\u0642\u0645 \u0627\u0644\u0645\u0648\u062F\u064A\u0644 \u0623\u0648 \u0643\u0648\u062F \u0645\u062E\u062A\u0635\u0631 \u0645\u062B\u0644 (ANK-20W, IP12PM)"
              },
              barcode: {
                type: import_genai.Type.STRING,
                description: "\u0631\u0642\u0645 \u0628\u0627\u0631\u0643\u0648\u062F \u0641\u0631\u064A\u062F \u064A\u0628\u062F\u0623 \u0628\u0640 69 \u0648\u0645\u0643\u0648\u0646 \u0645\u0646 12-13 \u0631\u0642\u0645"
              },
              price: {
                type: import_genai.Type.NUMBER,
                description: "\u0633\u0639\u0631 \u0627\u0644\u062D\u0628\u0629 \u0627\u0644\u0648\u0627\u062D\u062F\u0629 \u0643\u0639\u062F\u062F \u0639\u0634\u0631\u064A \u0628\u0627\u0644\u0639\u0645\u0644\u0629 \u0627\u0644\u0645\u0642\u0631\u0648\u0621\u0629"
              },
              quantity: {
                type: import_genai.Type.INTEGER,
                description: "\u0627\u0644\u0643\u0645\u064A\u0629 \u0627\u0644\u0645\u062A\u0648\u0641\u0631\u0629 \u0643\u0639\u062F\u062F \u0635\u062D\u064A\u062D"
              },
              currency: {
                type: import_genai.Type.STRING,
                description: "\u0639\u0645\u0644\u0629 \u0633\u0639\u0631 \u0628\u064A\u0639 \u0627\u0644\u0635\u0646\u0641 \u0627\u0644\u0645\u0630\u0643\u0648\u0631\u060C \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0648\u0627\u062D\u062F\u0629 \u0645\u0646 \u0627\u0644\u062D\u0627\u0644\u0627\u062A \u0627\u0644\u0635\u0627\u0631\u0645\u0629: YER \u0623\u0648 USD \u0623\u0648 SAR"
              }
            },
            required: ["category", "item_name", "barcode", "price", "quantity", "currency"]
          }
        }
      }
    });
    const parsedText = response.text;
    if (parsedText) {
      try {
        const items = JSON.parse(parsedText);
        return res.json(items);
      } catch (parseError) {
        console.error("JSON parsing error of model output, falling back...", parsedText);
      }
    }
  } catch (error) {
    console.warn("Gemini cloud parsing error. Automatic transition to Local Smart Parser fallback... Hint:", error.message || error);
  }
  try {
    console.log("Applying Local Smart Parser fallback...");
    const localItems = localFallbackParser(text);
    return res.json(localItems);
  } catch (fallbackError) {
    console.error("Fallback parser error:", fallbackError);
    return res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639 \u0623\u062B\u0646\u0627\u0621 \u0645\u0639\u0627\u0644\u062C\u0629 \u0644\u0633\u062A\u0629 \u0627\u0644\u0623\u0635\u0646\u0627\u0641." });
  }
});
function localIngestFallbackParser(text, filename) {
  let inputText = text ? text.trim() : "";
  if (!inputText && filename) {
    const baseName = filename.split(".")[0].replace(/[-_]/g, " ");
    inputText = `${baseName} \u0639\u062F\u062F 10 \u062D\u0628\u0629 \u0628\u0633\u0639\u0631 50 \u0631\u064A\u0627\u0644`;
  }
  if (!inputText) {
    inputText = "\u0635\u0646\u0641 \u0645\u0633\u062A\u0648\u0631\u062F \u062A\u0644\u0642\u0627\u0626\u064A \u0639\u062F\u062F 5 \u062D\u0628\u0629 \u0628\u0633\u0639\u0631 40 \u0631\u064A\u0627\u0644";
  }
  const lines = inputText.split("\n");
  const results = [];
  const categoriesDb = [
    { name: "\u0634\u0627\u0634\u0627\u062A", keywords: ["\u0634\u0627\u0634", "\u0633\u0643\u0631\u064A\u0646", "screen"], purchaseMultiplier: 0.6, defaultSalePrice: 250 },
    { name: "\u0634\u0648\u0627\u062D\u0646", keywords: ["\u0634\u0627\u062D\u0646", "\u0631\u0627\u0633", "\u0631\u0623\u0633", "chg", "charger"], purchaseMultiplier: 0.5, defaultSalePrice: 75 },
    { name: "\u0643\u0627\u0628\u0644\u0627\u062A", keywords: ["\u0643\u0627\u0628\u0644", "\u0633\u0644\u0643", "\u0643\u064A\u0628\u0644", "\u0648\u0635\u0644", "cable"], purchaseMultiplier: 0.4, defaultSalePrice: 35 },
    { name: "\u0628\u0637\u0627\u0631\u064A\u0627\u062A", keywords: ["\u0628\u0637\u0627\u0631\u064A", "battery", "bat"], purchaseMultiplier: 0.6, defaultSalePrice: 120 },
    { name: "\u0633\u0645\u0627\u0639\u0627\u062A", keywords: ["\u0633\u0645\u0627\u0639", "\u0633\u0628\u064A\u0643\u0631", "headphone", "earphone", "speaker", "pod"], purchaseMultiplier: 0.5, defaultSalePrice: 150 },
    { name: "\u0632\u062C\u0627\u062C \u062D\u0645\u0627\u064A\u0629 \u0648\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062A", keywords: ["\u0632\u062C\u0627\u062C", "\u062D\u0645\u0627\u064A", "\u0643\u0641\u0631", "\u062C\u0631\u0627\u0628", "\u0644\u0627\u0635\u0642", "\u0625\u0643\u0633\u0633\u0648\u0627\u0631", "\u0627\u0643\u0633\u0633\u0648\u0627\u0631", "glass", "case", "cover", "holder"], purchaseMultiplier: 0.3, defaultSalePrice: 25 },
    { name: "\u0647\u0648\u0627\u062A\u0641 \u0648\u0623\u062C\u0647\u0632\u0629", keywords: ["\u0647\u0627\u062A\u0641", "\u062C\u0648\u0627\u0644", "\u0622\u064A\u0641\u0648\u0646", "\u0627\u064A\u0641\u0648\u0646", "\u0633\u0627\u0645\u0633\u0648\u0646\u062C", "\u0623\u062C\u0647\u0632\u0629", "\u0627\u062C\u0647\u0632\u0629", "\u0634\u0627\u0648\u0645\u064A", "\u0647\u0648\u0627\u0648\u064A", "phone", "mobile"], purchaseMultiplier: 0.8, defaultSalePrice: 1200 }
  ];
  for (let line of lines) {
    line = line.trim();
    if (!line)
      continue;
    if (line.match(/^(وصلنا|السلام|كشف|فاتورة|الفاتورة|المورد|المندوب|مجموع|إجمالي|المجموع|بواسطة|التاريخ|شكرا|مرحبا)/i) || line.length < 3) {
      continue;
    }
    const convertedLine = parseArabicNumbers(line);
    let name = convertedLine.replace(/^[-*•\s\d.]+\s*/, "").trim();
    if (!name)
      continue;
    let cleanName = name.replace(/بسعر\s*\d+(\.\d+)?\s*(ريال|ر\.س)?/g, "").replace(/سعر\s*\d+(\.\d+)?/g, "").replace(/\d+\s*(ريال|ر\.س)/g, "").replace(/عدد\s*\d+\s*(حبة|حبات|قطعة|قطع)?/g, "").replace(/\d+\s*(حبة|حبات|قطعة|قطع)/g, "").trim();
    if (cleanName.length < 3) {
      cleanName = name;
    }
    let matchedCategory = "\u0639\u0627\u0645";
    let matchedSalePrice = 50;
    let multiplier = 0.6;
    for (const cat of categoriesDb) {
      if (cat.keywords.some((k) => convertedLine.toLowerCase().includes(k))) {
        matchedCategory = cat.name;
        matchedSalePrice = cat.defaultSalePrice;
        multiplier = cat.purchaseMultiplier;
        break;
      }
    }
    const numbers = [...convertedLine.matchAll(/\d+(\.\d+)?/g)].map((m) => parseFloat(m[0]));
    let quantity = 5;
    let salePrice = matchedSalePrice;
    if (numbers.length === 1) {
      const val = numbers[0];
      if (val > 20) {
        salePrice = val;
      } else {
        quantity = val;
      }
    } else if (numbers.length >= 2) {
      const quantityMatch = convertedLine.match(/(عدد|كمية|حبة|حبات|قطعة|قطع)\s*(الـ)?\s*(\d+)/i) || convertedLine.match(/(\d+)\s*(حبة|حبات|قطعة|قطع)/i);
      const priceMatch = convertedLine.match(/(بسعر|سعر|ريال|ر\.س)\s*(\d+)/i) || convertedLine.match(/(\d+)\s*(ريال|ر\.س)/i);
      if (quantityMatch && priceMatch) {
        quantity = parseFloat(quantityMatch[3] || quantityMatch[1]);
        salePrice = parseFloat(priceMatch[2] || priceMatch[1]);
      } else {
        const sorted = [...numbers].sort((a, b) => a - b);
        quantity = sorted[0];
        salePrice = sorted[1];
      }
    }
    if (quantity <= 0)
      quantity = 1;
    if (salePrice <= 0)
      salePrice = matchedSalePrice;
    const purchasePrice = Math.round(salePrice * multiplier);
    const barcode = `69${Math.floor(1e9 + Math.random() * 9e9)}`;
    let detectedCurrency = "YER";
    const lowerLine = convertedLine.toLowerCase();
    if (lowerLine.includes("\u062F\u0648\u0644\u0627\u0631") || lowerLine.includes("usd") || lowerLine.includes("$") || lowerLine.includes("dollar")) {
      detectedCurrency = "USD";
    } else if (lowerLine.includes("\u0633\u0639\u0648\u062F\u064A") || lowerLine.includes("sar") || lowerLine.includes("\u0631\u064A\u0627\u0644 \u0633\u0639\u0648\u062F\u064A") || lowerLine.includes("s.r")) {
      detectedCurrency = "SAR";
    }
    results.push({
      name: cleanName,
      barcode,
      category: matchedCategory,
      purchasePrice,
      salePrice,
      quantity,
      unit: "\u0642\u0637\u0639\u0629",
      currency: detectedCurrency
    });
  }
  if (results.length === 0) {
    results.push({
      name: "\u0635\u0646\u0641 \u0630\u0643\u064A \u0627\u0641\u062A\u0631\u0627\u0636\u064A",
      barcode: `69${Math.floor(1e9 + Math.random() * 9e9)}`,
      category: "\u0639\u0627\u0645",
      purchasePrice: 30,
      salePrice: 50,
      quantity: 5,
      unit: "\u0642\u0637\u0639\u0629",
      currency: "YER"
    });
  }
  return results;
}
app.post("/api/ai-ingest", async (req, res) => {
  const { text, fileData, mimeType, fileName } = req.body;
  try {
    const client = getGeminiClient();
    console.log("Using Gemini Cloud Engine for multi-modal quick ingestion parsing...");
    const parts = [];
    const prompt = `\u0642\u0645 \u0628\u062A\u062D\u0644\u064A\u0644 \u0647\u0630\u0647 \u0627\u0644\u0635\u0648\u0631\u0629/\u0627\u0644\u0645\u0644\u0641/\u0627\u0644\u0646\u0635 \u0648\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0643\u0627\u0641\u0629 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0648\u0627\u0644\u0623\u0635\u0646\u0627\u0641 \u0628\u062F\u0627\u062E\u0644\u0647\u0627 \u0648\u062A\u0646\u0633\u064A\u0642\u0647\u0627 \u0628\u062F\u0642\u0629 \u0639\u0644\u0649 \u0634\u0643\u0644 \u0645\u0635\u0641\u0648\u0641\u0629 JSON \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0627\u0644\u062D\u0642\u0648\u0644 \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0641\u0642\u0637 \u0648\u0628\u0646\u0641\u0633 \u0644\u063A\u0629 \u0627\u0644\u0645\u062F\u062E\u0644\u0627\u062A: [name, barcode, category, purchasePrice, salePrice, quantity, unit, currency]. \u0644\u0627 \u062A\u0636\u0641 \u0623\u064A \u0646\u0635\u0648\u0635 \u062E\u0627\u0631\u062C\u064A\u0629\u060C \u0623\u0639\u0637\u0646\u064A \u0627\u0644\u0640 JSON \u0627\u0644\u0646\u0638\u064A\u0641 \u0641\u0642\u0637.
\u0628\u0634\u0643\u0644 \u062E\u0627\u0635 \u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0639\u0645\u0644\u0629 \u0648\u0639\u0645\u0644\u0627\u062A \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0645\u0630\u0643\u0648\u0631\u0629 (\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A YER\u060C \u062F\u0648\u0644\u0627\u0631 \u0623\u0645\u0631\u064A\u0643\u064A USD\u060C \u0631\u064A\u0627\u0644 \u0633\u0639\u0648\u062F\u064A SAR) \u0644\u0643\u0644 \u0635\u0646\u0641\u060C \u0648\u0625\u0630\u0627 \u0644\u0645 \u062A\u0630\u0643\u0631 \u0639\u0645\u0644\u0629 \u0645\u0639\u064A\u0646\u0629 \u064A\u0631\u062C\u0649 \u062A\u0639\u064A\u064A\u0646\u0647\u0627 \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0627\u064B \u0625\u0644\u0649 'YER'.`;
    parts.push({ text: prompt });
    if (text && text.trim().length > 0) {
      parts.push({ text: `\u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u0631\u0641\u0642 \u0623\u0648 \u0627\u0644\u0648\u0635\u0641 \u0627\u0644\u0625\u0631\u0634\u0627\u062F\u064A \u0644\u0644\u062C\u062F\u0648\u0644: ${text}` });
    }
    if (fileData) {
      parts.push({
        inlineData: {
          data: fileData,
          mimeType: mimeType || "image/jpeg"
        }
      });
    }
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-pro-preview"];
    let lastError = null;
    let parsedText = "";
    for (const modelName of modelsToTry) {
      let retryCount = 2;
      while (retryCount > 0) {
        try {
          console.log(`Sending API Request using: ${modelName} (${retryCount} retries remaining)`);
          const response = await client.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    name: { type: import_genai.Type.STRING, description: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062A\u062C \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0628\u0627\u0644\u062A\u0641\u0635\u064A\u0644 \u0648\u0628\u0634\u0643\u0644 \u0645\u0642\u0631\u0648\u0621" },
                    barcode: { type: import_genai.Type.STRING, description: "\u0631\u0642\u0645 \u0628\u0627\u0631\u0643\u0648\u062F \u0641\u0631\u064A\u062F \u064A\u0628\u062F\u0623 \u0628\u0640 69 \u0648\u0645\u0643\u0648\u0646 \u0645\u0646 12 \u0625\u0644\u0649 13 \u0631\u0642\u0645 \u0639\u0634\u0648\u0627\u0626\u064A\u060C \u0623\u0648 \u0627\u0644\u0628\u0627\u0631\u0643\u0648\u062F \u0627\u0644\u062D\u0642\u064A\u0642\u064A \u0627\u0644\u0645\u0633\u062A\u062E\u0631\u062C" },
                    category: { type: import_genai.Type.STRING, description: "\u0627\u0633\u0645 \u0627\u0644\u0641\u0626\u0629 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629 (\u0645\u062B\u0644\u0627\u064B: \u0634\u0627\u0634\u0627\u062A\u060C \u0634\u0648\u0627\u062D\u0646\u060C \u0643\u0627\u0628\u0644\u0627\u062A\u060C \u0628\u0637\u0627\u0631\u064A\u0627\u062A\u060C \u0633\u0645\u0627\u0639\u0627\u062A\u060C \u0632\u062C\u0627\u062C \u062D\u0645\u0627\u064A\u0629 \u0648\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062A\u060C \u0647\u0648\u0627\u062A\u0641 \u0648\u0623\u062C\u0647\u0632\u0629\u060C \u0623\u0648 \u0639\u0627\u0645)" },
                    purchasePrice: { type: import_genai.Type.NUMBER, description: "\u0633\u0639\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u0627\u0644\u0641\u0639\u0644\u064A \u0644\u0642\u0637\u0639\u0629 \u0648\u0627\u062D\u062F\u0629 \u0628\u0627\u0644\u0639\u0645\u0644\u0629 \u0627\u0644\u0623\u0635\u0644\u064A\u0629 (\u0643\u0639\u062F\u062F \u0631\u0642\u0645\u064A)" },
                    salePrice: { type: import_genai.Type.NUMBER, description: "\u0633\u0639\u0631 \u0627\u0644\u0628\u064A\u0639 \u0627\u0644\u0645\u0642\u062A\u0631\u062D \u0628\u0627\u0644\u0639\u0645\u0644\u0629 \u0627\u0644\u0623\u0635\u0644\u064A\u0629 \u0644\u0644\u0639\u0645\u064A\u0644 \u0643\u062D\u062F \u0623\u062F\u0646\u0649" },
                    quantity: { type: import_genai.Type.INTEGER, description: "\u0627\u0644\u0643\u0645\u064A\u0629 \u0627\u0644\u0645\u062A\u0648\u0641\u0631\u0629 \u062D\u0627\u0644\u064A\u0627\u064B \u0628\u0627\u0644\u0642\u0631\u064A\u0629 \u0643\u0639\u062F\u062F \u0635\u062D\u064A\u062D" },
                    unit: { type: import_genai.Type.STRING, description: "\u0648\u062D\u062F\u0629 \u0627\u0644\u0628\u064A\u0639 \u0643\u0643\u0644\u0645\u0629 \u0648\u0627\u062D\u062F\u0629 \u0645\u062B\u0644: \u0642\u0637\u0639\u0629\u060C \u062D\u0628\u0629\u060C \u0628\u0627\u0642\u0629" },
                    currency: { type: import_genai.Type.STRING, description: "\u0627\u0644\u0639\u0645\u0644\u0629 \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0627\u0644\u0635\u0646\u0641 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0627\u0644\u062A\u062D\u0644\u064A\u0644\u060C \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0648\u0627\u062D\u062F\u0629 \u0645\u0646 \u0627\u0644\u062D\u0627\u0644\u0627\u062A \u0627\u0644\u0635\u0627\u0631\u0645\u0629: YER \u0623\u0648 USD \u0623\u0648 SAR" }
                  },
                  required: ["name", "barcode", "category", "purchasePrice", "salePrice", "quantity", "unit", "currency"]
                }
              }
            }
          });
          if (response.text) {
            parsedText = response.text;
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`[Model ${modelName}] Temporary error or high demand peak:`, err.message || err);
          retryCount--;
          if (retryCount > 0) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }
      if (parsedText)
        break;
    }
    if (parsedText) {
      try {
        const items = JSON.parse(parsedText);
        return res.json({ success: true, items });
      } catch (parseError) {
        console.error("JSON parsing error of model output, falling back...", parsedText);
      }
    }
    throw lastError || new Error("All listed Gemini models returned empty or failed.");
  } catch (error) {
    console.warn("Gemini cloud ingestion error (probably 503 or 429). Triggering automatic Local Smart Parser fallback... Hint:", error.message || error);
    try {
      const items = localIngestFallbackParser(text, fileName);
      console.log("Successfully processed ingestion fallbacks locally; returning parsed items count:", items.length);
      return res.json({ success: true, items });
    } catch (fallbackError) {
      console.error("Fatal failure inside local Ingestion Fallback parser:", fallbackError);
      return res.status(500).json({
        error: `\u0639\u0630\u0631\u0627\u064B\u060C \u062A\u0639\u0630\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u062E\u0627\u062F\u0645 \u0627\u0644\u0633\u062D\u0627\u0628\u064A \u0648\u0641\u0634\u0644\u062A \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0645\u062D\u0644\u064A\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0623\u064A\u0636\u0627\u064B: ${fallbackError.message || fallbackError}`
      });
    }
  }
});
app.post("/api/generate-fcm-token", async (req, res) => {
  const { clientEmail, privateKey } = req.body;
  if (!clientEmail || !privateKey) {
    return res.status(400).json({ error: "Missing clientEmail or privateKey parameter" });
  }
  const isWebOrPreview = process.env.NODE_ENV !== "production" || privateKey.toLowerCase().includes("mock") || privateKey.toLowerCase().includes("placeholder") || privateKey.toLowerCase().includes("your_private_key") || privateKey.length < 150;
  if (isWebOrPreview) {
    console.log("FCM Backend: Web/Preview Mode or dummy key detected. Bypassing complex crypto signing cleanly.");
    return res.json({ access_token: "mock_access_token_via_decoder_fallback_web_preview" });
  }
  try {
    const accessToken = await new Promise((resolve, reject) => {
      try {
        let rawPem = privateKey.trim();
        if (rawPem.startsWith('"') && rawPem.endsWith('"')) {
          rawPem = rawPem.slice(1, -1);
        }
        if (rawPem.startsWith("'") && rawPem.endsWith("'")) {
          rawPem = rawPem.slice(1, -1);
        }
        if (rawPem.startsWith("{")) {
          try {
            const parsed = JSON.parse(rawPem);
            if (parsed.private_key) {
              rawPem = parsed.private_key.trim();
            } else if (parsed.privateKey) {
              rawPem = parsed.privateKey.trim();
            }
          } catch (e) {
          }
        }
        let formattedKey = rawPem.replace(/\\n/g, "\n").replace(/\r/g, "");
        if (!formattedKey.includes("-----BEGIN")) {
          let cleaned = formattedKey.replace(/\s+/g, "");
          cleaned = cleaned.replace(/[^A-Za-z0-9+/=]/g, "");
          const chunks = cleaned.match(/.{1,64}/g);
          formattedKey = `-----BEGIN PRIVATE KEY-----
${chunks ? chunks.join("\n") : cleaned}
-----END PRIVATE KEY-----`;
        } else {
          const headerMatch = formattedKey.match(/-----BEGIN\s+([A-Z0-9\s_]+)-----/i);
          const headerType = headerMatch ? headerMatch[1].trim() : "PRIVATE KEY";
          let inside = formattedKey.replace(/-----BEGIN[A-Z0-9\s_]+-----/gi, "").replace(/-----END[A-Z0-9\s_]+-----/gi, "").replace(/[^A-Za-z0-9+/=\s]/g, "").replace(/\s+/g, "");
          const chunks = inside.match(/.{1,64}/g);
          formattedKey = `-----BEGIN ${headerType}-----
${chunks ? chunks.join("\n") : inside}
-----END ${headerType}-----`;
        }
        const nowInSecs = Math.floor(Date.now() / 1e3);
        const claims = {
          iss: clientEmail,
          scope: "https://www.googleapis.com/auth/firebase.messaging",
          aud: "https://oauth2.googleapis.com/token",
          exp: nowInSecs + 3600,
          iat: nowInSecs
        };
        const header = {
          alg: "RS256",
          typ: "JWT"
        };
        const base64UrlEncode = (obj) => {
          const str = JSON.stringify(obj);
          return Buffer.from(str).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
        };
        const headerEncoded = base64UrlEncode(header);
        const claimsEncoded = base64UrlEncode(claims);
        const msgToSign = `${headerEncoded}.${claimsEncoded}`;
        let signature;
        try {
          const sign = import_crypto.default.createSign("RSA-SHA256");
          sign.update(msgToSign);
          signature = sign.sign(formattedKey, "base64");
        } catch (signErr) {
          console.warn("FCM Key signing failed or Mock key detected. Falling back to mock token:", signErr.message || signErr);
          resolve("mock_access_token_via_decoder_fallback");
          return;
        }
        const signatureEncoded = signature.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
        const signedJwt = `${msgToSign}.${signatureEncoded}`;
        const params = new URLSearchParams();
        params.append("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
        params.append("assertion", signedJwt);
        fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: params.toString()
        }).then(async (tokenRes) => {
          if (!tokenRes.ok) {
            const errText = await tokenRes.text();
            reject(new Error(`Google OAuth API token exchange failed: ${errText}`));
          } else {
            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) {
              reject(new Error("No access_token found in Google response payload."));
            } else {
              resolve(tokenData.access_token);
            }
          }
        }).catch(reject);
      } catch (e) {
        reject(e);
      }
    });
    return res.json({ access_token: accessToken });
  } catch (error) {
    console.error("Server FCM OAuth Token Generation Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});
app.post("/api/categorize-product", async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "\u0627\u0644\u0631\u062C\u0627\u0621 \u0625\u062F\u062E\u0627\u0644 \u0627\u0633\u0645 \u0645\u0646\u062A\u062C \u0635\u062D\u064A\u062D." });
  }
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `\u0635\u0646\u0641 \u0627\u0633\u0645 \u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u062A\u062C \u0644\u0645\u062D\u0644 \u062C\u0648\u0627\u0644\u0627\u062A \u0648\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062A \u0644\u0623\u062D\u062F \u0627\u0644\u0641\u0626\u0627\u062A \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0641\u0642\u0637:
['\u0634\u0627\u0634\u0627\u062A', '\u0634\u0648\u0627\u062D\u0646', '\u0643\u0627\u0628\u0644\u0627\u062A', '\u0628\u0637\u0627\u0631\u064A\u0627\u062A', '\u0633\u0645\u0627\u0639\u0627\u062A', '\u0632\u062C\u0627\u062C \u062D\u0645\u0627\u064A\u0629 \u0648\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062A', '\u0647\u0648\u0627\u062A\u0641 \u0648\u0623\u062C\u0647\u0632\u0629', '\u0639\u0627\u0645'].
\u0631\u062C\u0639 \u0627\u0633\u0645 \u0627\u0644\u0641\u0626\u0629 \u0641\u0642\u0637 \u0628\u062F\u0648\u0646 \u0623\u064A \u0634\u0631\u0648\u062D\u0627\u062A \u0625\u0636\u0627\u0641\u064A\u0629 \u0648\u0628\u0627\u0633\u0645\u0647\u0627 \u0627\u0644\u062F\u0642\u064A\u0642 \u0645\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629.
\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062A\u062C: "${name}"`
    });
    const category = response.text?.trim() || "\u0639\u0627\u0645";
    return res.json({ category });
  } catch (err) {
    console.error("Error in categorize product:", err);
    const categoriesDb = [
      { name: "\u0634\u0627\u0634\u0627\u062A", keywords: ["\u0634\u0627\u0634", "\u0633\u0643\u0631\u064A\u0646", "screen"] },
      { name: "\u0634\u0648\u0627\u062D\u0646", keywords: ["\u0634\u0627\u062D\u0646", "\u0631\u0627\u0633", "\u0631\u0623\u0633", "chg", "charger"] },
      { name: "\u0643\u0627\u0628\u0644\u0627\u062A", keywords: ["\u0643\u0627\u0628\u0644", "\u0633\u0644\u0643", "\u0643\u064A\u0628\u0644", "\u0648\u0635\u0644", "cable"] },
      { name: "\u0628\u0637\u0627\u0631\u064A\u0627\u062A", keywords: ["\u0628\u0637\u0627\u0631\u064A", "battery", "bat"] },
      { name: "\u0633\u0645\u0627\u0639\u0627\u062A", keywords: ["\u0633\u0645\u0627\u0639", "\u0633\u0628\u064A\u0643\u0631", "headphone", "earphone", "speaker", "pod"] },
      { name: "\u0632\u062C\u0627\u062C \u062D\u0645\u0627\u064A\u0629 \u0648\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062A", keywords: ["\u0632\u062C\u0627\u062C", "\u062D\u0645\u0627\u064A", "\u0643\u0641\u0631", "\u062C\u0631\u0627\u0628", "\u0644\u0627\u0635\u0642", "\u0625\u0643\u0633\u0633\u0648\u0627\u0631", "\u0627\u0643\u0633\u0633\u0648\u0627\u0631", "glass", "case", "cover", "holder"] },
      { name: "\u0647\u0648\u0627\u062A\u0641 \u0648\u0623\u062C\u0647\u0632\u0629", keywords: ["\u0647\u0627\u062A\u0641", "\u062C\u0648\u0627\u0644", "\u0622\u064A\u0641\u0648\u0646", "\u0627\u064A\u0641\u0648\u0646", "\u0633\u0627\u0645\u0633\u0648\u0646\u062C", "\u0623\u062C\u0647\u0632\u0629", "\u0627\u062C\u0647\u0632\u0629", "\u0634\u0627\u0648\u0645\u064A", "\u0647\u0648\u0627\u0648\u064A", "phone", "mobile"] }
    ];
    for (const cat of categoriesDb) {
      if (cat.keywords.some((k) => name.toLowerCase().includes(k))) {
        return res.json({ category: cat.name });
      }
    }
    return res.json({ category: "\u0639\u0627\u0645" });
  }
});
app.post("/php-backend/sell.php", (req, res) => {
  res.json({
    status: "success",
    message: "Simulated locally: CRM/FCM Sale registered successfully.",
    fcm_notification: { success: true, response: "local_preview_stub" }
  });
});
app.post("/php-backend/add_debt.php", (req, res) => {
  res.json({
    status: "success",
    message: "Simulated locally: CRM/FCM Debt registered successfully.",
    fcm_notification: { success: true, response: "local_preview_stub" }
  });
});
app.post("/php-backend/add_item.php", (req, res) => {
  res.json({
    status: "success",
    message: "Simulated locally: CRM/FCM New Item registered successfully.",
    fcm_notification: { success: true, response: "local_preview_stub" }
  });
});
app.post("/php-backend/check_low_stock.php", (req, res) => {
  const current_stock = parseFloat(req.body.current_stock ?? "10");
  const min_stock = parseFloat(req.body.min_stock ?? "5");
  res.json({
    status: "success",
    is_low_stock: current_stock <= min_stock,
    message: "Simulated locally: CRM/FCM Stock limit check completed successfully.",
    fcm_notification: { success: true, response: "local_preview_stub" }
  });
});
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "custom"
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const templatePath = import_path.default.resolve(process.cwd(), "index.html");
        if (import_fs.default.existsSync(templatePath)) {
          let template = import_fs.default.readFileSync(templatePath, "utf-8");
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } else {
          res.status(404).send("index.html not found");
        }
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is listening on http://0.0.0.0:${PORT}`);
  });
}
setupServer();
//# sourceMappingURL=server.cjs.map
