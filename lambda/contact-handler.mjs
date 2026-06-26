import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({});

const REQUIRED_ENV = ['TO_EMAIL', 'FROM_EMAIL'];
const ALLOWED_SERVICES = new Set([
  'App modernization',
  'Cloud/DevOps',
  'API/Integration',
  'AI enablement',
  'Other',
]);
const ALLOWED_TIMELINES = new Set(['ASAP', '1-3 months', '3-6 months', '6+ months']);
const BOT_SPAM_KEYWORDS = [
  'viagra',
  'cialis',
  'casino',
  'porn',
  'adult content',
  'free money',
  'make money fast',
  'guaranteed income',
  'payday loan',
  'crypto investment',
  'forex signal',
  'seo package',
  'buy backlinks',
  'guest post',
  'click here',
  'limited time offer',
  'act now',
];
const BOT_SPAM_PATTERNS = [
  /\[url=/i,
  /<a\s+href=/i,
  /\b(?:bit\.ly|tinyurl\.com|rb\.gy|t\.co)\//i,
  /(.)\1{7,}/i,
];
const BOT_USER_AGENT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /axios\//i,
  /httpclient/i,
  /headlesschrome/i,
  /phantomjs/i,
];

function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function jsonResponse(statusCode, body, origin, allowedOrigins) {
  const allowOrigin = allowedOrigins.includes(origin) ? origin : '';
  const headers = {
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };

  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

function normalizeText(value) {
  return String(value || '').trim();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function fail(message) {
  const error = new Error(message);
  error.isValidationError = true;
  throw error;
}

function validatePayload(payload) {
  const fullName = normalizeText(payload.fullName);
  const workEmail = normalizeText(payload.workEmail);
  const companyName = normalizeText(payload.companyName);
  const serviceType = normalizeText(payload.serviceType);
  const timeline = normalizeText(payload.timeline);
  const budgetRange = normalizeText(payload.budgetRange);
  const projectSummary = normalizeText(payload.projectSummary);
  const contactPreference = normalizeText(payload.contactPreference);
  const companySite = normalizeText(payload.companySite);
  const startedAt = Number(payload.startedAt || 0);

  if (companySite) {
    fail('Invalid request.');
  }

  const minSubmitSeconds = Number(process.env.MIN_SUBMIT_SECONDS || 4);
  const elapsedMs = Date.now() - startedAt;
  if (!startedAt || Number.isNaN(elapsedMs) || elapsedMs < minSubmitSeconds * 1000) {
    fail('Please wait a moment before submitting.');
  }

  if (fullName.length < 2 || fullName.length > 80) {
    fail('Full name must be 2-80 characters.');
  }
  if (!isValidEmail(workEmail) || workEmail.length > 120) {
    fail('Work email is invalid.');
  }
  if (companyName.length < 2 || companyName.length > 100) {
    fail('Company name must be 2-100 characters.');
  }
  if (!ALLOWED_SERVICES.has(serviceType)) {
    fail('Service type is invalid.');
  }
  if (!ALLOWED_TIMELINES.has(timeline)) {
    fail('Timeline is invalid.');
  }
  if (projectSummary.length < 20 || projectSummary.length > 1500) {
    fail('Project summary must be 20-1500 characters.');
  }
  if (contactPreference.length > 120) {
    fail('Contact preference is too long.');
  }

  return {
    fullName,
    workEmail,
    companyName,
    serviceType,
    timeline,
    budgetRange,
    projectSummary,
    contactPreference,
  };
}

function containsSpamContent(subject, body) {
  const subjectText = normalizeText(subject).toLowerCase();
  const bodyText = normalizeText(body).toLowerCase();
  const combined = `${subjectText}\n${bodyText}`;

  const hasKeyword = BOT_SPAM_KEYWORDS.some((keyword) => combined.includes(keyword));
  if (hasKeyword) {
    return true;
  }

  const urlMatches = combined.match(/https?:\/\/|www\./gi) || [];
  if (urlMatches.length >= 3) {
    return true;
  }

  return BOT_SPAM_PATTERNS.some((pattern) => pattern.test(combined));
}

function hasSuspiciousRepetition(text) {
  const words = normalizeText(text)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length < 8) {
    return false;
  }

  const uniqueWordCount = new Set(words).size;
  return uniqueWordCount / words.length < 0.35;
}

function runBotChecker(event, subject, body) {
  const userAgent = normalizeText(event?.headers?.['user-agent'] || event?.headers?.['User-Agent']);

  if (!userAgent) {
    fail('Submission blocked by bot checker.');
  }

  if (BOT_USER_AGENT_PATTERNS.some((pattern) => pattern.test(userAgent))) {
    fail('Submission blocked by bot checker.');
  }

  if (containsSpamContent(subject, body)) {
    fail('Your message was flagged by the bot checker. Please revise and try again.');
  }

  if (hasSuspiciousRepetition(body)) {
    fail('Your message was flagged by the bot checker. Please revise and try again.');
  }
}

function buildMessage(data) {
  const lines = [
    'New consulting inquiry from dannellysolutions.com',
    '',
    `Name: ${data.fullName}`,
    `Work email: ${data.workEmail}`,
    `Company: ${data.companyName}`,
    `Service needed: ${data.serviceType}`,
    `Timeline: ${data.timeline}`,
    `Budget range: ${data.budgetRange || 'Not provided'}`,
    `Contact preference: ${data.contactPreference || 'Not provided'}`,
    '',
    'Project summary:',
    data.projectSummary,
  ];

  return lines.join('\n');
}

async function sendInquiryEmail(event, data) {
  const toEmail = process.env.TO_EMAIL;
  const fromEmail = process.env.FROM_EMAIL;

  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      throw new Error(`Missing environment variable: ${key}`);
    }
  }

  const subject = `New Consulting Inquiry | ${data.serviceType} | ${data.companyName}`;
  const body = buildMessage(data);
  runBotChecker(event, subject, body);

  const command = new SendEmailCommand({
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data: body,
        },
      },
    },
    Source: fromEmail,
    ReplyToAddresses: [data.workEmail],
  });

  await ses.send(command);
}

export const handler = async (event) => {
  const allowedOrigins = getAllowedOrigins();
  const origin = event?.headers?.origin || event?.headers?.Origin || '';
  const method = event?.requestContext?.http?.method || event?.httpMethod;

  if (method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed.' }, origin, allowedOrigins);
  }

  if (allowedOrigins.length && !allowedOrigins.includes(origin)) {
    return jsonResponse(403, { ok: false, error: 'Origin is not allowed.' }, origin, allowedOrigins);
  }

  try {
    const payload = event?.body ? JSON.parse(event.body) : {};
    const inquiry = validatePayload(payload);
    await sendInquiryEmail(event, inquiry);
    return jsonResponse(200, { ok: true }, origin, allowedOrigins);
  } catch (error) {
    const isValidationError = error && error.isValidationError;
    const statusCode = isValidationError ? 400 : 500;
    const errorMessage = isValidationError
      ? error.message
      : 'Unable to process request right now. Please try again shortly.';

    console.error('contact_form_error', {
      isValidationError,
      message: error?.message,
      stack: isValidationError ? undefined : error?.stack,
    });

    return jsonResponse(statusCode, { ok: false, error: errorMessage }, origin, allowedOrigins);
  }
};
