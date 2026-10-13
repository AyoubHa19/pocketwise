# Product Requirements Document (PRD)

- **Product:** Pocketwise
- **Document type:** Product Requirements and Technical Specification
- **Status:** Active development
- **Target audience:** Global users
- **Primary interface language:** English
- **Platforms:** Responsive Web App first, iOS and Android later

## 1. Product vision

Pocketwise is a modern personal finance application designed to help people understand, organize, and improve their financial lives.

It should combine the simplicity of a daily expense tracker with the capabilities of a comprehensive personal finance management tool.

The product should help users answer five important questions:

1. How much money do I actually have?
2. Where is my money going?
3. How much can I safely spend?
4. Am I on track to reach my savings goals?
5. What should I do differently to improve my financial situation?

Pocketwise must be easy for beginners while offering enough depth for users who want detailed financial tracking and analysis.

The application must not be merely a dashboard mockup. All implemented features must have working logic, persistent data where required, validation, appropriate error handling, and tests.

### Product principles

- Simple user experience, powerful functionality.
- Accurate and transparent financial calculations.
- Privacy and security by design.
- Fast manual transaction entry.
- Useful automation without removing user control.
- Accessible and responsive design.
- Honest financial insights based on actual user data.
- No unnecessary complexity or decorative features that harm usability.

## 2. Target users

### Primary users

People who want to manage their personal finances without needing accounting knowledge.

### Secondary users

- People managing income from several sources.
- People with multiple bank accounts, cash balances, or digital wallets.
- People paid weekly, biweekly, monthly, or irregularly.
- People saving for specific goals.
- People tracking recurring expenses, bills, subscriptions, debts, and installments.
- People who use more than one currency.
- People who want to understand their spending patterns.

### Geographic scope

Pocketwise targets a global audience.

The system must not assume that every user lives in the United States or uses USD.

Currency, date format, number format, timezone, and week-start preferences must be configurable or appropriately localized.

The initial interface language is English. The architecture should allow additional languages later.

## 3. Product scope

### 3.1 Web MVP

The initial production-oriented web application should include:

1. Authentication and user profiles.
2. Accounts and balances.
3. Income and expense transactions.
4. Categories and transaction notes.
5. Monthly financial dashboard.
6. Search, filtering, editing, and deletion.
7. Budgets and spending progress.
8. Savings goals.
9. Recurring transactions and bills.
10. Multiple currencies and explicit conversion rules.
11. Financial charts and historical reports.
12. Persistent cloud storage.
13. Data export and account deletion.
14. Responsive design and accessibility.
15. Testing, deployment, monitoring, and error handling.

### 3.2 Advanced features

These should be implemented in prioritized stages after the foundations are reliable:

- AI-assisted receipt scanning.
- Safe-to-spend calculations.
- Salary Day Planner.
- What-if financial simulator.
- Debt and installment tracking.
- Financial calendar.
- More advanced spending insights and forecasts.
- Notifications and reminders.

### 3.3 Mobile applications

After the web application and backend are stable, develop native mobile experiences for iOS and Android using React Native and Expo.

The mobile apps should share the same backend, authentication model, financial rules, and core data concepts.

Do not attempt to build the web and mobile applications simultaneously before the core product is stable.

### 3.4 Out of scope for the initial release

- Direct bank account connections.
- Automatic bank transfers or payments.
- Investment execution.
- Cryptocurrency trading.
- Tax or legal advice.
- Claims that AI can guarantee financial outcomes.

These may be considered separately in the future.

## 4. User experience and visual design

### 4.1 General design direction

Pocketwise should look like a polished, premium financial product.

The design should prioritize clarity, hierarchy, consistency, and meaningful interactions rather than excessive decoration.

The visual direction should be established as a coherent design system before further redesign work.

Requirements:

- Consistent spacing and typography.
- Clear headings and readable financial figures.
- Reusable cards, buttons, inputs, dialogs, and navigation.
- Consistent iconography.
- Carefully controlled borders, shadows, and corner radii.
- Accessible color contrast.
- Light and dark themes.
- Clear focus, hover, pressed, loading, success, and error states.
- Responsive layouts for desktop, tablet, and mobile.
- No unnecessary horizontal scrolling.
- No excessive empty space or artificially narrow desktop layouts.

The existing Pocketwise design should be preserved unless a specific usability or visual problem justifies a change.

### 4.2 Motion design

Animations should make the application feel responsive and intentional.

