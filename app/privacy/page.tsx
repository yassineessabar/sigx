import type { Metadata } from 'next'
import LegalLayout from '@/components/legal-layout'

export const metadata: Metadata = {
  title: 'Privacy Policy — SIGX',
  description: 'How SIGX collects, uses, and protects your personal information.',
}

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="March 22, 2026">
      <section>
        <p>
          This Privacy Policy explains how SIGX (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, and protects your personal information when you use our platform. By using SIGX, you agree to the practices described in this policy.
        </p>
      </section>

      <section>
        <h2>Information We Collect</h2>

        <h3>Account Information</h3>
        <p>When you create an account, we collect:</p>
        <ul>
          <li>Full name</li>
          <li>Email address</li>
          <li>Password (stored as a secure hash)</li>
          <li>Referral codes (if applicable)</li>
        </ul>

        <h3>Usage Data</h3>
        <p>We automatically collect information about how you use our platform, including:</p>
        <ul>
          <li>Strategies created, backtested, and deployed</li>
          <li>Feature usage and interaction patterns</li>
          <li>Device type, browser, and IP address</li>
          <li>Session duration and page views</li>
        </ul>

        <h3>Strategy Data</h3>
        <p>
          We store strategy code, backtest results, optimization history, and related metadata generated through your use of the platform. This data is associated with your account.
        </p>

        <h3>Third-Party Authentication</h3>
        <p>
          If you sign in with Google, we receive your name, email address, and profile picture from Google. We do not receive or store your Google password.
        </p>
      </section>

      <section>
        <h2>How We Use Your Information</h2>
        <ul>
          <li><strong>Provide the service:</strong> Generate, compile, backtest, and deploy trading strategies.</li>
          <li><strong>Improve the platform:</strong> Analyze usage patterns to fix bugs and improve features.</li>
          <li><strong>Communicate with you:</strong> Send verification emails, account notifications, and product updates.</li>
          <li><strong>Process credits and billing:</strong> Track credit usage and manage payments.</li>
          <li><strong>Enforce our terms:</strong> Prevent fraud, abuse, and unauthorized access.</li>
        </ul>
      </section>

      <section>
        <h2>AI and Strategy Processing</h2>
        <p>
          When you use our AI strategy builder, your prompts and strategy code are processed by AI models (including Claude by Anthropic) to generate and improve trading strategies. Strategy code is sent to our infrastructure for compilation and backtesting on MetaTrader 5. We do not share your strategy code or prompts with other users.
        </p>
      </section>

      <section>
        <h2>Data Sharing</h2>
        <p>We do not sell your personal information. We may share data with:</p>
        <ul>
          <li><strong>Service providers:</strong> Cloud hosting (Supabase, Vercel), AI processing (Anthropic), and email delivery services — only as needed to operate the platform.</li>
          <li><strong>Legal requirements:</strong> If required by law, regulation, or legal process.</li>
          <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
        </ul>
      </section>

      <section>
        <h2>Data Security</h2>
        <p>
          We implement industry-standard security measures including encrypted connections (TLS), secure password hashing, and access controls. However, no system is 100% secure. You are responsible for keeping your account credentials confidential.
        </p>
      </section>

      <section>
        <h2>Data Retention</h2>
        <p>
          We retain your account data and strategy history for as long as your account is active. You may request deletion of your account and associated data by contacting us. Some data may be retained as required by law or for legitimate business purposes.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          We use essential cookies for authentication and session management. We may use analytics cookies to understand platform usage. You can control cookies through your browser settings.
        </p>
      </section>

      <section>
        <h2>Your Rights</h2>
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Withdraw consent for data processing</li>
          <li>Export your data in a portable format</li>
        </ul>
        <p>To exercise these rights, contact us at <a href="mailto:privacy@sigx.ai">privacy@sigx.ai</a>.</p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          SIGX is not intended for users under 18 years of age. We do not knowingly collect information from minors. If you believe a minor has provided us with personal data, please contact us.
        </p>
      </section>

      <section>
        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material changes by email or through the platform. Continued use after changes constitutes acceptance.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about this policy? Contact us at <a href="mailto:privacy@sigx.ai">privacy@sigx.ai</a>.
        </p>
      </section>
    </LegalLayout>
  )
}
