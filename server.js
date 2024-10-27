const express = require("express");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const cors = require("cors");
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

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const orderSummary = cartItems.map((item) => `${item.name} (x${item.quantity})`).join(", ");
  const message = `
    Order Confirmation
    Name: ${customerDetails.name}
    Address: ${customerDetails.address}
    Phone: ${customerDetails.phone}
    Email: ${customerDetails.email}
    Products: ${orderSummary}
    Total Amount: $${totalAmount}
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER, 
    to: customerDetails.email,
    bcc: `${process.env.ADMIN_EMAIL_1}, ${process.env.ADMIN_EMAIL_2}`,
    subject: "Order Confirmation",
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send("Order confirmation email sent.");
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send("Error sending email.");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));