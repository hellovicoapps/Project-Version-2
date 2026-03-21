import fs from "fs";
import path from "path";

const logoPath = path.join(process.cwd(), "public", "logo.png");
const buffer = fs.readFileSync(logoPath);
const base64 = buffer.toString("base64");

const tsContent = `export const LOGO_BASE64 = "data:image/png;base64,${base64}";\n`;
fs.writeFileSync(path.join(process.cwd(), "src", "logoBase64.ts"), tsContent);
console.log("Logo converted to base64 and saved to src/logoBase64.ts");