Required motion patterns:

- Subtle page and section entrance transitions.
- Smooth dialog and panel opening and closing.
- Transaction list insertion and removal.
- Animated financial figures where appropriate.
- Smooth chart updates when the selected period changes.
- Subtle button feedback.
- Month-navigation transitions.
- Loading skeleton transitions.
- Toast notifications.
- Reduced-motion support.

Motion must not delay interaction, hide information, or interfere with layout measurements.

Respect the user's reduced-motion preference. Provide an experience that remains fully usable without nonessential animations.

Do not add animation libraries unless the existing stack requires them.

### 4.3 Responsive behavior

The application must be tested at representative widths, including:

- 375px mobile.
- 390px mobile.
- 768px tablet.
- 1024px laptop.
- 1440px desktop.
- 1920px wide desktop.

Desktop layouts should use available space efficiently while preserving readable line lengths.

Mobile layouts should stack content naturally and retain access to every essential action.

## 5. Application information architecture

The main navigation should provide access to the following sections.

### 5.1 Dashboard

The user's financial overview.

### 5.2 Transactions

A searchable and filterable history of income, expenses, and transfers.

### 5.3 Accounts

Cash accounts, bank accounts, wallets, and other manually tracked financial accounts.

### 5.4 Budgets

Monthly and category-based spending limits.

### 5.5 Savings Goals

Savings targets, progress, deadlines, and contributions.

### 5.6 Bills and Recurring Transactions

Scheduled expenses, subscriptions, and recurring income.

### 5.7 Reports and Insights

Historical comparisons, category analysis, cash-flow summaries, and useful insights.

### 5.8 Financial Calendar

A chronological view of expected income, bills, and other financial events.

### 5.9 Settings

Profile, preferred currency, regional formatting, theme, notifications, privacy, and account management.

Additional advanced features can have dedicated pages or well-integrated panels where that improves usability.

## 6. Dashboard requirements

The dashboard must provide a meaningful overview without overwhelming the user.

### 6.1 Main balance

Display the user's selected account balance or total balance across eligible accounts.

Clearly distinguish:

- Current balance.
- Opening balance.
- Income during the selected period.
- Expenses during the selected period.
- Net cash flow during the selected period.

The interface must not confuse the opening balance with the current balance.

### 6.2 Period selector

Users must be able to navigate between months and select supported reporting periods.

Changing the period must update every period-dependent figure, chart, and transaction list consistently.

Use the user's timezone and clear date boundaries.

### 6.3 Financial summary

Show:

- Total income.
- Total expenses.
- Net cash flow.
- Spending relative to income when meaningful.
- Comparison with a previous period when enough data exists.

If income is zero, do not divide by zero or show a misleading percentage.

### 6.4 Spending by category

Show spending grouped by category with amounts and proportional indicators.

Category percentages must use a clearly defined denominator. For example:

> Category share = category expenses / total expenses × 100.

If total expenses are zero, display an appropriate empty state.

### 6.5 Historical charts

Show monthly income and expenses over a configurable period.

Charts must use real stored data and consistent date boundaries.

Provide clear labels, legends, accessible descriptions, and useful empty states.

### 6.6 Recent transactions

Display recent activity with:

- Category icon.
- Transaction description.
- Date.
- Account where relevant.
- Signed amount.
- Clear visual distinction between income and expenses.

Allow users to open a transaction to inspect or edit it.

### 6.7 Other dashboard widgets

Where appropriate, include:

- Budget progress.
- Savings-goal progress.
- Upcoming bills.
- Recurring payments.
- Safe-to-spend amount.
- Relevant financial insights.

Widgets should be configurable or prioritized so that the dashboard remains useful rather than crowded.

## 7. Transaction management

Transactions are a core part of Pocketwise and must be reliable.

### 7.1 Transaction types

Support at least:

- Income.
- Expense.
- Transfer between accounts.

Transfers must not be treated as income or expenses in consolidated spending and income reports.

### 7.2 Transaction fields

Each transaction should support:

- Unique ID.
- Owner ID.
- Type.
- Amount.
- Currency.
- Date and, where appropriate, time.
- Category.
- Account.
- Description or merchant.
- Optional note.
- Optional tags.
- Creation timestamp.
- Update timestamp.
- Optional receipt attachment reference.
- Optional recurring-transaction reference.
- Optional transfer relationship.

Use an appropriate representation for monetary values and avoid binary floating-point errors in financial arithmetic.

