/**
 * Nexus Enterprise HRMS Email & Communication Service
 * Handles 72-Hour Onboarding Invites, Password Resets, and System Alerts
 */

import { config } from '../config';

export interface EmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export class EmailService {
  /**
   * Dispatches an email. Logs to console with full formatted preview in dev mode.
   */
  public static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      console.log('\n================== [OUTGOING EMAIL DISPATCH] ==================');
      console.log(`✉️  TO:      ${options.to}`);
      console.log(`📌 SUBJECT: ${options.subject}`);
      console.log('---------------------------------------------------------------');
      console.log(options.textContent || options.htmlContent.replace(/<[^>]*>?/gm, ' '));
      console.log('===============================================================\n');
      return true;
    } catch (error) {
      console.error('Failed to dispatch email:', error);
      return false;
    }
  }

  /**
   * Dispatches direct Employee Onboarding Credentials Email (Nexus Enterprise)
   */
  public static async sendEmployeeCredentials(
    employeeEmail: string,
    employeeName: string,
    employeeCode: string,
    tempPassword: string,
    clientUrl: string = config.frontendUrl || 'http://localhost:5173'
  ): Promise<boolean> {
    const loginLink = `${clientUrl}`;

    const textContent = `
Hello ${employeeName},

Welcome to Nexus Enterprise HRMS!

Your employee account has been created by your HR Administrator.
Here are your official login credentials:

EMPLOYEE CODE:   ${employeeCode}
LOGIN EMAIL:     ${employeeEmail}
PASSWORD:        ${tempPassword}
LOGIN PORTAL:    ${loginLink}

Please log into your workspace and update your password upon first sign-in.
`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #4f46e5; padding: 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
    .cred-box { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .cred-item { margin-bottom: 8px; font-size: 13px; }
    .cred-label { color: #64748b; font-weight: 600; font-size: 11px; text-transform: uppercase; }
    .cred-val { font-family: monospace; font-size: 14px; font-weight: bold; color: #0f172a; }
    .button { display: inline-block; background: #4f46e5; color: #ffffff; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 10px; margin: 16px 0; }
    .footer { padding: 16px 24px; background: #f8fafc; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0;">Welcome to Nexus Enterprise HRMS</h2>
    </div>
    <div class="content">
      <p>Hello <strong>${employeeName}</strong>,</p>
      <p>Your official corporate employee account has been created. You can now access your workspace using the credentials below:</p>
      
      <div class="cred-box">
        <div class="cred-item">
          <div class="cred-label">Employee Code</div>
          <div class="cred-val">${employeeCode}</div>
        </div>
        <div class="cred-item">
          <div class="cred-label">Login Email</div>
          <div class="cred-val">${employeeEmail}</div>
        </div>
        <div class="cred-item" style="margin-bottom:0;">
          <div class="cred-label">Temporary Password</div>
          <div class="cred-val" style="color: #4f46e5;">${tempPassword}</div>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="${loginLink}" class="button">Log In to Workspace &rarr;</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">Or copy this URL into your browser:<br/><code>${loginLink}</code></p>
    </div>
    <div class="footer">
      &copy; 2026 Nexus Enterprise Systems. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

    return this.sendEmail({
      to: employeeEmail,
      subject: '🚀 Welcome to Nexus — Your Official Workspace Credentials',
      textContent,
      htmlContent
    });
  }

  /**
   * Sends 72-Hour Employee Onboarding & Account Activation Email (ISSUE-035)
   */
  public static async sendEmployeeInvitation(
    employeeEmail: string,
    employeeName: string,
    activationToken: string,
    clientUrl: string = config.frontendUrl || 'http://localhost:5173'
  ): Promise<boolean> {
    const activationLink = `${clientUrl}/set-password?token=${activationToken}`;

    const textContent = `
Hello ${employeeName},

Welcome to Nexus Enterprise HRMS!

An account has been created for you by your HR Administrator.
Please click the link below to set your secure password and activate your workspace profile.

ACTIVATION LINK: ${activationLink}

NOTE: This invitation link is valid for 72 hours.
`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #4f46e5; padding: 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
    .button { display: inline-block; background: #4f46e5; color: #ffffff; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 10px; margin: 20px 0; }
    .footer { padding: 16px 24px; background: #f1f5f9; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Welcome to Nexus HRMS</h2>
    </div>
    <div class="content">
      <p>Hello <strong>${employeeName}</strong>,</p>
      <p>You have been invited to join the <strong>Nexus Enterprise HRMS</strong> workspace. Your account has been provisioned and is ready for activation.</p>
      <div style="text-align: center;">
        <a href="${activationLink}" class="button">Activate My Account &rarr;</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">Or copy this URL into your browser:<br/><code>${activationLink}</code></p>
      <p style="font-size: 11px; color: #e11d48; font-weight: bold;">⚠️ This secure invitation token expires in 72 hours.</p>
    </div>
    <div class="footer">
      &copy; 2026 Nexus Enterprise Systems. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

    return this.sendEmail({
      to: employeeEmail,
      subject: '🚀 Welcome to Nexus — Activate Your Account (72h Token)',
      textContent,
      htmlContent
    });
  }
}
