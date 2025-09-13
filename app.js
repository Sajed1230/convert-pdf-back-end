const express = require("express");
const cors = require("cors");
const multer = require("multer");
const nodemailer = require("nodemailer");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const officeToPdf = require("office-to-pdf"); // new library
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());

// ================= PDF Conversion Route =================
app.post("/convert-pdf", upload.array("files"), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).send("No files uploaded try again");
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();

      if (file.mimetype.startsWith("text/")) {
        // TXT or Markdown
        const page = pdfDoc.addPage([595, 842]);
        const { width, height } = page.getSize();
        const text = file.buffer.toString("utf8");
        const lines = text.split("\n");
        let y = height - 50;
        for (const line of lines) {
          page.drawText(line, { x: 50, y, size: 14, font, color: rgb(0, 0, 0) });
          y -= 20;
          if (y < 50) y = height - 50; // new page if needed
        }
      } else if (file.mimetype.startsWith("image/")) {
        // Images
        const page = pdfDoc.addPage([595, 842]);
        const { width, height } = page.getSize();
        let img;
        if (file.mimetype === "image/png") img = await pdfDoc.embedPng(file.buffer);
        else img = await pdfDoc.embedJpg(file.buffer);
        const imgDims = img.scaleToFit(width - 100, height - 100);
        page.drawImage(img, {
          x: (width - imgDims.width) / 2,
          y: (height - imgDims.height) / 2,
          width: imgDims.width,
          height: imgDims.height,
        });
      } else if ([".docx", ".pptx", ".xlsx"].includes(ext)) {
        // Office files → convert to PDF
        const officePdfBuffer = await officeToPdf(file.buffer);
        const officePdfDoc = await PDFDocument.load(officePdfBuffer);
        const copiedPages = await pdfDoc.copyPages(officePdfDoc, officePdfDoc.getPageIndices());
        copiedPages.forEach(page => pdfDoc.addPage(page));
      }
    }

    const finalPdf = await pdfDoc.save();
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=converted.pdf",
      "Content-Length": finalPdf.length,
    });
    res.end(Buffer.from(finalPdf));
  } catch (err) {
    console.error("PDF conversion failed:", err);
    res.status(500).send("PDF conversion failed");
  }
});

// ================= Contact Route =================
app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const htmlMessage = `
      <div style="
        font-family: Arial, sans-serif; max-width: 600px; margin: auto;
        padding: 20px; border-radius: 12px; background: #f4f7f8; border: 1px solid #e0e0e0;
      ">
        <h2 style="color: #05b3a4; text-align: center;">📩 New Contact Message</h2>
        <p><strong>Name:</strong> <span style="color: #049387;">${name}</span></p>
        <p><strong>Email:</strong> <span style="color: #049387;">${email}</span></p>
        <p><strong>Message:</strong></p>
        <p style="background: #e0f7f5; padding: 15px; border-radius: 8px; font-size: 15px; line-height: 1.5;">${message}</p>
        <hr style="border:0;border-top:1px solid #ccc;margin:20px 0;">
        <p style="text-align:center;color:#777;font-size:12px;">— Sent via <span style="color:#05b3a4;font-weight:bold;">Convert to PDF</span></p>
      </div>
    `;

    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: process.env.EMAIL_RECEIVER,
      subject: `📩 New Contact Message from ${name}`,
      html: htmlMessage,
    });

    res.status(200).json({ success: true, message: "Message sent successfully!" });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ success: false, error: "Failed to send message" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
