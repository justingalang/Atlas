const {HttpsError, onCall} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");

// Bind the secret named GOOGLE_API_KEY that you set with:
// firebase functions:secrets:set GOOGLE_API_KEY
const googleApiKey = defineSecret("GOOGLE_API_KEY");

const maskSecret = (value) => {
  if (!value || value.length < 8) {
    return value ? `${value[0]}***` : null;
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

exports.getSecret = onCall({secrets: [googleApiKey]}, (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in to access this function.");
  }

  const key = googleApiKey.value();
  if (!key) {
    throw new HttpsError(
        "failed-precondition",
        "GOOGLE_API_KEY secret is not set.",
    );
  }

  return {
    message: "Secret loaded via Firebase Secret Manager.",
    googleApiKeyMasked: maskSecret(key),
    note:
      "Use this function server-side; do not forward raw secrets to clients.",
  };
});
