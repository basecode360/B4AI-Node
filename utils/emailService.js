// utils/emailService.js
import { transporter } from "../configs/nodeMailer.config.js";

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // Verify transporter configuration
    await transporter.verify();
    console.log('✅ Email transporter verified and ready');
    
    const mailOptions = {
      from: `"B4AI Team" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || 'Your email client does not support HTML emails. Please use a modern email client.'
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✉️ Email sent successfully:', info.messageId);
    console.log('📧 Email sent to:', to);
    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
};

// Template for welcome emails
export const getWelcomeEmailTemplate = ({ firstName, email, password, role, loginUrl }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .wrapper {
          width: 100%;
          background-color: #f4f4f4;
          padding: 20px 0;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          color: white; 
          padding: 30px 20px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content { 
          padding: 40px 30px;
        }
        .content h2 {
          color: #1e40af;
          margin-top: 0;
          font-size: 24px;
        }
        .button { 
          display: inline-block; 
          padding: 14px 28px; 
          background-color: #2563eb; 
          color: white; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 20px 0;
          font-weight: 600;
          transition: background-color 0.3s;
        }
        .button:hover {
          background-color: #1e40af;
        }
        .credentials { 
          background-color: #f3f4f6; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0;
          border-left: 4px solid #2563eb;
        }
        .credentials p {
          margin: 10px 0;
        }
        .credentials strong {
          color: #1e40af;
        }
        .warning {
          background-color: #fef3c7;
          padding: 15px;
          border-radius: 6px;
          border-left: 4px solid #f59e0b;
          margin: 20px 0;
        }
        .warning p {
          margin: 0;
          color: #92400e;
        }
        .footer { 
          text-align: center; 
          padding: 20px;
          color: #6b7280; 
          font-size: 14px;
          background-color: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 5px 0;
        }
        ul {
          padding-left: 20px;
        }
        ul li {
          margin: 8px 0;
        }
        @media only screen and (max-width: 600px) {
          .content {
            padding: 30px 20px;
          }
          .header h1 {
            font-size: 24px;
          }
          .content h2 {
            font-size: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1>🎓 Welcome to B4AI!</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName || 'User'},</h2>
            
            <p>Great news! Your account has been successfully created by an administrator. You're now part of the B4AI learning community!</p>
            
            <div class="credentials">
              <p><strong>📧 Email:</strong> ${email}</p>
              <p><strong>🔑 Password:</strong> ${password}</p>
              <p><strong>👤 Role:</strong> ${role || 'student'}</p>
            </div>
            
            <div class="warning">
              <p>⚠️ <strong>Important:</strong> For security reasons, please change your password after your first login.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Log In to Your Account</a>
            </div>
            
            <h3>🚀 What's Next?</h3>
            <ul>
              <li>Complete your profile with additional information</li>
              <li>Explore our extensive quiz library</li>
              <li>Track your learning progress</li>
              <li>Connect with other learners in the community</li>
            </ul>
            
            <p>If you have any questions or need assistance getting started, our support team is here to help!</p>
            
            <p>Welcome aboard and happy learning!</p>
          </div>
          <div class="footer">
            <p><strong>The B4AI Team</strong></p>
            <p>© ${new Date().getFullYear()} B4AI. All rights reserved.</p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 10px;">
              This email was sent because an administrator created an account for you. 
              If you believe this was done in error, please contact our support team immediately.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Test email function (for development)
export const sendTestEmail = async (to) => {
  try {
    const result = await sendEmail({
      to,
      subject: 'Test Email from B4AI',
      html: '<h1>Test Email</h1><p>If you received this, your email configuration is working correctly!</p>',
      text: 'Test email - If you received this, your email configuration is working correctly!'
    });
    
    return {
      success: true,
      message: 'Test email sent successfully',
      result
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to send test email',
      error: error.message
    };
  }
};