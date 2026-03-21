import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL || 'sigmatictech@gmail.com',
    pass: process.env.SMTP_PASSWORD || '',
  },
})

export async function sendOtpEmail(to: string, code: string) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: #000; border-radius: 8px; padding: 8px 12px;">
          <span style="color: #fff; font-size: 14px; font-weight: 900; letter-spacing: -0.5px;">SX</span>
        </div>
        <p style="color: #888; font-size: 13px; margin-top: 8px;">SIGX</p>
      </div>
      <h1 style="color: #fff; font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 8px;">
        Verify your email
      </h1>
      <p style="color: #888; font-size: 14px; text-align: center; margin-bottom: 32px;">
        Enter this code to complete your sign up
      </p>
      <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #fff; font-family: monospace;">
          ${code}
        </span>
      </div>
      <p style="color: #666; font-size: 12px; text-align: center;">
        This code expires in 10 minutes. If you didn't request this, ignore this email.
      </p>
    </div>
  `

  await transporter.sendMail({
    from: `"SIGX" <${process.env.SMTP_EMAIL || 'sigmatictech@gmail.com'}>`,
    to,
    subject: 'Your SIGX verification code',
    html,
  })
}

export async function sendWelcomeEmail(to: string, name: string) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: #000; border-radius: 8px; padding: 8px 12px;">
          <span style="color: #fff; font-size: 14px; font-weight: 900; letter-spacing: -0.5px;">SX</span>
        </div>
      </div>
      <h1 style="color: #fff; font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 8px;">
        Welcome to SIGX, ${name}!
      </h1>
      <p style="color: #888; font-size: 14px; text-align: center; line-height: 1.6; margin-bottom: 24px;">
        You're all set to build, backtest, and deploy MT5 trading strategies with AI. Start by describing your first strategy idea.
      </p>
      <div style="text-align: center;">
        <a href="https://sigx.app/ai-builder" style="display: inline-block; background: #fff; color: #000; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 10px; text-decoration: none;">
          Start Building
        </a>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: `"SIGX" <${process.env.SMTP_EMAIL || 'sigmatictech@gmail.com'}>`,
    to,
    subject: 'Welcome to SIGX!',
    html,
  })
}
