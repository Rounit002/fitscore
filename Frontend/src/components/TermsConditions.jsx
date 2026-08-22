import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

/**
 * Public Terms & Conditions page (/terms-conditions).
 *
 * This is the only place in the app outside the Privacy Policy that contains
 * the full explanation of how AI-driven recommendations work, their
 * limitations, and the medical-advice disclaimer. Every other screen shows
 * only a brief "AI-assisted recommendations" note in the app shell footer.
 */

const APP_NAME = 'bitezsnap';
const ANDROID_PACKAGE = 'com.bitezsnap.app';
const SUPPORT_EMAIL = 'support@bitezsnap.app';
const LAST_UPDATED = 'August 22, 2026';

const TERMS_SECTIONS = [
  {
    id: 'acceptance',
    title: '1. Acceptance of these terms',
    body: [
      `By creating an account, signing in, or otherwise using ${APP_NAME} (the "Service"), you agree to these Terms & Conditions and to the Privacy Policy. If you do not agree, do not use the Service.`,
      'You must be at least 13 years old, or older where local law requires a higher minimum age, to use the Service. By using it, you confirm that you meet the applicable minimum age.',
    ],
  },
  {
    id: 'service',
    title: '2. What the Service does',
    body: [
      `${APP_NAME} lets you photograph food labels, scan barcodes, and receive an AI-assisted score, explanation, and suggested alternatives for packaged food products.`,
      'The Service stores your account, profile, scan history, and progress so the product can personalise results, save history, and work across sessions and devices.',
    ],
  },
  {
    id: 'acceptable-use',
    title: '3. Acceptable use',
    body: [
      'Use the Service only for personal, non-commercial evaluation of food products you have a legitimate reason to scan. Do not abuse the Service, scrape it, attempt to disrupt it, impersonate other people, or use it to harass, harm, or mislead others.',
      'You are responsible for what you upload and for keeping your account credentials secure. The Service is not intended for emergency communication or as a substitute for professional advice.',
    ],
  },
  {
    id: 'ai-recommendations',
    title: '4. AI-driven recommendations',
    body: [
      `${APP_NAME} uses artificial intelligence to analyse the photo, barcode, or product information you submit, together with relevant profile details you have provided, and to return a personalised health score, an explanation of the ingredients, possible side effects, and suggested alternatives.`,
      'These AI-driven outputs are automated recommendations. They are generated for general informational and educational purposes only and may be incomplete, inaccurate, outdated, or unsuitable for your circumstances. The model does not know your full medical history and cannot weigh factors that only a qualified professional can assess.',
    ],
  },
  {
    id: 'medical-disclaimer',
    title: '5. Not medical advice',
    body: [
      'AI-assisted scores, explanations, nutrition estimates, ingredient notes, possible side effects, and suggested alternatives are not medical, nutritional, or dietary advice and do not diagnose, treat, cure, or prevent any condition.',
      'Consult a qualified doctor or registered dietitian before making health or dietary decisions, especially if you have allergies or another medical condition, take medication, are pregnant, or have urgent symptoms. Do not delay or disregard professional advice because of an app result.',
      'Always read and verify the physical product label. Do not rely on the Service to identify allergens or determine whether a food is safe for you. For a medical emergency, contact your local emergency services.',
    ],
  },
  {
    id: 'account',
    title: '6. Your account',
    body: [
      'You are responsible for activity on your account. Keep your password and any sign-in method secure, and tell us if you suspect unauthorised access.',
      'You can update your profile, change your display name, manage notifications, and request account deletion from inside the Service. The deletion flow, including the 7-day grace period and the data it removes, is described in the Privacy Policy.',
    ],
  },
  {
    id: 'subscriptions',
    title: '7. Subscriptions and payments',
    body: [
      'Paid plans unlock extra scans, additional features, or both. Pricing and what each plan includes are shown inside the app before you confirm a purchase and may change over time.',
      `${APP_NAME} does not voluntarily offer refunds, partial refunds, or pro-rata credits for unused subscription time, lifetime purchases, or accidental purchases. Purchases are treated as final except where applicable law or the policy of Google Play or another payment provider requires or permits a refund. Your statutory consumer rights are not limited by this policy.`,
      'Cancelling a recurring subscription stops future renewal charges but normally does not refund the current paid period. Premium access generally continues until that period ends.',
      'Android subscriptions must be managed in Google Play. Uninstalling the app or deleting your account does not cancel a Google Play subscription. Cancel it in Google Play first to avoid future charges.',
    ],
    links: [
      {
        href: 'https://support.google.com/googleplay/answer/2479637',
        label: 'Read Google Play refund policies',
      },
    ],
  },
  {
    id: 'intellectual-property',
    title: '8. Intellectual property',
    body: [
      `The Service, including its design, code, trademarks, and the AI-generated explanations and scoring logic, is owned by ${APP_NAME} or its licensors. You may not copy, redistribute, or create derivative works of the Service except as allowed by these terms or by applicable law.`,
      'You retain ownership of the photos and content you upload. You grant the Service a limited licence to process that content in order to provide the features you ask for, as described in the Privacy Policy.',
    ],
  },
  {
    id: 'third-party',
    title: '9. Third-party services',
    body: [
      'The Service depends on third-party providers, including the AI model, the food-product database, the image host, the email and payment providers, and the application host. Their terms and privacy notices apply in addition to ours, and the Service may be temporarily affected when a third-party service is unavailable.',
    ],
  },
  {
    id: 'disclaimers',
    title: '10. Disclaimers and limitation of liability',
    body: [
      'The Service is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, we disclaim all warranties, express or implied, including warranties of accuracy, fitness for a particular purpose, and non-infringement.',
      'We do our best to make the Service reliable, accurate, and safe, but we cannot guarantee that AI-generated output is complete, correct, or suitable for you. The full medical disclaimer in section 5 applies to every AI result the Service produces.',
      'To the extent permitted by law, our total liability for any claim relating to the Service is limited to the amount you paid us for the Service in the twelve months before the claim, or one hundred US dollars, whichever is greater. We are not liable for indirect, incidental, special, consequential, or punitive damages.',
      'Nothing in these terms limits any liability that cannot be excluded by applicable law.',
    ],
  },
  {
    id: 'termination',
    title: '11. Termination',
    body: [
      'You can stop using the Service at any time and request account deletion from inside the app or via the public deletion-request page.',
      'We may suspend or terminate access if you breach these terms, abuse the Service, or if we are required to do so by law. Where reasonable, we will give you notice and an opportunity to address the issue first.',
    ],
  },
  {
    id: 'changes',
    title: '12. Changes to these terms',
    body: [
      'We may update these terms as the Service evolves. The effective date at the top of this page will change when we do, and if a change materially affects your rights we will provide an additional in-app notice where appropriate. Continued use of the Service after an update means you accept the updated terms.',
    ],
  },
  {
    id: 'governing-law',
    title: '13. Governing law',
    body: [
      'These terms are governed by the laws of the jurisdiction in which the Service operator is established, without regard to conflict-of-law rules. Nothing in this section removes any protection you have under the mandatory laws of your country of residence.',
    ],
  },
  {
    id: 'contact',
    title: '14. Contact',
    body: [
      `For questions about these terms, the Service, or your account, contact us at ${SUPPORT_EMAIL}. The Privacy Policy is published separately on this site.`,
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

export default function TermsConditions() {
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
            <FileText size={22} />
          </span>
          <div>
            <h1>Terms &amp; Conditions</h1>
            <p className="legal-updated">Effective and last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        <p className="legal-intro">
          These Terms &amp; Conditions govern your use of {APP_NAME} in its web app and Android
          app (<code>{ANDROID_PACKAGE}</code>). In these terms, "we", "us", and "our" mean the
          operator of the {APP_NAME} service. Our handling of personal information is
          described separately in the Privacy Policy.
        </p>

        <nav className="legal-toc" aria-label="Terms & Conditions sections">
          <ul>
            {TERMS_SECTIONS.map((section) => (
              <li key={section.id}>
                <button type="button" onClick={() => scrollToSection(section.id)}>
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {TERMS_SECTIONS.map((section) => (
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