### 7.3 Creating transactions

Users must be able to:

- Select the transaction type.
- Enter an amount.
- Select a category.
- Select an account.
- Choose a date.
- Add a description or note.
- Save or cancel.

Validation must reject invalid amounts, malformed input, and missing required fields.

Zero or negative values must not silently become valid income or expense amounts.

Show clear validation messages without erasing other form inputs.

### 7.4 Editing and deleting

Users must be able to edit and delete their transactions.

Edits and deletions must update all dependent calculations.

For destructive actions, provide confirmation where appropriate.

Never allow a failed save to appear successful.

### 7.5 Transaction history

Provide:

- Grouping by day.
- Daily totals.
- Search by description.
- Filters by date, account, category, and type.
- Sorting by date or amount.
- Pagination or incremental loading for large histories.
- Clear empty and loading states.

Transactions should remain available after reloading or signing in on another supported device.

### 7.6 Transaction integrity

Every transaction must belong to an authorized user.

Account balances, summaries, charts, budgets, and reports must use consistent business rules.

Do not count a transfer between two owned accounts as new income or spending.

## 8. Accounts and opening balances

Users should be able to create and manage multiple accounts.

Examples include:

- Cash.
- Checking account.
- Savings account.
- Digital wallet.
- Other manually tracked accounts.

Each account should have:

- Name.
- Type.
- Currency.
- Opening balance.
- Current calculated balance or a clearly defined balance-management model.
- Optional description.
- Active or archived status.
- Creation and update timestamps.

The application must document whether account balances are calculated from opening balances and ledger entries or maintained through another consistent ledger approach.

Do not mix manually editable current balances with calculated transaction balances without clear rules.

Archiving an account should not silently destroy its transaction history.

Deleting accounts that contain transactions requires a safe, explicit workflow.

## 9. Categories and tags

Provide sensible default categories while allowing customization.

Example expense categories:

- Housing.
- Food.
- Transport.
- Bills.
- Health.
- Shopping.
- Entertainment.
- Education.
- Travel.
- Personal Care.
- Subscriptions.
- Debt Payments.
- Other.

Example income categories:

- Salary.
- Freelance.
- Business.
- Investments.
- Gifts.
- Other Income.

Users should be able to create, rename, and customize categories where appropriate.

A category should have:

- Name.
- Type or supported transaction types.
- Optional icon.
- Optional color.
- Owner or system-default scope.
- Active status.

Changing or archiving a category must not corrupt historical transactions.

Tags can provide an additional flexible grouping mechanism without forcing users to create too many categories.

## 10. Financial calculation rules

Financial correctness is a release requirement.

All calculations should live in reusable, testable business logic rather than being duplicated across UI components.

### 10.1 Income

For a reporting period:

> Income = sum of valid income transactions in that period.

Transfers between accounts are excluded.

### 10.2 Expenses

> Expenses = sum of valid expense transactions in that period.

Transfers between accounts are excluded.

### 10.3 Net cash flow

> Net cash flow = income − expenses.

This is a period-based measure, not automatically the same as total account balance.

### 10.4 Account balance

For an account using an opening-balance ledger model:

> Current balance = opening balance + income entries − expense entries + incoming transfers − outgoing transfers.

All entries must be interpreted in the account's currency or converted under explicit rules.

### 10.5 Remaining income

> Remaining income = income − expenses.

If the result is negative, show the negative value clearly.

Do not call this amount "safe to spend" unless upcoming obligations and other required reserves have been accounted for.

### 10.6 Spending ratio

> Spending ratio = expenses / income × 100, when income is greater than zero.

When income is zero, display an appropriate unavailable state instead of an infinite value or misleading percentage.

### 10.7 Category percentage

> Category percentage = category expenses / total expenses × 100.

When total expenses are zero, show an empty state.

### 10.8 Budget progress

> Budget usage = eligible spending for the budget / budget limit × 100.
>
> Remaining budget = budget limit − eligible spending.

Handle zero or invalid budget limits safely.

Display over-budget states without hiding the actual amount.

### 10.9 Savings goals

> Goal progress = eligible amount saved toward the goal / target amount × 100.

The system must define how contributions are represented and prevent duplicate counting.

When the target amount is zero or invalid, do not calculate a percentage.

### 10.10 Date and timezone rules

Store timestamps consistently and preserve the intended transaction date.

Date-only transactions must not move to another calendar day because of timezone conversion.

