import nodemailer from 'nodemailer'
import {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
  formatReportAsText,
  formatReportAsHTML,
} from '../cost/report-generator'

interface EmailConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
  to: string
}

class EmailSender {
  private transporter: nodemailer.Transporter | null = null

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const config = this.getEmailConfig()

      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465, // true for 465, false for other ports
        auth: {
          user: config.user,
          pass: config.pass,
        },
      })
    }

    return this.transporter
  }

  private getEmailConfig(): EmailConfig {
    return {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
      to: process.env.NOTIFY_EMAIL || '',
    }
  }

  async send(options: {
    to: string
    subject: string
    text: string
    html: string
  }): Promise<void> {
    const config = this.getEmailConfig()

    if (!config.user || !config.pass) {
      console.warn('[Email] SMTP credentials not configured, skipping email')
      return
    }

    try {
      const info = await this.getTransporter().sendMail({
        from: config.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      })

      console.log(`[Email] Message sent: ${info.messageId}`)
    } catch (error) {
      console.error('[Email] Failed to send email:', error)
      throw error
    }
  }
}

export const emailSender = new EmailSender()

/**
 * 日次レポートをメール送信
 */
export async function sendDailyReport(): Promise<void> {
  const report = await generateDailyReport()

  const config = emailSender['getEmailConfig']()

  await emailSender.send({
    to: config.to,
    subject: `${report.thresholdExceeded ? '⚠️ ' : ''}[github-activity-aggregator] Claude API 日次レポート - ${new Date().toLocaleDateString('ja-JP')}`,
    text: formatReportAsText(report),
    html: formatReportAsHTML(report),
  })

  console.log('[Notifier] Daily report sent')
}

/**
 * 週次レポートをメール送信
 */
export async function sendWeeklyReport(): Promise<void> {
  const report = await generateWeeklyReport()

  const config = emailSender['getEmailConfig']()

  await emailSender.send({
    to: config.to,
    subject: `[github-activity-aggregator] Claude API 週次レポート - ${report.startDate.toLocaleDateString('ja-JP')}の週`,
    text: formatReportAsText(report),
    html: formatReportAsHTML(report),
  })

  console.log('[Notifier] Weekly report sent')
}

/**
 * 月次レポートをメール送信
 */
export async function sendMonthlyReport(): Promise<void> {
  const report = await generateMonthlyReport()

  const config = emailSender['getEmailConfig']()

  await emailSender.send({
    to: config.to,
    subject: `[github-activity-aggregator] Claude API 月次レポート - ${report.startDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}`,
    text: formatReportAsHTML(report),
    html: formatReportAsHTML(report),
  })

  console.log('[Notifier] Monthly report sent')
}

/**
 * 閾値超過アラートをメール送信
 */
export async function sendThresholdAlert(
  period: 'daily' | 'weekly' | 'monthly',
  currentCost: number,
  threshold: number
): Promise<void> {
  const config = emailSender['getEmailConfig']()

  const subject = `⚠️ Claude API Cost Alert: ${period.charAt(0).toUpperCase() + period.slice(1)} Threshold Exceeded`
  const text = `
Claude API Cost Alert
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Period: ${period.toUpperCase()}
Current Cost: $${currentCost.toFixed(4)}
Threshold: $${threshold.toFixed(2)}
Exceeded by: $${(currentCost - threshold).toFixed(4)}

Please review your API usage.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert { background-color: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 5px; }
    .alert h2 { margin-top: 0; color: #856404; }
    .stats { margin: 20px 0; }
    .stat { margin: 10px 0; font-size: 16px; }
    .stat strong { display: inline-block; width: 150px; }
  </style>
</head>
<body>
  <div class="alert">
    <h2>⚠️ Cost Alert: ${period.charAt(0).toUpperCase() + period.slice(1)} Threshold Exceeded</h2>
    <div class="stats">
      <div class="stat"><strong>Period:</strong> ${period.toUpperCase()}</div>
      <div class="stat"><strong>Current Cost:</strong> $${currentCost.toFixed(4)}</div>
      <div class="stat"><strong>Threshold:</strong> $${threshold.toFixed(2)}</div>
      <div class="stat"><strong>Exceeded by:</strong> $${(currentCost - threshold).toFixed(4)}</div>
    </div>
    <p>Please review your API usage.</p>
  </div>
</body>
</html>
  `

  await emailSender.send({
    to: config.to,
    subject,
    text,
    html,
  })

  console.log(`[Notifier] ${period} threshold alert sent`)
}
