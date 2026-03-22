import type { Metadata } from 'next'
import LegalLayout from '@/components/legal-layout'

export const metadata: Metadata = {
  title: 'Security — SIGX',
  description: 'How SIGX protects your data, infrastructure, and trading strategies.',
}

export default function SecurityPage() {
  return (
    <LegalLayout title="Security" lastUpdated="March 22, 2026">
      <section>
        <p>
          Security is foundational to SIGX. We handle authentication credentials, trading strategy intellectual property, and billing information. This page outlines the measures we take to protect your data.
        </p>
      </section>

      <section>
        <h2>Authentication & Access</h2>
        <ul>
          <li>All passwords are hashed using industry-standard algorithms — we never store plaintext passwords.</li>
          <li>Authentication is handled through Supabase Auth with secure JWT tokens.</li>
          <li>Session tokens expire automatically and are refreshed transparently.</li>
          <li>All API endpoints require authentication and validate user ownership of resources.</li>
        </ul>
      </section>

      <section>
        <h2>Data Encryption</h2>
        <ul>
          <li><strong>In transit:</strong> All connections use TLS 1.2+ encryption. No data is transmitted over unencrypted channels.</li>
          <li><strong>At rest:</strong> Database storage is encrypted at rest using AES-256 encryption provided by our infrastructure partners.</li>
          <li><strong>API keys:</strong> Third-party API keys and secrets are stored as encrypted environment variables, never in code or database tables.</li>
        </ul>
      </section>

      <section>
        <h2>Infrastructure</h2>
        <ul>
          <li>Our web application runs on Vercel&apos;s edge network with automatic DDoS protection.</li>
          <li>Database services are hosted on Supabase with automated backups and point-in-time recovery.</li>
          <li>MT5 backtesting infrastructure runs on isolated Windows VPS instances with restricted network access.</li>
          <li>All inter-service communication is authenticated with API keys and restricted to known endpoints.</li>
        </ul>
      </section>

      <section>
        <h2>Strategy & Code Protection</h2>
        <ul>
          <li>Your trading strategies and MQL5 code are private by default. Only you can access your strategies unless you explicitly publish them.</li>
          <li>Strategy code is stored in your account and is not shared with other users or used to train AI models.</li>
          <li>When you delete a strategy, all associated code, backtest results, and chat history are permanently removed.</li>
        </ul>
      </section>

      <section>
        <h2>Payment Security</h2>
        <ul>
          <li>All payment processing is handled by Stripe. We never store, process, or have access to your full card numbers.</li>
          <li>Stripe is PCI DSS Level 1 certified — the highest level of security certification in the payments industry.</li>
          <li>Credit purchases and billing are tracked through Stripe&apos;s secure webhooks with signature verification.</li>
        </ul>
      </section>

      <section>
        <h2>Responsible Disclosure</h2>
        <p>
          If you discover a security vulnerability, please report it responsibly:
        </p>
        <ul>
          <li>Email: <a href="mailto:security@sigx.com">security@sigx.com</a></li>
          <li>Include a description of the vulnerability, steps to reproduce, and potential impact.</li>
          <li>We will acknowledge receipt within 24 hours and provide updates on remediation.</li>
          <li>Please do not publicly disclose vulnerabilities before we have had a chance to address them.</li>
        </ul>
      </section>

      <section>
        <h2>Incident Response</h2>
        <p>
          In the event of a security incident that affects user data, we will:
        </p>
        <ul>
          <li>Notify affected users within 72 hours of confirmed impact.</li>
          <li>Provide details about what data was affected and what steps we are taking.</li>
          <li>Implement remediation measures and conduct a post-incident review.</li>
        </ul>
      </section>

      <section>
        <h2>Questions</h2>
        <p>
          For security-related questions or concerns, contact us at <a href="mailto:security@sigx.com">security@sigx.com</a>.
        </p>
      </section>
    </LegalLayout>
  )
}