Reporting periods should use the user's configured timezone.

Test month boundaries, year boundaries, leap years, and daylight-saving transitions where applicable.

### 10.11 Rounding and precision

Use decimal-safe arithmetic or integer minor units when appropriate.

Apply currency-specific decimal precision.

Round only at defined presentation or accounting boundaries.

Avoid calculations that introduce cumulative floating-point errors.

## 11. Multi-currency support

Pocketwise must support users who manage money in different currencies.

### 11.1 User preferences

Each user should have a preferred display currency.

Accounts and transactions should retain their original currencies.

### 11.2 Conversion rules

A conversion must identify:

- Source currency.
- Target currency.
- Exchange rate.
- Rate timestamp or effective date.
- Source of the rate, when applicable.

The application must not silently treat amounts in different currencies as directly additive.

If no valid exchange rate is available, explain that conversion is unavailable.

### 11.3 Historical accuracy

Historical reports should use a documented conversion policy.

If the product stores a transaction-time exchange rate, preserve it for historical reporting where appropriate.

Changing the user's display currency must not modify the original transaction amounts.

### 11.4 Initial implementation

Start with reliable storage and display of multiple currencies.

Add automated exchange-rate retrieval only after choosing a suitable data provider, handling unavailable rates, and documenting costs and limitations.

Do not claim that exchange rates are live unless the application actually retrieves and updates them.

## 12. Budget management

Users should be able to create monthly or other supported period budgets.

Each budget should include:

- Name.
- Optional category.
- Amount.
- Currency.
- Start and end dates or period definition.
- Owner.
- Optional notification thresholds.

Requirements:

- Display spent, remaining, and percentage used.
- Update when eligible transactions change.
- Warn users when they approach a threshold.
- Identify over-budget situations.
- Avoid duplicate counting of transactions.
- Support budgets without a category when the product explicitly defines that behavior.
- Explain how refunds and income affect budget totals.

Budget notifications must respect user settings.

## 13. Savings goals

Users should be able to define goals such as an emergency fund, a device purchase, travel, or education.

Each goal should include:

- Name.
- Target amount.
- Currency.
- Current saved amount or linked contribution ledger.
- Optional target date.
- Optional linked account.
- Creation timestamp.
- Status.

Show:

- Progress toward the target.
- Remaining amount.
- Optional suggested monthly contribution.
- Progress history where appropriate.

Suggested monthly contribution should be calculated from the remaining amount and time until the target date.

If the target date has passed or is missing, explain the relevant limitation rather than producing misleading numbers.

Do not double-count a savings transfer as both an expense and a savings contribution in consolidated reporting.

## 14. Recurring transactions and bills

Support recurring income and expenses.

Examples:

- Salary.
- Rent.
- Utilities.
- Subscriptions.
- Loan installments.
- Regular savings contributions.

Each recurring rule should include:

- Description.
- Amount.
- Currency.
- Category.
- Account.
- Frequency.
- Start date.
- Optional end date.
- Next due date.
- Active status.
- Reminder preferences.

The system must distinguish a scheduled rule from an actual posted transaction.

A future bill should not be counted as already paid.

Define safe and idempotent logic for generating scheduled entries so that the same occurrence cannot be duplicated.

Users should be able to pause, edit, or cancel recurring rules without corrupting past entries.

## 15. Safe-to-spend feature

Safe-to-spend is a key advanced feature.

It should estimate how much money is available for discretionary spending after accounting for defined obligations.

Potential inputs include:

- Eligible available balances.
- Expected income within the planning period.
- Upcoming bills.
- Planned savings contributions.
- User-defined reserve or emergency buffer.
- Relevant debts or installments.

The formula and treatment of each input must be explicit.

Do not include uncertain future income as guaranteed money.

Do not subtract the same bill or reserve twice.

Clearly label estimates and explain the assumptions used.

If required information is missing, show a limited estimate or request the necessary input rather than presenting a false sense of precision.

This feature provides budgeting assistance, not a guarantee that spending is safe.

## 16. Salary Day Planner

An advanced feature for users who receive income on a recurring or irregular schedule.

It should help users organize money across a pay period.

Potential capabilities:

- Salary date and expected amount.
- Bills due before the next salary.
- Planned savings.
- Necessary expenses.
- Available discretionary amount.
- Upcoming payment calendar.
- Comparison between planned and actual spending.

The planner must work for different pay frequencies.

