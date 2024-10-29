const express = require("express");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const cors = require("cors");
const pdfMakePrinter = require("pdfmake/src/printer");
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

  // Create order summary for email
  const orderSummary = cartItems
    .map(item => `Product: ${item.name}, Quantity: ${item.quantity}, Price: $${(item.price * item.quantity).toFixed(2)}`)
    .join("\n");

  // Define the PDF document
  const docDefinition = {
    content: [
      { text: 'Order Invoice', style: 'header' },
      {
        text: `Name: ${customerDetails.name}\nAddress: ${customerDetails.address}\nPhone: ${customerDetails.phone}\nEmail: ${customerDetails.email}`,
        margin: [0, 10, 0, 20],
      },
      {
        style: 'tableExample',
        table: {
          widths: ['*', 'auto', 'auto'],
          body: [
            [{ text: 'Product Name', style: 'tableHeader' }, { text: 'Quantity', style: 'tableHeader' }, { text: 'Price', style: 'tableHeader' }],
            ...cartItems.map(item => [item.name, item.quantity, `$${(item.price * item.quantity).toFixed(2)}`]),
            [{ text: 'Total', colSpan: 2 }, {}, `$${totalAmount.toFixed(2)}`],
          ],
        },
      },
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 10],
      },
      tableHeader: {
        bold: true,
        fontSize: 12,
        color: 'white',
        fillColor: '#4CAF50',
        alignment: 'center',
      },
      tableExample: {
        margin: [0, 5, 0, 15],
      },
    },
  };

  // Generate PDF
  const pdfDoc = new pdfMakePrinter({ 
    Roboto: { 
      normal: 'fonts/Roboto-Regular.ttf', 
      bold: 'fonts/Roboto-Medium.ttf', 
      italics: 'fonts/Roboto-Italic.ttf', 
      bolditalics: 'fonts/Roboto-MediumItalic.ttf' 
    } 
  }).createPdf(docDefinition);
  
  const filePath = `./invoice_${Date.now()}.pdf`;
  pdfDoc.getBuffer(async (buffer) => {
    fs.writeFileSync(filePath, buffer);

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
      text: `Dear ${customerDetails.name},\n\nThank you for your purchase! Here are your personal details:\n\nName: ${customerDetails.name}\nAddress: ${customerDetails.address}\nPhone: ${customerDetails.phone}\nEmail: ${customerDetails.email}\n\nHere is the summary of your order:\n\n${orderSummary}\n\nTotal Amount: $${totalAmount.toFixed(2)}\n\nWe will contact you soon. You will get your product in 2-3 working days.\n\nPlease find the attached invoice for your order.\n\nBest regards,\nYour Company`,
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
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));