import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';

/**
 * Public privacy policy page (/privacy-policy).
 *
 * Keep this notice aligned with the actual data flows in the backend, mobile
 * wrapper, and payment integrations. It intentionally does not describe the
 * service as "collecting no data": accounts, profiles, scans, and purchase
 * records are persisted so the product can work across sessions and devices.
 */

const APP_NAME = 'bitezsnap';
const ANDROID_PACKAGE = 'com.bitezsnap.app';
const SUPPORT_EMAIL = 'support@bitezsnap.app';
const LAST_UPDATED = 'August 2, 2026';

const PRIVACY_SECTIONS = [
  {
    id: 'summary',
    title: '1. The short version',
    body: [
      `${APP_NAME} lets you photograph food labels, scan barcodes, and receive an AI-assisted food score. We store the limited information needed to provide your account, saved scan history, personalised results, subscriptions, and security features. This is not a zero-data service.`,
      'We do not sell personal information, use advertising trackers, track you across other apps or websites, or store your card number, CVV, or bank credentials.',
      'Food images and relevant profile details are sent to service providers when you ask us to analyse a product. Some community information is visible to others, as explained below.',
      'We do not voluntarily provide refunds. Refund rights required by law or offered by Google Play or another payment provider still apply. See section 15.',
    ],
  },
  {
    id: 'data-we-collect',
    title: '2. Information we collect and store',
    body: [
      'Account information. We store your email address, display name, account status, and an optional profile picture. If you use Google Sign-In, we also store your Google account identifier. If you use a password, we store only a salted password hash, not the readable password.',
      'Health and personal profile. During setup, the app stores age, gender, height, and weight. You may also provide medical conditions and health goals. These details are used to personalise food analysis and health-related displays.',
      'Scans and food activity. We store the photo or barcode you submit, product details, ingredients, nutrient information, AI-generated scores and explanations, possible side effects, alternatives, serving adjustments, and whether you marked a food as eaten.',
      'Progress and usage. We store scan-quota usage, points, streaks, and login timestamps so account limits, history, and progress features work.',
      'Purchases and subscriptions. We store plan and entitlement status, expiry dates, payment-provider order or payment identifiers, and completed-order status. Payment providers process the underlying payment credentials.',
      'Community content. We store feature requests you submit and votes you cast.',
      'Security information. We process request timestamps and security identifiers derived from network or device information, and we store failed-login counts, lockout timestamps, and hashed refresh-token records to protect accounts and prevent abuse.',
    ],
  },
  {
    id: 'data-we-do-not-collect',
    title: '3. Information we do not collect',
    body: [
      'We do not include advertising SDKs, behavioural analytics SDKs, session-recording tools, heatmaps, tracking pixels, cross-app tracking, or fingerprinting.',
      'We do not request GPS location, contacts, calendars, SMS messages, call logs, the installed-app list, or microphone access.',
      'Camera access is used when you open the scanner. An image is transmitted only when you submit it for analysis or save the resulting scan.',
      'We do not receive or store card numbers, CVVs, or bank-login credentials. Google Play or Razorpay handles that payment information directly.',
    ],
  },
  {
    id: 'visibility',
    title: '4. Information visible to other people',
    body: [
      'Leaderboard. Signed-in users can see the top display names with their points and streaks. You can change your display name in Profile.',
      'Feature requests. A submitted request, its category, status, vote count, and your display name may be visible to anyone who can access the feature-request service. The service response also contains internal account identifiers used for request ownership and voting; it does not include your email address or health profile.',
      'Shared food database. Signed-in users can search product-level results contributed by scans, including product name, brand, ingredients, nutrient values, score, and scan count. Your health profile and scan history are not included in those searchable product records.',
      'Your email address, health profile, personal scan history, profile picture, and billing status are not intentionally displayed to other users.',
    ],
  },
  {
    id: 'use',
    title: '5. How we use information',
    body: [
      'We use information to create and secure your account; authenticate sessions; reset passwords; analyse food; personalise results; save scan history; calculate nutrition totals, BMI, trends, points, and streaks; apply scan limits; process and restore purchases; provide the shared product database and feature board; respond to support requests; and prevent fraud, scraping, and account abuse.',
      'We do not use health information for advertising or sell it to data brokers.',
    ],
  },
  {
    id: 'providers',
    title: '6. Service providers and disclosures',
    body: [
      'Google Gemini processes the photo or product text you submit together with relevant profile details, such as age, health goals, and medical conditions, to generate the requested analysis.',
      'Open Food Facts receives barcode or product-search terms used to retrieve public food information.',
      'Cloudinary hosts food images attached to saved scans.',
      'Google provides optional sign-in, Google Play billing, and Play Integrity signals. Integrity signals are a defence-in-depth risk check and are not a guarantee that a device or app is free from tampering.',
      'RevenueCat manages Android subscription entitlements. Razorpay processes web payments. We receive transaction and entitlement results, not raw card or bank credentials.',
      'Brevo sends transactional messages such as password-reset emails. Render hosts the web application and API. The configured PostgreSQL provider, including Supabase when used in production, stores application records.',
      'These providers process data under their own terms and privacy notices. They may process information in countries other than yours.',
    ],
  },
  {
    id: 'device-storage',
    title: '7. Cookies and on-device storage',
    body: [
      'The web app uses strictly functional authentication and CSRF-protection cookies. Authentication cookies are HttpOnly so page scripts cannot read them. We do not use advertising or analytics cookies.',
      'The browser stores cached copies of your account and profile, including any profile details returned after sign-in, plus your language and theme preference. Clearing site data removes these local copies but does not delete server records.',
      'The Android app stores authentication tokens with the Cordova secure-storage plugin backed by Android security facilities. If secure storage is unavailable, tokens remain in memory only and are not intentionally written to localStorage. Other cached account and preference data may remain in WebView storage until you clear the app data or uninstall the app.',
    ],
  },
  {
    id: 'legal-bases',
    title: '8. Legal bases',
    body: [
      'Where data-protection law requires a legal basis, we rely on providing the service you request, your consent where required for optional health information, our legitimate interests in securing and operating the service, and legal obligations such as accounting and fraud prevention.',
      'You can stop future use of optional health information by clearing it in Profile or deleting your account. This does not make earlier processing unlawful.',
    ],
  },
  {
    id: 'retention',
    title: '9. Retention and account deletion',
    body: [
      'Account, profile, scan, and progress records remain while your account is active because they support history, personalisation, and cross-device access.',
      'Profile > Delete Account schedules database deletion after a 7-day grace period. Signing in during that period cancels the request. After the period, the automated purge removes your user record, profile, medical conditions, health goals, scans, and feature requests that you authored.',
      'Shared product rows remain because they describe food products rather than an individual. References identifying who first or last scanned the product are cleared.',
      'Important current limitation: deleting a scan or account removes the application record and its link to an image, but the automated purge does not currently delete the underlying image asset already uploaded to Cloudinary. Contact us to request deletion of a hosted image copy.',
      'Votes on feature requests authored by other users may remain associated with an internal numeric account identifier after account deletion. Contact us if you want those vote records removed.',
      'Refresh tokens are removed on logout, revocation, or expiry. Security logs and payment records may remain for a limited period where reasonably needed for security, dispute handling, tax, accounting, or other legal requirements.',
    ],
  },
  {
    id: 'rights',
    title: '10. Your choices and rights',
    body: [
      'Depending on where you live, you may have rights to access, correct, export, delete, object to, or restrict use of personal information, withdraw consent, and complain to a data-protection authority.',
      'You can edit many profile details in the app and start account deletion from Profile. For a copy of your data, hosted-image deletion, deletion of remaining vote records, or another privacy request, contact us. We may need to verify that the request relates to your account.',
    ],
  },
  {
    id: 'security',
    title: '11. How we protect information',
    body: [
      'Production services use HTTPS. Passwords are salted and hashed. The web app uses HttpOnly cookies, CSRF protection, schema validation, parameterised database queries, rate limits, and temporary account lockouts after repeated failed sign-in attempts.',
      'The Android build disables cleartext traffic and app backups, and uses secure storage for persistent authentication tokens when available. No system can guarantee absolute security, so use a strong, unique password and contact us if you suspect account misuse.',
    ],
  },
  {
    id: 'children',
    title: "12. Children's privacy",
    body: [
      `${APP_NAME} is not intended for children under 13, or under a higher minimum age where local law requires it. We do not knowingly collect information from a child below the applicable age. A parent or guardian who believes a child has created an account should contact us for deletion.`,
    ],
  },
  {
    id: 'transfers',
    title: '13. International processing',
    body: [
      'Our providers may process information outside your country. Where applicable law requires a transfer safeguard, we rely on the mechanisms made available by the relevant provider and required by law.',
    ],
  },
  {
    id: 'medical-disclaimer',
    title: '14. AI results are not medical advice',
    body: [
      'Food scores, ingredient notes, possible side effects, and alternatives are generated with AI and may be incomplete or wrong. They are general information, not a diagnosis, treatment plan, or substitute for a doctor, pharmacist, or dietitian.',
      'Always read the physical product label. Do not rely on the app to identify allergens or determine whether a food is safe for you.',
    ],
  },
  {
    id: 'refunds',
    title: '15. Payments, cancellation, and refunds',
    body: [
      `${APP_NAME} does not voluntarily offer refunds, partial refunds, or pro-rata credits for unused subscription time, lifetime purchases, or accidental purchases. Purchases are treated as final except where applicable law or the policy of Google Play or another payment provider requires or permits a refund. Your statutory consumer rights are not limited by this policy.`,
      'Cancelling a recurring subscription stops future renewal charges but normally does not refund the current paid period. Premium access generally continues until that period ends.',
      'Android subscriptions must be managed in Google Play. Uninstalling the app or deleting your account does not cancel a Google Play subscription. Cancel it in Google Play first to avoid future charges.',
      'For a Google Play transaction, eligibility and the request process are governed by Google Play refund policies. For a web-payment problem, contact us with the order identifier, but do not send card details.',
    ],
    links: [
      {
        href: 'https://support.google.com/googleplay/answer/2479637',
        label: 'Read Google Play refund policies',
      },
    ],
  },
  {
    id: 'changes',
    title: '16. Changes to this policy',
    body: [
      'We will update this page and its effective date when our practices change. If a change materially affects how we use personal information, we will provide an additional in-app notice where appropriate.',
    ],
  },
  {
    id: 'contact',
    title: '17. Contact',
    body: [
      `bitezsnap is the service covered by this policy. For privacy questions, data requests, account-deletion assistance, or payment support, email ${SUPPORT_EMAIL}.`,
    ],
    links: [
      {
        href: `mailto:${SUPPORT_EMAIL}`,
        label: SUPPORT_EMAIL,
      },
    ],
  },
];

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="legal-page page-transition">
      <header className="legal-page-header">
        <button
          type="button"
          className="legal-back"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'))}
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      </header>

      <main className="legal-page-body">
        <div className="legal-title-row">
          <span className="legal-title-icon" aria-hidden="true">
            <Lock size={22} />
          </span>
          <div>
            <h1>Privacy Policy</h1>
            <p className="legal-updated">Effective and last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        <p className="legal-intro">
          This policy explains how {APP_NAME} handles information in its web app and Android app
          (<code>{ANDROID_PACKAGE}</code>). In this policy, "we", "us", and "our" mean the
          operator of the {APP_NAME} service.
        </p>

        <nav className="legal-toc" aria-label="Privacy policy sections">
          <ul>
            {PRIVACY_SECTIONS.map((section) => (
              <li key={section.id}>
                <button type="button" onClick={() => scrollToSection(section.id)}>
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {PRIVACY_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="legal-section">
            <h2>{section.title}</h2>
            {section.body.map((paragraph, index) => (
              <p key={`${section.id}-${index}`}>{paragraph}</p>
            ))}
            {section.links?.map((link) => (
              <p key={link.href}>
                <a
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
                >
                  {link.label}
                </a>
              </p>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
