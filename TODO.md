# FlexBank — Development To-Do List

**Purpose:** Track features that are planned, designed or documented but have not yet been fully implemented.

## 1. Backend & Database Integration

**Goal:** Move from local-only storage towards a backend-connected application while retaining offline functionality.

- [ ] Set up a Node.js + Express + TypeScript backend API.
- [ ] Create a Supabase PostgreSQL database.
- [ ] Implement the database tables documented in `BACKEND.md`:
  - `profiles`
  - `user_preferences`
  - `user_banking_purposes`
  - `widget_layouts`
- [ ] Configure Supabase Auth for user registration and login.
- [ ] Implement Row-Level Security (RLS) to ensure users can only access their own data.
- [ ] Develop the required REST API endpoints:
  - Register, login and logout.
  - Retrieve and update customer profiles.
  - Retrieve and update banking preferences.
  - Retrieve and update selected banking purposes.
  - Retrieve and update personalised homepage layouts.
- [ ] Implement `remoteAuthService` using the existing `AuthService` interface.
- [ ] Enable switching between local and remote authentication without changing the UI.
- [ ] Retain local storage as an offline fallback.
- [ ] Configure environment variables and secure API credentials.

**Current status:**
- No backend API or remote database is connected.
- Authentication and preferences are stored locally using SecureStore and AsyncStorage.
- Passwords currently use salted SHA-256 hashes.
- The application supports offline usage.

## 2. Purpose-Based Personalisation & Homepage Customisation

**Goal:** Allow customers to personalise their banking experience based on their financial purposes.

- [ ] Implement the new Banking Purpose Selection feature.
- [ ] Allow customers to select multiple purposes:
  - Saving Money.
  - Fixed Deposits.
  - Bonds & Investments.
  - Everyday Banking.
  - Managing My Money.
  - Learning About Financial Products.
- [ ] Generate a personalised homepage based on selected purposes.
- [ ] Prioritise relevant banking widgets according to customer preferences.
- [ ] Add a "Why am I seeing this?" explanation for personalised widgets.
- [ ] Allow customers to edit their banking purposes.
- [ ] Implement drag-and-drop widget reordering.
- [ ] Allow customers to reset their homepage layout.
- [ ] Save customised widget arrangements per user.
- [ ] Ensure all banking features remain accessible regardless of selected purposes.

**Current status:**
- Existing homepage personalisation uses deterministic rules.
- Drag-and-drop widget customisation and remote layout storage are not implemented.
- The newly proposed financial-purpose personalisation must be integrated and tested if not already present.

## 3. Language Support

**Goal:** Make FlexBank accessible to customers who prefer different languages.

- [ ] Implement full Malay language support.
- [ ] Implement full Tamil language support.
- [ ] Translate all interface text, navigation labels, buttons and error messages.
- [ ] Connect language preferences to all application screens.
- [ ] Ensure language changes are reflected consistently throughout the app.
- [ ] Test translated layouts for text overflow and readability.

**Current status:**
- English and Mandarin are currently selectable.
- Malay and Tamil are not yet available in the interface.

## 4. AI Concierge Integration

**Goal:** Introduce real AI-powered assistance while preserving offline functionality.

- [ ] Integrate a real AI provider through the existing Concierge interface.
- [ ] Support contextual banking explanations.
- [ ] Simplify complicated financial terminology.
- [ ] Provide plain-language explanations of savings, fixed deposits and bonds.
- [ ] Support translation based on the customer's selected language.
- [ ] Ensure AI responses are relevant to the current banking screen.
- [ ] Implement appropriate error handling when the AI service is unavailable.
- [ ] Retain deterministic offline fallback responses.
- [ ] Store AI credentials securely on the backend rather than inside the mobile application.
- [ ] Ensure AI cannot initiate, approve or confirm financial transactions.

**Current status:**
- The Concierge currently uses deterministic offline fallback responses.
- No external AI provider is connected.
- No AI API credentials are configured.

## 5. Additional Banking Features

**Goal:** Expand the simulated banking experience.

- [ ] Implement QR Scan & Pay (currently a placeholder).
- [ ] Implement a Bill Payment flow with simulated payees.
- [ ] Expand the available simulated banking products and information.
- [ ] Add relevant educational content for fixed deposits and bonds.

**Out of scope for the prototype:**
- Real PayNow transfers.
- Live bank account connections.
- Actual deposits, investments or purchases of financial products.

All financial transactions must remain simulated.

## 6. UI, Branding & Deployment

**Goal:** Improve the application's presentation and prepare it for demonstration.

- [ ] Restore the customised application icon.
- [ ] Restore the customised splash screen.
- [ ] Configure Expo Application Services (EAS) build settings.
- [ ] Test the application on Android Studio Emulator.
- [ ] Test the application on a physical mobile device.
- [ ] Resolve remaining UI bugs and layout issues.
- [ ] Prepare a complete recorded demonstration as a backup.
- [ ] Conduct final usability testing and document findings.

## 7. Security & Production Readiness

**Goal:** Improve security beyond the current prototype implementation.

- [ ] Replace prototype-only client-side password hashing with secure server-side authentication.
- [ ] Use bcrypt or Argon2 for server-side password hashing if managing passwords directly.
- [ ] Implement a secure password reset process using email verification.
- [ ] Review authentication and session management.
- [ ] Validate all backend requests.
- [ ] Review database access policies and API security.
- [ ] Ensure no real banking credentials or sensitive financial information are stored in the prototype.

**Note:** Production-grade security improvements are future work. The current application is a competition prototype and should not be presented as a production-ready banking system.

---

## Priority Summary

| Priority | Workstream |
|---|---|
| High | Purpose-based personalisation and homepage |
| High | Backend and database integration, if approved |
| Medium | Malay and Tamil language support |
| Medium | Real AI Concierge integration |
| Medium | Usability testing and demo preparation |
| Low | Additional banking features |
| Future | Production-grade security and deployment |

**Important:** This checklist describes planned development work. Items should only be marked completed after implementation and testing. The existing offline functionality and simulated banking journey should remain operational throughout development.