It should not assume that every user is paid monthly.

The plan should update when actual transactions or bill dates change.

## 17. What-if financial simulator

Allow users to model hypothetical scenarios without changing real transaction history.

Example scenarios:

- What if I save a fixed amount every month?
- What if a recurring expense increases?
- What if I reduce spending in one category?
- What if I make an additional debt payment?
- What if my income changes?

Requirements:

- Clearly distinguish hypothetical results from actual financial data.
- Use explicit assumptions.
- Avoid modifying real accounts or transactions.
- Allow users to adjust scenario inputs.
- Display projected results with clear labels.
- Avoid presenting projections as guaranteed outcomes.

## 18. Debt and installment tracking

Support optional manual tracking of debts and payment plans.

Potential fields:

- Name.
- Original amount.
- Outstanding balance.
- Currency.
- Payment amount.
- Payment frequency.
- Due date.
- Interest information when known.
- Status.

The application must clearly distinguish user-entered estimates from calculated amounts.

If interest calculations are introduced, document the formula and require the relevant terms.

Do not infer unknown interest rates or silently assume repayment terms.

Debt payments must not be counted twice in expense and liability calculations.

## 19. Financial calendar

Provide a calendar or timeline for:

- Upcoming bills.
- Recurring income.
- Expected expenses.
- Debt installments.
- Savings milestones.
- Relevant financial reminders.

Calendar entries should distinguish expected events from completed transactions.

Allow users to open relevant records from a calendar event.

Support timezone and date-boundary rules consistently.

## 20. AI-assisted receipt scanning

AI receipt scanning should reduce manual entry while keeping the user in control.

### 20.1 User flow

1. User selects or captures a receipt image.
2. The application validates the file.
3. The image is processed by an approved extraction service.
4. The service returns structured candidate fields.
5. The user reviews and edits the extracted information.
6. The user confirms the transaction.
7. Only then is the transaction saved.

### 20.2 Potential extracted fields

- Merchant.
- Total amount.
- Currency.
- Date.
- Tax amount, if clearly identifiable.
- Suggested category.
- Optional line items when reliably supported.

### 20.3 Validation

The application must handle:

- Blurry images.
- Missing totals.
- Multiple possible totals.
- Unreadable dates.
- Unsupported currencies.
- Duplicate receipts.
- Network failures.
- Service rate limits.
- Incorrect model output.

Never save uncertain extracted data without user confirmation.

The extraction model must not be allowed to execute application commands or access unrelated user records.

### 20.4 Privacy and cost

Explain how receipt images are processed and which third-party services receive them.

Minimize data retention.

Store images only when necessary and with appropriate access controls.

Protect API keys on the server. Never expose secret credentials in browser code.

Choose an AI provider only after reviewing its capabilities, pricing, data handling, and integration requirements.

## 21. Reports and financial insights

Reports should provide useful information grounded in the user's actual data.

Potential reports:

- Income versus expenses.
- Monthly net cash flow.
- Category spending.
- Account balance history.
- Budget performance.
- Savings progress.
- Recurring expenses.
- Period-over-period comparisons.

Potential insights:

- A category increased compared with the previous period.
- Spending exceeded a budget.
- A recurring payment is approaching.
- A savings goal is behind schedule.
- Income or spending varies significantly between periods.

Every insight must be traceable to a defined calculation.

Avoid false certainty, unsupported claims, and unnecessary judgmental language.

Do not make up missing transaction data to populate charts.

Provide meaningful empty states when the user has insufficient history.

## 22. Search, export, and data portability

Users should be able to search their financial history and export their information.

Search and filtering should cover the relevant transaction fields.

Export options should include a documented format such as CSV.

The export must contain only data the authorized user is allowed to access.

Dates, amounts, and currencies should be represented consistently.

Where practical, provide a way to export relevant account, transaction, budget, and savings data.

Imports, if introduced, must validate input and prevent accidental duplicate transactions.

Do not silently overwrite existing data during import.

## 23. Authentication and user accounts

The application requires secure authentication before storing private cloud financial data.

Requirements:

- Sign up.
- Sign in.
- Sign out.
- Appropriate session handling.
- Account recovery through the chosen provider where supported.
- Protected application routes.
- Secure user-specific data access.
- Clear account deletion workflow.

Use a supported authentication solution compatible with the chosen backend.

Inspect existing project dependencies and configuration before introducing a new provider.

Never implement security solely by hiding UI elements.

