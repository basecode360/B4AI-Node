
import nodemailer from "nodemailer"
import { transporter } from "../configs/nodeMailer.config.js";

const generateCode = () => {
  let code = [];
  for (let i = 0; i < 4; i++) {
    const randomNumber = Math.floor(Math.random() * 10);
    code.push(randomNumber);
  }

  return code.join("");
};

const sentEmail = async (email, subject, emailContent) => {
  try {
    const smtpResponse = await transporter.sendMail({
      from: `"Board Bullets Team" <${process.env.EMAIL_USER}>`,
      to: `${email}`,
      subject: `${subject}`,
      html: `${emailContent}`,
    });

    return smtpResponse;
  } catch (error) {
    return error;
  }
};

// Email template for verification code
const getVerificationEmailTemplate = (code, firstName) => {
  return {
    subject: "Verify Your BoardBullets Account",
    html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Account</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4864AC; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .code-box { background: white; border: 2px solid #4864AC; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; color: #4864AC; letter-spacing: 8px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .button { background: #4864AC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>BOARDBULLETS</h1>
              <p>Learn & Earn</p>
            </div>
            <div class="content">
              <h2>Welcome ${firstName ? firstName : "to BoardBullets"}!</h2>
              <p>Thank you for registering with BoardBullets. To complete your account setup, please verify your email address using the code below:</p>
              
              <div class="code-box">
                <p style="margin: 0; font-size: 16px;">Your Verification Code</p>
                <div class="code">${code}</div>
              </div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This code will expire in 10 minutes</li>
                <li>Enter this code in the verification screen</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
              
              <p>If you have any questions, feel free to contact our support team.</p>
              
              <p>Best regards,<br>The BoardBullets Team</p>
            </div>
            <div class="footer">
              <p>© 2017 BoardBullets, Inc. | Privacy Policy | Terms of Service</p>
            </div>
          </div>
        </body>
        </html>
      `,
    text: `
        Welcome to BoardBullets!
        
        Your verification code is: ${code}
        
        This code will expire in 10 minutes.
        Please enter this code in the verification screen to complete your registration.
        
        If you didn't request this, please ignore this email.
        
        Best regards,
        The BoardBullets Team
      `,
  };
};

// Create nodemailer transporter
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail", // or your email service
    auth: {
      user: process.env.EMAIL_USER, // your email
      pass: process.env.EMAIL_PASSWORD, // your app password
    },
  });
};

// Send verification email
const sendVerificationEmail = async (email, code, firstName) => {
  try {
    const transporter = createEmailTransporter();
    const emailTemplate = getVerificationEmailTemplate(code, firstName);

    const mailOptions = {
      from: {
        name: "BoardBullets",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
};

// Helper function to validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export {
  generateCode,
  sentEmail,
  getVerificationEmailTemplate,
  createEmailTransporter,
  sendVerificationEmail,
  isValidEmail,
};
