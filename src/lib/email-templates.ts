type Vars = Record<string, string>;

function render(template: string, vars: Vars): string {
  return template.replaceAll(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

export type EmailTemplate = {
  key: string;
  subject: (vars: Vars) => string;
  html: (vars: Vars) => string;
};

export const TEMPLATES: Record<string, EmailTemplate> = {
  welcome: {
    key: "welcome",
    subject: (v) => `Welcome to ${v.chamberName}`,
    html: (v) => render(
      `<p>Hi {memberName},</p>
       <p>Welcome to <strong>{chamberName}</strong>. Your membership is now active.</p>
       <p>Next steps:</p>
       <ul>
         <li><a href="{appUrl}/c/{chamberSlug}/directory">Browse the member directory</a></li>
         <li><a href="{appUrl}/c/{chamberSlug}/events">See upcoming events</a></li>
       </ul>
       <p>— {chamberName}</p>`,
      v,
    ),
  },
  applicationInvoice: {
    key: "application_invoice",
    subject: (v) => `Your ${v.chamberName} membership invoice`,
    html: (v) => render(
      `<p>Hi {applicantName},</p>
       <p>Your application has been approved. To activate your membership, please complete the payment:</p>
       <p><a href="{paymentUrl}">Pay {amount} {currency}</a></p>
       <p>This link is also reachable at <a href="{landingUrl}">{landingUrl}</a>.</p>
       <p>— {chamberName}</p>`,
      v,
    ),
  },
  rsvpConfirmation: {
    key: "rsvp_confirmation",
    subject: (v) => `You're confirmed for ${v.eventTitle}`,
    html: (v) => render(
      `<p>Hi {memberName},</p>
       <p>You're confirmed for <strong>{eventTitle}</strong> on {eventDate}.</p>
       <p>Location: {eventLocation}</p>
       <p>We'll send a reminder closer to the date.</p>
       <p>— {chamberName}</p>`,
      v,
    ),
  },
  eventReminder: {
    key: "event_reminder",
    subject: (v) => `Reminder: ${v.eventTitle}`,
    html: (v) => render(
      `<p>Hi {memberName},</p>
       <p>Reminder that <strong>{eventTitle}</strong> starts {eventDate}.</p>
       <p>Location: {eventLocation}</p>
       <p>— {chamberName}</p>`,
      v,
    ),
  },
  renewalNotice: {
    key: "renewal_notice",
    subject: (v) => `Your ${v.chamberName} membership renews soon`,
    html: (v) => render(
      `<p>Hi {memberName},</p>
       <p>Your {tierName} membership at {chamberName} expires on {expiresAt}.</p>
       <p>It will auto-renew unless you cancel. <a href="{renewUrl}">Manage renewal</a>.</p>
       <p>— {chamberName}</p>`,
      v,
    ),
  },
};
