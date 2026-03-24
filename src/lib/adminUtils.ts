// List of admin emails - update with your actual admin email(s)
const ADMIN_EMAILS = ['admin@flourishtalents.com'];

/**
 * Check if a given email is an admin
 */
export const isUserAdmin = (userEmail?: string): boolean => {
  if (!userEmail) return false;
  return ADMIN_EMAILS.includes(userEmail.toLowerCase());
};

/**
 * Get the list of admin emails
 */
export const getAdminEmails = (): string[] => {
  return ADMIN_EMAILS;
};

/**
 * Add an admin email
 */
export const addAdminEmail = (email: string): void => {
  const normalizedEmail = email.toLowerCase();
  if (!ADMIN_EMAILS.includes(normalizedEmail)) {
    ADMIN_EMAILS.push(normalizedEmail);
  }
};

/**
 * Remove an admin email
 */
export const removeAdminEmail = (email: string): void => {
  const normalizedEmail = email.toLowerCase();
  const index = ADMIN_EMAILS.indexOf(normalizedEmail);
  if (index > -1) {
    ADMIN_EMAILS.splice(index, 1);
  }
};