Every protected data operation must validate authorization on the server or trusted backend.

## 24. Data model

The exact schema should follow the existing stack and be finalized after inspecting the current implementation.

The following describes the required logical entities.

### 24.1 User profile

Fields:

- User ID.
- Display name, when supplied.
- Email or provider identity as supported by the authentication system.
- Preferred currency.
- Locale and date preferences.
- Timezone.
- Theme preference.
- Notification preferences.
- Creation and update timestamps.

### 24.2 Account

Fields:

- Account ID.
- Owner ID.
- Name.
- Account type.
- Currency.
- Opening balance.
- Optional description.
- Active or archived status.
- Timestamps.

### 24.3 Transaction

Fields:

- Transaction ID.
- Owner ID.
- Account ID.
- Transaction type.
- Amount.
- Currency.
- Transaction date.
- Category ID.
- Description.
- Optional note and tags.
- Optional transfer relationship.
- Optional recurring-rule relationship.
- Optional receipt reference.
- Creation and update timestamps.

### 24.4 Category

Fields:

- Category ID.
- Owner ID or system-default scope.
- Name.
- Supported transaction type.
- Optional icon and color.
- Active status.
- Timestamps.

### 24.5 Budget

Fields:

- Budget ID.
- Owner ID.
- Optional category ID.
- Name.
- Limit amount.
- Currency.
- Period definition.
- Start and end dates as appropriate.
- Notification settings.
- Timestamps.

### 24.6 Savings goal

Fields:

- Goal ID.
- Owner ID.
- Name.
- Target amount.
- Currency.
- Optional target date.
- Optional linked account.
- Status.
- Timestamps.

If contributions are stored separately, define a contribution ledger with explicit relationships and prevent duplicate counting.

### 24.7 Recurring rule

Fields:

- Rule ID.
- Owner ID.
- Account ID.
- Category ID.
- Type.
- Amount.
- Currency.
- Frequency.
- Start date.
- Optional end date.
- Next due date.
- Active status.
- Timestamps.

### 24.8 Receipt

Where receipt storage is enabled:

- Receipt ID.
- Owner ID.
- Secure storage reference.
- Processing status.
- Extracted candidate fields.
- Confirmation status.
- Creation timestamp.
- Retention or deletion metadata as needed.

Do not store sensitive receipt information unnecessarily.

### 24.9 Exchange rate

When conversion support is implemented:

- Rate ID or key.
- Source currency.
- Target currency.
- Rate.
- Effective timestamp or date.
- Provider or source.
- Retrieval timestamp.

Use an explicit policy for historical rates and stale data.

### 24.10 Optional advanced entities

Additional entities may be required for:

- Debt accounts.
- Installments.
- Calendar events.
- Scenario simulations.
- Notifications.
- Savings contributions.
- Audit events where appropriate.

Do not create every possible table before its feature is required. Implement a minimal coherent schema and evolve it safely.

## 25. Technical architecture

### 25.1 Initial web stack

Preferred stack:

- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui where appropriate.
- Convex for backend and database, subject to inspection of the existing project.
- A compatible authentication solution.
- A suitable charting library.
- Existing Motion integration for animation where already implemented.

These are architectural preferences, not permission to replace a working stack without justification.

Before changing dependencies, inspect package.json, existing source files, tests, and configuration.

### 25.2 Architecture principles

- Reusable UI components.
- Separation between UI and business logic.
- Centralized financial calculations.
- Typed inputs and outputs.
- Validated server-side mutations.
- Secure data access.
- Consistent error handling.
- Testable date, currency, and accounting logic.
- Minimal unnecessary dependencies.
- Safe schema migrations.
- No secrets in source control.

### 25.3 Mobile architecture

Use React Native and Expo after the web product is stable.

Share business rules and API contracts where practical without forcing web-specific components into the mobile application.

Mobile applications must use the same authorization and financial data rules.

## 26. Security, privacy, and data integrity

Financial information is sensitive.

Security requirements:

- Authenticate users before private data access.
- Enforce ownership and authorization on every protected operation.
- Validate input on trusted backend boundaries.
- Never trust a client-supplied owner ID without verifying authorization.
- Keep API keys and service credentials on the server.
- Avoid logging secrets or unnecessary personal financial details.
- Protect receipt files with appropriate access controls.
- Apply reasonable rate limits to sensitive or expensive operations.
- Use secure transport and supported provider security mechanisms.
- Handle errors without exposing internal secrets.
- Provide data export and deletion workflows.
- Explain relevant third-party processing.
- Avoid retaining personal data beyond operational needs.
- Use safe migration procedures.
- Prevent duplicate recurring transactions.
- Maintain consistent financial calculations after edits and deletions.

