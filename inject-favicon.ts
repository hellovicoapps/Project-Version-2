import fs from "fs";
import path from "path";

const logoPath = path.join(process.cwd(), "public", "logo.png");
const buffer = fs.readFileSync(logoPath);
const base64 = buffer.toString("base64");
const dataUri = `data:image/png;base64,${base64}`;

const indexPath = path.join(process.cwd(), "index.html");
let indexContent = fs.readFileSync(indexPath, "utf-8");
indexContent = indexContent.replace(/<link rel="icon" type="image\/png" href="[^"]+" \/>/, `<link rel="icon" type="image/png" href="${dataUri}" />`);
fs.writeFileSync(indexPath, indexContent);
console.log("Injected base64 favicon into index.html");
