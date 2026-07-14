/**
 * @elmoorx/ui — Extended Templates (50 additional, total 100)
 * Templates 51-100: more specialized page designs
 */

function defineTemplate(id: string, name: string, category: string, description: string, icon: string) {
  return { id, name, category, description, icon };
}

export const EXTENDED_TEMPLATES = [
  // ── SaaS Specific (10) ─────────────────────────────────────────────────
  defineTemplate('saas-onboarding', 'SaaS Onboarding', 'SaaS', 'Multi-step onboarding wizard', '🎯'),
  defineTemplate('saas-pricing-v2', 'SaaS Pricing V2', 'SaaS', 'Pricing with annual/monthly toggle', '💳'),
  defineTemplate('saas-features', 'SaaS Features', 'SaaS', 'Feature comparison grid', '✨'),
  defineTemplate('saas-integrations', 'Integrations Page', 'SaaS', 'Showcase supported integrations', '🔌'),
  defineTemplate('saas-changelog', 'Changelog', 'SaaS', 'Product update timeline', '📝'),
  defineTemplate('saas-roadmap', 'Product Roadmap', 'SaaS', 'Public roadmap with voting', '🗺️'),
  defineTemplate('saas-status', 'Status Page', 'SaaS', 'System status and uptime', '🟢'),
  defineTemplate('saas-support', 'Support Center', 'SaaS', 'Help center with categories', '🎧'),
  defineTemplate('saas-api-docs', 'API Docs', 'SaaS', 'Interactive API documentation', '📖'),
  defineTemplate('saas-webhooks', 'Webhooks Manager', 'SaaS', 'Configure and test webhooks', '🔗'),

  // ── Marketing (10) ─────────────────────────────────────────────────────
  defineTemplate('mkt-webinar', 'Webinar Landing', 'Marketing', 'Webinar registration page', '🎥'),
  defineTemplate('mkt-ebook', 'Ebook Download', 'Marketing', 'Lead gen ebook download', '📚'),
  defineTemplate('mkt-case-study', 'Case Study', 'Marketing', 'Detailed customer success story', '📊'),
  defineTemplate('mkt-comparison', 'Comparison Page', 'Marketing', 'Elmoorx vs competitors', '⚖️'),
  defineTemplate('mkt-calculator', 'ROI Calculator', 'Marketing', 'Interactive savings calculator', '🧮'),
  defineTemplate('mkt-quiz', 'Quiz Landing', 'Marketing', 'Interactive quiz with results', '❓'),
  defineTemplate('mkt-giveaway', 'Giveaway', 'Marketing', 'Contest entry page', '🎁'),
  defineTemplate('mkt-referral', 'Referral Program', 'Marketing', 'Refer friends and earn', '👥'),
  defineTemplate('mkt-affiliate', 'Affiliate Signup', 'Marketing', 'Affiliate program onboarding', '🤝'),
  defineTemplate('mkt-newsletter-v2', 'Newsletter V2', 'Marketing', 'Premium newsletter signup', '✉️'),

  // ── Admin (10) ─────────────────────────────────────────────────────────
  defineTemplate('admin-users', 'User Management', 'Admin', 'Admin user list with roles', '👥'),
  defineTemplate('admin-roles', 'Roles & Permissions', 'Admin', 'RBAC matrix editor', '🔐'),
  defineTemplate('admin-audit', 'Audit Log', 'Admin', 'System activity log viewer', '📜'),
  defineTemplate('admin-features', 'Feature Flags', 'Admin', 'Toggle features per environment', '🚩'),
  defineTemplate('admin-experiments', 'A/B Tests', 'Admin', 'Experiment results dashboard', '🧪'),
  defineTemplate('admin-billing', 'Billing Admin', 'Admin', 'Customer billing management', '💰'),
  defineTemplate('admin-deployments', 'Deployments', 'Admin', 'Deployment history and logs', '🚀'),
  defineTemplate('admin-queues', 'Job Queues', 'Admin', 'Background job monitoring', '📋'),
  defineTemplate('admin-cache', 'Cache Management', 'Admin', 'Redis cache inspector', '⚡'),
  defineTemplate('admin-logs', 'Log Viewer', 'Admin', 'Real-time log streaming', '📡'),

  // ── Social (5) ─────────────────────────────────────────────────────────
  defineTemplate('social-feed', 'Social Feed', 'Social', 'Twitter-like feed', '📰'),
  defineTemplate('social-profile', 'Social Profile', 'Social', 'User profile with posts', '👤'),
  defineTemplate('social-messages', 'Direct Messages', 'Social', 'DM inbox', '💬'),
  defineTemplate('social-notifications', 'Notifications', 'Social', 'Activity notifications', '🔔'),
  defineTemplate('social-discover', 'Discover', 'Social', 'Trending and suggestions', '🔍'),

  // ── Education (5) ──────────────────────────────────────────────────────
  defineTemplate('edu-course', 'Course Page', 'Education', 'Online course detail', '🎓'),
  defineTemplate('edu-lesson', 'Lesson Page', 'Education', 'Video lesson with notes', '📹'),
  defineTemplate('edu-quiz', 'Quiz Page', 'Education', 'Interactive quiz', '✏️'),
  defineTemplate('edu-certificate', 'Certificate', 'Education', 'Course completion cert', '🏆'),
  defineTemplate('edu-instructor', 'Instructor Profile', 'Education', 'Teacher bio page', '👨‍🏫'),

  // ── Healthcare (5) ─────────────────────────────────────────────────────
  defineTemplate('health-dashboard', 'Health Dashboard', 'Healthcare', 'Patient health overview', '🩺'),
  defineTemplate('health-appointment', 'Book Appointment', 'Healthcare', 'Doctor appointment booking', '📅'),
  defineTemplate('health-records', 'Medical Records', 'Healthcare', 'Patient record viewer', '📋'),
  defineTemplate('health-prescription', 'Prescriptions', 'Healthcare', 'Medication list', '💊'),
  defineTemplate('health-telemedicine', 'Telemedicine', 'Healthcare', 'Video consultation', '📺'),

  // ── Finance (5) ────────────────────────────────────────────────────────
  defineTemplate('fin-dashboard', 'Finance Dashboard', 'Finance', 'Personal finance overview', '📊'),
  defineTemplate('fin-transactions', 'Transactions', 'Finance', 'Transaction history', '💸'),
  defineTemplate('fin-budget', 'Budget Planner', 'Finance', 'Monthly budget tracker', '🎯'),
  defineTemplate('fin-investments', 'Investments', 'Finance', 'Portfolio tracker', '📈'),
  defineTemplate('fin-taxes', 'Tax Center', 'Finance', 'Tax documents and filing', '🧾'),
];

export const TOTAL_EXTENDED = EXTENDED_TEMPLATES.length;
