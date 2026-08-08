/**
 * @file site.ts
 * @description Single source of truth for the SoB / SphereBrilliq public identity
 * (entity @ids, founder links, official profiles, canonical copy). Keeps the
 * visible content and the structured data referencing the same values.
 */

export const SITE_URL = 'https://spherebrilliq.online';
export const SITE_NAME = 'SoB';
export const ORG_NAME = 'SphereBrilliq';

export const FOUNDER_NAME = 'Ekeh Oghenerurie Chukwuemeka';
export const FOUNDER_ROLE = 'Founder & Lead Developer';

export const FOUNDER_PAGE = `${SITE_URL}/founder`;
export const ABOUT_PAGE = `${SITE_URL}/about`;

export const PERSON_ID = `${FOUNDER_PAGE}#person`;
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const FOUNDER_LINKEDIN = 'https://www.linkedin.com/in/chukwuemekaekeh';
export const FOUNDER_X = 'https://x.com/EkehChukwu34757';
export const SOB_LINKEDIN = 'https://www.linkedin.com/company/sob-spherebrilliq/';

export const LOGO_URL = `${SITE_URL}/android-chrome-512x512.png`;

export const SITE_DESCRIPTION =
  'SoB is a social platform for discovering topics, sharing posts and articles, exploring ideas, and participating in discussions.';

export const HOMEPAGE_OG_TITLE = 'SoB — Where ideas become conversations';
export const FOUNDER_OG_TITLE = `${FOUNDER_NAME} — Founder of SoB`;
