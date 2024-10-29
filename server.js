const express = require("express");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const cors = require("cors");
const PDFDocument = require("pdfkit");
const fs = require("fs");
dotenv.config();

const app = express();

const allowedOrigins = ["https://abtaaahi.github.io"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());

app.post("/404/api/send-order-email", async (req, res) => {
  const { cartItems, totalAmount, customerDetails } = req.body;

  // Create a new PDF document
  const doc = new PDFDocument();
  const filePath = `./invoice_${Date.now()}.pdf`;

  doc.pipe(fs.createWriteStream(filePath));

  // Title and Customer Details
  doc
    .fontSize(18)
    .fillColor("#333333")
    .text("Order Invoice", { align: "center" })
    .moveDown();
  
  doc
    .fontSize(12)
    .fillColor("#555555")
    .text(`Name: ${customerDetails.name}`)
    .text(`Address: ${customerDetails.address}`)
    .text(`Phone: ${customerDetails.phone}`)
    .text(`Email: ${customerDetails.email}`)
    .moveDown();

  // Order Summary Table
  doc
    .fillColor("#333333")
    .text("Order Summary", { underline: true })
    .moveDown();
  
  doc
    .fontSize(10)
    .fillColor("#000000")
    .text("Product Name", { continued: true })
    .text("Quantity", { continued: true, align: "right" })
    .text("Price", { align: "right" })
    .moveDown();

  cartItems.forEach((item) => {
    doc
      .text(`${item.name}`, { continued: true })
      .text(`x${item.quantity}`, { continued: true, align: "right" })
      .text(`$${item.price * item.quantity}`, { align: "right" });
  });

  // Total Amount
  doc
    .moveDown()
    .fontSize(12)
    .fillColor("#333333")
    .text(`Total Amount: $${totalAmount}`, { align: "right" });

  doc.end();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customerDetails.email,
    bcc: `${process.env.ADMIN_EMAIL_1}, ${process.env.ADMIN_EMAIL_2}`,
    subject: "Order Confirmation with Invoice",
    text: `Dear ${customerDetails.name},\n\nThank you for your purchase! Please find the attached invoice for your order.\n\nBest regards,\nYour Company`,
    attachments: [
      {
        filename: `invoice_${Date.now()}.pdf`,
        path: filePath,
        contentType: "application/pdf",
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    fs.unlinkSync(filePath); // Delete the PDF after sending the email
    res.status(200).send("Order confirmation email with invoice sent.");
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send("Error sending email.");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));