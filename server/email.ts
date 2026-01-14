import nodemailer from "nodemailer";

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL || "noreply@leaseo.in";
  const fromName = process.env.SMTP_FROM_NAME || "Leaseo";

  if (!host || !user || !pass) {
    console.warn("[EMAIL] SMTP not configured. Email sending disabled.");
    return null;
  }

  console.log(`[EMAIL] Configuring SMTP: host=${host}, port=${port}, user=${user}`);

  // For port 465 use SSL, for 587 use STARTTLS
  const isSecure = port === 465;
  
  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    // TLS options for better compatibility
    tls: {
      rejectUnauthorized: false, // Accept self-signed certs
      minVersion: 'TLSv1.2',
    },
    // Connection timeout settings
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
};

export async function sendOTPEmail(to: string, code: string): Promise<boolean> {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log(`[EMAIL] Would send OTP ${code} to ${to} (SMTP not configured)`);
    return false;
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL || "noreply@leaseo.in";
  const fromName = process.env.SMTP_FROM_NAME || "Leaseo";

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: "Your Leaseo Verification Code",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ff9a00 0%, #ff7b00 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Leaseo</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Zero Brokerage Property Platform</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">Verification Code</h2>
            <p>Hello,</p>
            <p>Your one-time verification code is:</p>
            
            <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ff9a00;">${code}</span>
            </div>
            
            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              Leaseo - India's Largest Zero Brokerage Property Site<br>
              Pune, Maharashtra | +91 1234567890 | support@leaseo.in
            </p>
          </div>
        </body>
        </html>
      `,
      text: `Your Leaseo verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
    });
    
    console.log(`[EMAIL] OTP sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL] Failed to send OTP to ${to}:`, error);
    return false;
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log(`[EMAIL] Would send welcome email to ${to} (SMTP not configured)`);
    return false;
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL || "noreply@leaseo.in";
  const fromName = process.env.SMTP_FROM_NAME || "Leaseo";

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: "Welcome to Leaseo!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ff9a00 0%, #ff7b00 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Leaseo</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Zero Brokerage Property Platform</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">Welcome, ${name}!</h2>
            <p>Thank you for joining Leaseo - India's largest zero brokerage property platform.</p>
            
            <p>With Leaseo, you can:</p>
            <ul style="color: #555;">
              <li>Find verified rental properties directly from owners</li>
              <li>Save 100% on brokerage fees</li>
              <li>List your property for free</li>
              <li>Connect with genuine tenants and owners</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://leaseo.in/properties" style="background: #ff9a00; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Browse Properties</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              Leaseo - India's Largest Zero Brokerage Property Site<br>
              Pune, Maharashtra | +91 1234567890 | support@leaseo.in
            </p>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to Leaseo, ${name}!\n\nThank you for joining India's largest zero brokerage property platform.\n\nWith Leaseo, you can find verified rental properties directly from owners and save 100% on brokerage fees.\n\nVisit https://leaseo.in/properties to start browsing properties.`,
    });
    
    console.log(`[EMAIL] Welcome email sent to ${to}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL] Failed to send welcome email to ${to}:`, error);
    return false;
  }
}