Do not claim legal or regulatory compliance without an appropriate assessment.

## 27. Testing strategy

Testing is required throughout development, not only before release.

### 27.1 Unit tests

Test:

- Income and expense totals.
- Net cash flow.
- Account balances.
- Transfer handling.
- Budget usage.
- Category percentages.
- Savings progress.
- Currency conversion rules.
- Date boundaries.
- Zero-income and zero-expense cases.
- Negative balances.
- Rounding and precision.

### 27.2 Integration tests

Test:

- Creating a transaction.
- Editing a transaction.
- Deleting a transaction.
- Persistent storage after reload.
- Account and category relationships.
- User-specific data authorization.
- Recurring-rule processing.
- Receipt confirmation and transaction creation.
- Data export.
- Data migration.

### 27.3 End-to-end tests

Verify important user journeys:

1. A user signs up or signs in.
2. The user creates an account.
3. The user adds income.
4. The user adds an expense.
5. The dashboard updates correctly.
6. The user creates a budget.
7. The user creates a savings goal.
8. The user edits and deletes a transaction.
9. Data remains available after reload.
10. A user cannot access another user's private data.
11. The interface remains usable on desktop and mobile.

### 27.4 Visual and responsive tests

Check:

- Desktop layout.
- Tablet layout.
- Mobile layout.
- Keyboard navigation.
- Visible focus states.
- Color contrast.
- Reduced-motion behavior.
- Dialog and toast behavior.
- Empty, loading, error, and success states.
- No accidental horizontal overflow.
- No chart clipping.

### 27.5 Build verification

Use the scripts actually defined by the project.

Run applicable linting, type checking, unit tests, integration tests, end-to-end tests, and production build.

Report which commands were run and whether they passed.

Never claim that unexecuted tests passed.

## 28. Development workflow

The developer is learning and needs a step-by-step workflow.

Mandatory working rules:

1. Inspect the existing code before editing.
2. Preserve working functionality.
3. Work in small, independently verifiable stages.
4. Explain the objective of each stage in simple English.
5. Identify the files likely to change.
6. Explain new dependencies and required accounts.
7. Ask for approval before substantial implementation stages.
8. Avoid unnecessary rewrites.
9. Never overwrite user data or secrets.
10. Run relevant tests after changes.
11. Explain how to verify the feature manually.
12. Report failures honestly.
13. Keep the PRD updated when requirements change.
14. Use Git commits or another reliable change history.
15. Do not begin a new stage while important failures from the current stage remain unresolved.

The project should remain understandable to a beginner.

## 29. Implementation roadmap

The following roadmap describes the product's intended development sequence. The existing project has already completed an initial eight-stage UI and motion roadmap, but each feature must be verified against the actual code.

### Foundation already developed

Initial stages covered:

- Design foundation.
- Transaction entry and interaction improvements.
- Dashboard layout and financial summaries.
- Transaction grouping and category icons.
- Charts and calculation tests.
- Motion setup.
- Animated transaction, number, and chart interactions.
- Final review and responsive layout corrections.

Do not rebuild these stages from scratch.

Inspect the existing implementation and preserve verified working code.

### Next phase: Persistent backend and authentication

- Inspect existing storage and infrastructure.
- Confirm the chosen backend.
- Establish authentication.
- Define the minimal data schema.
- Protect user-specific data.
- Migrate local data safely where required.
- Verify persistent transactions.

### Accounts and category management

- Complete account creation and management.
- Establish opening-balance behavior.
- Complete category management.
- Validate account and transaction relationships.

### Budgets and savings

- Implement budget creation and progress.
- Implement savings goals and contributions.
- Add appropriate alerts and validation.
- Test calculations and prevent duplicate counting.

### Recurring payments and financial calendar

- Implement recurring rules.
- Handle scheduled occurrences safely.
- Distinguish expected and completed payments.
- Add bill reminders and calendar views where appropriate.

### Currency support and reporting

- Complete multi-currency storage and display.
- Implement explicit conversion rules.
- Complete historical reports.
- Verify period comparisons and financial summaries.

### AI receipt scanning

