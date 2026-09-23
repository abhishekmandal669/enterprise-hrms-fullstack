/**
 * Lexvera Enterprise HRMS Email & Communication Service
 * Handles 72-Hour Onboarding Invites, Password Resets, and System Alerts
 */

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
   * Sends 72-Hour Employee Onboarding & Account Activation Email (ISSUE-035)
   */
  public static async sendEmployeeInvitation(
    employeeEmail: string,
    employeeName: string,
    activationToken: string,
    clientUrl: string = 'http://localhost:5173'
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
