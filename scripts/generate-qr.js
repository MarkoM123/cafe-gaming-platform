import QRCode from "qrcode";
import fs from "fs";

const tables = ["T1", "T2", "T3", "T4", "T5", "T6"];
const baseUrl = "http://localhost:3000/qr";

fs.mkdirSync("qr-codes", { recursive: true });

(async () => {
  for (const table of tables) {
    const url = `${baseUrl}/${table}`;
    const file = `qr-codes/${table}.png`;
    await QRCode.toFile(file, url, {
      width: 600,
      margin: 2,
    });
    console.log(`QR generated: ${file} ${url}`);
  }
})();