- Select a suitable extraction service.
- Implement secure server-side processing.
- Add image validation and error handling.
- Require user review before saving.
- Test cost, privacy, and duplicate handling.

### Advanced financial planning

- Safe-to-spend.
- Salary Day Planner.
- What-if simulator.
- Debt and installment tracking.
- Advanced insights.

Prioritize features according to their dependencies and product value. Some advanced features may be deferred beyond the first public release.

### Finalization and web release

- Complete security review.
- Complete automated and manual tests.
- Fix accessibility and responsive issues.
- Optimize performance.
- Configure production environment variables.
- Deploy the web application.
- Verify production data access and error handling.
- Document known limitations.

### Mobile release

- Build iOS and Android experiences using Expo.
- Reuse the backend and financial logic.
- Test mobile-specific navigation, storage, camera access, and receipt capture.
- Prepare platform-specific builds and release workflows.

## 30. Deployment and operations

The production architecture must be selected based on the existing project and actual provider requirements.

Deployment checklist:

- Production web hosting.
- Backend and database deployment.
- Authentication configuration.
- Secure environment variables.
- Domain and HTTPS.
- Production error reporting.
- Database and file retention policies.
- Appropriate backup and recovery capabilities.
- Migration procedures.
- Health and availability checks.
- Clear setup documentation.

Do not assume that local development configuration is production-ready.

Do not deploy real financial data into an unprotected development environment.

Verify all production integrations before describing the application as released.

## 31. Acceptance criteria

The web MVP is ready for release only when the required features are actually implemented and verified.

### Functional

- Users can authenticate securely.
- Users can manage their own accounts and transactions.
- Transactions persist across sessions.
- Financial totals update correctly.
- Transfers are not double-counted as income or expenses.
- Budgets and savings goals behave according to documented rules.
- Reporting periods and currency formatting work correctly.
- Search and export behave reliably.
- Appropriate empty, loading, error, and success states exist.

### Security

- Users cannot access another user's private financial records.
- Backend operations enforce authorization.
- Credentials are not exposed in client code.
- Deletion and migration workflows protect data integrity.
- Receipt processing respects the documented privacy model.

### Quality

- Relevant automated tests pass.
- Production build succeeds.
- No unresolved critical financial calculation bugs remain.
- Responsive layouts work at supported sizes.
- Core flows are accessible and usable.
- Performance is acceptable on representative devices.
- Deployment configuration is documented.

### Honest release status

A feature must not be marked complete merely because its screen or button exists.

Completion requires working behavior, appropriate persistence, validation, and verification.

## 32. Success metrics

Measure product quality through actual user behavior and reliability.

Potential metrics:

- Percentage of users who successfully create their first transaction.
- Time required to record a transaction.
- Successful completion rate for core financial tasks.
- Returning users.
- Budget creation and continued usage.
- Savings-goal engagement.
- Receipt extraction correction rate.
- Transaction duplication and calculation error rates.
- Application performance.
- Error rate and availability.
- User-reported usability issues.

Metrics must be collected transparently and with appropriate privacy protections.

Do not invent user counts, conversion rates, or financial outcomes.

## 33. Final product definition

Pocketwise should become a trustworthy personal finance platform that combines:

- A clear financial dashboard.
- Accurate transaction and account management.
- Budgets and savings goals.
- Recurring bills and financial planning.
- Multi-currency support.
- Useful financial reports.
- AI-assisted receipt capture.
- Strong privacy and data ownership.
- A polished responsive interface.
- Smooth, purposeful motion.
- A future-ready mobile architecture.

The final experience should feel cohesive rather than like a collection of unrelated features.

Accuracy, usability, data security, and maintainability take priority over feature count.

## 34. Immediate instructions for Claude Code

We already have an existing Pocketwise project. The initial UI and motion roadmap has been implemented, and the dashboard layout has received further corrections.

Do not recreate the application.

First, inspect the current project and compare its actual implementation against this PRD.

Create a gap analysis that identifies:

1. Features already implemented and verified.
2. Features partially implemented.
3. Missing features.
4. Existing bugs or security risks.
5. Tests and integrations that need verification.
6. The smallest safe next implementation stage.

Check the existing stack and architecture before recommending new dependencies or services.

Pay special attention to the current local browser-based storage and whether a persistent backend and authentication are already configured.

Preserve existing data and working functionality.

Explain the findings in simple English, propose the next stage, and wait for approval before editing files.

Do not claim the product is complete until the acceptance criteria above have been verified.
