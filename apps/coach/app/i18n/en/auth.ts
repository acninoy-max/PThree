import type { Dict } from "../de";

export const auth: Dict["auth"] = {
  login: {
    tagline: "Sign in — as a coach or athlete",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    busy: "One moment …",
    forgot: "Forgot your password?",
    noAccess:
      "No access yet? Athletes get an invitation link from their coach.",
    wrongCredentials: "Email or password is incorrect.",
    notConfirmed:
      "This address hasn't been confirmed yet — check your inbox.",
  },
  forgot: {
    metaTitle: "Forgot password — PTHREE",
    title: "Forgot password",
    subtitle: "We'll send you a link to set a new one.",
    reasons: {
      abgelaufen:
        "This link has expired or was already used. Just request a new one below — you can do that as often as you like.",
      ungueltig: "Something is wrong with this link. Request a new one below.",
      browser:
        "The link was opened in a different browser than the one you requested it from. Request a new one here and open the email on this same device.",
    },
    rateLimited:
      "An email was just sent to this address. Wait a minute and then try again.",
    sentTitle: "Email is on its way.",
    sentBody: (address) =>
      `If an account belongs to ${address ?? "this address"}, an email will arrive shortly. The link inside is valid for one hour and works once.`,
    sentHint:
      "Nothing there? Check your spam folder — and open the email on the same device you're using now.",
    backToLogin: "Back to sign in",
    submit: "Send link",
    remembered: "Remembered it?",
    signIn: "Sign in",
  },
  newPassword: {
    metaTitle: "New password — PTHREE",
    title: "New password",
    forAccount: (email) => `For ${email ?? "your account"}.`,
    label: "New password",
    placeholder: (n) => `at least ${n} characters`,
    repeat: "Once more, to be sure",
    show: "Show password",
    sameAsOld: "That's your current password. Choose a different one.",
    missing: (n) => `${n} more ${n === 1 ? "character" : "characters"}.`,
    mismatch: "The two entries don't match.",
    submit: "Save password",
  },
  invite: {
    invalidTitle: "Invitation invalid",
    invalidBody:
      "This link has expired or was already used. Please ask your coach for a new one.",
    invitedBy: "has invited you.",
    alreadyLinked:
      "There's already an account for your name — sign in with it.",
    choosePassword:
      "Choose a password to see your plans, appointments and progress.",
    accountExists:
      "There's already an account for this address. Enter your existing password — or reset it under “Forgot password” and then come back here.",
    doneTitle: (name) => `All set, ${name}.`,
    doneBody:
      "Your account is linked to your coach. Taking you to your training area …",
    emailFixed:
      "Your coach entered this address. If it's wrong, let them know — they'll send you a new invitation.",
    alreadySignedIn:
      "You're already signed in with this address — no password needed.",
    yourPassword: "Your password",
    pickPassword: "Choose a password",
    minChars: "at least 8 characters",
    resetPassword: "Reset password",
    accept: "Accept invitation",
    signIn: "Sign in",
    createAccount: "Create account",
  },
};
