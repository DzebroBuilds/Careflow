// Public browser configuration. Restrict the Picker key by HTTPS referrer and API.
// NEXT_PUBLIC values are visible in the built client; never use a server secret here.
export const googleConfig = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  pickerApiKey: process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY || '',
  projectNumber: process.env.NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER || '',
};
