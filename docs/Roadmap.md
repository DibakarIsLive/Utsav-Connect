# 1. Our project's foundation

## 1.1 Technology decisions

These are the technologies and constraints we've established.

| Component             | Decision                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Application framework | Next.js                                                                                  |
| Frontend language     | JavaScript + JSX                                                                         |
| TypeScript            | Strictly prohibited                                                                      |
| Backend               | Next.js Route Handlers and server-side logic                                             |
| Database              | MongoDB                                                                                  |
| Map                   | Google Maps Platform                                                                     |
| Place search          | Google Maps Places API                                                                   |
| Geocoding             | Google Maps Geocoding API                                                                |
| Geographic format     | GeoJSON                                                                                  |
| Styling               | Tailwind CSS                                                                             |
| Input validation      | Zod                                                                                      |
| Authentication        | Auth.js or another suitable authentication solution                                      |
| Charts                | Recharts                                                                                 |
| Deployment            | A production-ready hosting platform compatible with our chosen Next.js and MongoDB setup |
| Version control       | Git and GitHub or an equivalent Git provider                                             |
| Testing               | Automated unit, integration, and end-to-end tests                                        |
| Monitoring            | Application error tracking, uptime monitoring, and operational logs                      |

We'll use `.jsx` for React components and `.js` for other JavaScript files, including API routes and utilities.

**Hard rule:** No `.tsx`, `.ts`, TypeScript-only configuration, or accidental TypeScript conversion. Every dependency, code example, generated file, and build configuration must respect this rule.

We'll use the Next.js App Router unless the project's existing setup gives us a compelling reason not to.

## 1.2 What the website must accomplish

The finished website must support these core goals:

1. Let visitors explore approved geographic areas and public campaign statistics.
2. Let registered devotees submit invitation reports.
3. Display invitation coverage across geographic areas.
4. Let administrators manage areas, boundaries, population estimates, and reports.
5. Support localities across a large and expandable geographic region.
6. Suggest places through Google Maps.
7. Support custom area boundaries using polygons and coordinates.
8. Maintain a visible history of locality proposals for registered devotees.
9. Allow only authorized administrators to create and approve official localities.
10. Provide accurate analytics, contributor statistics, and eventually a leaderboard.
11. Protect accounts, data, and administrative actions.
12. Remain maintainable after launch, with a documented process for updates and incident response.

We'll treat the physical Mahotsav venue as a **separate geographic point of interest**. The outreach campaign itself can span as many geographic areas as necessary.

No hardcoded one-town restriction. No fixed-radius restriction. No assumption that everyone lives near the venue.

---

# 2. The rules that govern the entire project

Before the detailed phases, we need a few architectural rules that every feature must follow.

### Rule 1: Proposed areas are not approved areas

An administrator creates and manages official localities.

Proposed boundaries and area-change requests are stored separately from the official geographic dataset. Registered devotees can view proposal history, but pending proposals must not affect official map statistics.

### Rule 2: Permission checks happen on the server

The interface can hide buttons, but the backend must enforce permissions independently.

A devotee must never be able to edit another person's submission by changing an ID in a request.

### Rule 3: Historical records are preserved

Important actions must be traceable. Approvals, rejections, corrections, and withdrawals must not silently erase history.

### Rule 4: Every statistic needs a clear definition

We must distinguish between:

- Estimated population.
- Reported invitations.
- Verified unique people invited, if that becomes possible in the future.
- Registered devotees.
- Active contributing devotees.
- Total reports submitted.

These numbers are not interchangeable.

### Rule 5: Geographic hierarchy must be flexible

Areas can contain smaller areas, and the system must support different administrative or custom geographic structures.

A locality may belong to a town, which belongs to a larger region, for example. The actual hierarchy must be configurable rather than hardcoded.

### Rule 6: No feature is complete until it is tested

A page that renders successfully is not necessarily a working feature.

We must test its data flow, permissions, failure states, validation, mobile usability, and interaction with existing features.

### Rule 7: Production must be recoverable

Database backups, tested restoration procedures, environment configuration, deployment rollback, and operational documentation are part of the product—not optional extras to add after something breaks.

---

# PART I — Product planning and requirements

## Phase 0 — Establish the project specification

**Goal:** Create one definitive source of truth before implementation begins.

### Tasks

- [ ] 0.1 Document all confirmed requirements.
- [ ] 0.2 Establish the JavaScript-only rule.
- [ ] 0.3 Define visitor, devotee, administrator, and any future coordinator roles.
- [ ] 0.4 Define every page and navigation item.
- [ ] 0.5 Define every database collection and its purpose.
- [ ] 0.6 Define the geographic hierarchy and area lifecycle.
- [ ] 0.7 Define invitation reporting and coverage calculations.
- [ ] 0.8 Define the locality proposal, editing, withdrawal, and approval workflows.
- [ ] 0.9 Define privacy, security, and data-retention requirements.
- [ ] 0.10 Define the testing strategy and release criteria.
- [ ] 0.11 Record decisions that remain open rather than silently inventing answers.
- [ ] 0.12 Maintain a feature inventory so nothing disappears between coding sessions.

### Deliverables

1. Product requirements document.
2. Page and navigation inventory.
3. Role-permission matrix.
4. Database design.
5. API specification.
6. Testing and acceptance criteria.
7. Deployment and maintenance plan.

### Completion gate

No major feature should enter implementation without a defined purpose, user workflow, data requirements, permission rules, and acceptance criteria.

---

## Phase 1 — Design the user experience

**Goal:** Decide how the website should behave before building its individual screens.

### Tasks

- [ ] 1.1 Establish the visual identity and design system.
- [ ] 1.2 Choose typography, colors, spacing, buttons, forms, cards, and icons.
- [ ] 1.3 Design the desktop navigation.
- [ ] 1.4 Design mobile navigation.
- [ ] 1.5 Create a reusable page layout and dashboard layout.
- [ ] 1.6 Design loading, empty, success, and error states.
- [ ] 1.7 Design form validation and confirmation messages.
- [ ] 1.8 Design accessible dialogs, menus, and notifications.
- [ ] 1.9 Establish a consistent method for displaying dates, counts, and percentages.
- [ ] 1.10 Create a reusable table, pagination, filtering, and search pattern.
- [ ] 1.11 Design responsive map panels and mobile-friendly area details.
- [ ] 1.12 Ensure the interface remains usable when geographic data is missing.

### Pages to design first

- Home.
- About.
- Interactive Map.
- Area Details.
- Login.
- Registration.
- Devotee Dashboard.
- Add Invitations.
- My Reports.
- Locality Proposals.
- Administrator Dashboard.
- Area Management.
- Population Management.
- Invitation Report Management.
- Analytics.
- Devotee Management.
- Audit History.

### Completion gate

Every planned page has a clear layout, navigation path, responsive behavior, and defined loading, empty, and error states.

---

# PART II — Development foundation

## Phase 2 — Set up the project correctly

**Goal:** Create a stable Next.js foundation that won't require major restructuring later.

### Tasks

- [ ] 2.1 Create or inspect the repository.
- [ ] 2.2 Initialize the Next.js application with the App Router.
- [ ] 2.3 Configure JavaScript and JSX only.
- [ ] 2.4 Remove or prevent TypeScript-specific configuration and files.
- [ ] 2.5 Configure Tailwind CSS using a version compatible with the selected Next.js setup.
- [ ] 2.6 Establish a consistent folder structure.
- [ ] 2.7 Configure environment-variable handling.
- [ ] 2.8 Add `.env.example` containing variable names and safe placeholders, never actual secrets.
- [ ] 2.9 Configure ESLint and formatting.
- [ ] 2.10 Configure Git and `.gitignore`.
- [ ] 2.11 Add basic automated checks to the development workflow.
- [ ] 2.12 Establish development, testing, and production configurations.
- [ ] 2.13 Document installation, local development, and build commands.
- [ ] 2.14 Confirm the project can build from a clean installation.

### Folder structure

```text
mahotsav-website/
├── app/
│   ├── page.jsx
│   ├── about/
│   ├── map/
│   ├── areas/
│   ├── login/
│   ├── register/
│   ├── dashboard/
│   ├── admin/
│   └── api/
├── components/
│   ├── layout/
│   ├── maps/
│   ├── areas/
│   ├── forms/
│   ├── dashboard/
│   └── ui/
├── lib/
│   ├── mongodb.js
│   ├── auth.js
│   ├── permissions.js
│   ├── validation.js
│   └── geography.js
├── models/
├── tests/
├── public/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

This is a starting structure. We can adapt it as the architecture becomes clearer.

### Acceptance criteria

- The app starts locally.
- The production build succeeds.
- JavaScript and JSX conventions are followed.
- No secrets are committed.
- A new developer can set up the project from the README.

---

## Phase 3 — Database architecture and data integrity

**Goal:** Create the foundation for reliable geographic and invitation data.

### Tasks

- [ ] 3.1 Choose and configure the MongoDB deployment.
- [ ] 3.2 Establish a reusable MongoDB connection module.
- [ ] 3.3 Define collection schemas and validation rules.
- [ ] 3.4 Define identifier conventions.
- [ ] 3.5 Establish timestamps and audit metadata.
- [ ] 3.6 Define indexes for common queries.
- [ ] 3.7 Define geospatial indexes where needed.
- [ ] 3.8 Define uniqueness constraints for appropriate identifiers.
- [ ] 3.9 Define transaction requirements for multi-record operations.
- [ ] 3.10 Define pagination and sorting conventions.
- [ ] 3.11 Establish database migrations or versioned data-migration scripts where required.
- [ ] 3.12 Create safe development seed data.
- [ ] 3.13 Test database connection failure and recovery behavior.
- [ ] 3.14 Document backup and restoration procedures.

### Core collections

| Collection          | Purpose                                                |
| ------------------- | ------------------------------------------------------ |
| `users`             | Accounts, roles, and profile information               |
| `areas`             | Official geographic areas and boundaries               |
| `localityProposals` | Proposed areas and boundary changes                    |
| `invitationReports` | Submitted invitation counts                            |
| `populationRecords` | Population estimates and their sources                 |
| `auditLogs`         | Traceable administrative and security-relevant actions |
| `areaAssignments`   | Optional coordinator or devotee-area assignments       |
| `notifications`     | In-app notifications, if implemented                   |
| `systemSettings`    | Controlled application settings                        |

We should not create every collection just because it appears in this list. Each one should be introduced with its actual use and appropriate tests.

### Acceptance criteria

- Invalid data cannot enter through normal application APIs.
- Common queries use appropriate indexes.
- Database failures produce controlled errors.
- Important updates preserve the consistency of related records.
- Backups and restoration have documented, testable procedures.

---

## Phase 4 — Authentication and authorization

**Goal:** Secure the application before introducing sensitive write operations.

### Tasks

- [ ] 4.1 Choose the authentication approach.
- [ ] 4.2 Implement registration.
- [ ] 4.3 Implement login and logout.
- [ ] 4.4 Implement secure session handling.
- [ ] 4.5 Implement password recovery if password-based authentication is selected.
- [ ] 4.6 Implement email verification if required by the registration policy.
- [ ] 4.7 Implement the user profile.
- [ ] 4.8 Define the account lifecycle.
- [ ] 4.9 Define account suspension and reactivation.
- [ ] 4.10 Implement role-based permissions.
- [ ] 4.11 Protect server-side API routes.
- [ ] 4.12 Protect administrator pages.
- [ ] 4.13 Test unauthorized and forbidden requests.
- [ ] 4.14 Add rate limiting to sensitive authentication endpoints.
- [ ] 4.15 Add security logging without recording passwords, tokens, or other secrets.

### Roles

**Visitor**

- Can access approved public information.
- Cannot submit invitation reports.
- Cannot view devotee-only proposal history.

**Registered devotee**

- Can submit invitation reports.
- Can view locality proposal history.
- Can view their own reports and profile.
- Can submit and manage their own locality proposals, subject to the final authorization rules.

**Administrator**

- Can create and edit official areas.
- Can review, approve, reject, or request corrections to proposals.
- Can manage population data and invitation reports.
- Can manage accounts and authorized administrative settings.

### Important clarification for our implementation

Your A3 decision means **only administrators can create official localities**. However, devotees can submit proposed areas, and the original submitter can edit or withdraw their own eligible proposal.

These are different actions and must have different permissions.

### Acceptance criteria

- Visitors cannot bypass login requirements by calling APIs directly.
- Devotees cannot access administrator-only operations.
- Devotees cannot modify another person's proposal.
- Sessions and credentials are handled securely.
- Permission tests cover both allowed and denied actions.

---

# PART III — Geographic intelligence

## Phase 5 — Build the geographic hierarchy

**Goal:** Make the platform capable of handling a campaign that expands into any number of areas.

### Tasks

- [ ] 5.1 Define the official area model.
- [ ] 5.2 Support parent-child relationships.
- [ ] 5.3 Support different area types without hardcoding one administrative system.
- [ ] 5.4 Define the difference between a locality, a larger region, and a point of interest.
- [ ] 5.5 Define how areas without boundaries are represented.
- [ ] 5.6 Define how multiple areas can relate to one another.
- [ ] 5.7 Validate parent-child relationships.
- [ ] 5.8 Prevent accidental hierarchy cycles.
- [ ] 5.9 Define aggregation rules for larger areas.
- [ ] 5.10 Define behavior when an area is renamed, merged, retired, or replaced.
- [ ] 5.11 Define how historical invitation reports remain associated with their original geographic context.
- [ ] 5.12 Build an administrator interface for managing the hierarchy.

### Critical aggregation rule

An invitation report should belong to one designated reporting area.

When showing statistics for a larger region, the system can aggregate reports from its descendants. It must not count both a parent area's aggregate and the same reports from its child areas.

Otherwise, our analytics will inflate invitation counts.

### Acceptance criteria

- Areas can be added at different geographic levels.
- The hierarchy can grow without code changes for each new locality.
- Invalid parent-child relationships are rejected.
- Aggregation counts each eligible report once.

---

## Phase 6 — Integrate Google Maps

**Goal:** Provide a useful interactive map and reliable place-search experience.

### Tasks

- [ ] 6.1 Set up a Google Cloud project.
- [ ] 6.2 Enable the specific Maps Platform APIs required by the implementation.
- [ ] 6.3 Configure API restrictions and billing alerts.
- [ ] 6.4 Store keys and secrets according to their intended use.
- [ ] 6.5 Build a reusable map component.
- [ ] 6.6 Display approved geographic boundaries.
- [ ] 6.7 Display markers for areas that have locations but no boundary.
- [ ] 6.8 Add map zoom and pan controls.
- [ ] 6.9 Add place search and autocomplete.
- [ ] 6.10 Add reverse-geocoding support where appropriate.
- [ ] 6.11 Add map overlays and area-selection interactions.
- [ ] 6.12 Add a legend for coverage categories.
- [ ] 6.13 Add loading and error handling for map services.
- [ ] 6.14 Test map behavior on mobile devices.
- [ ] 6.15 Review Google's applicable data-storage, display, attribution, and caching requirements.

### Acceptance criteria

- The map loads correctly with valid configuration.
- Approved boundaries and markers display correctly.
- Place suggestions are selectable.
- Map-service failures do not crash the entire website.
- API usage can be monitored and spending limits or alerts are configured.

Google Maps API availability and pricing depend on the specific services selected, so we'll verify the current requirements when configuring the project rather than assume every API is automatically included.

---

## Phase 7 — Boundary creation, editing, and import

**Goal:** Establish accurate geographic boundaries.

### Tasks

- [ ] 7.1 Implement polygon drawing.
- [ ] 7.2 Implement polygon editing.
- [ ] 7.3 Implement polygon deletion before submission.
- [ ] 7.4 Allow coordinate-based boundary input.
- [ ] 7.5 Support supported Google Maps links where coordinates can be extracted reliably.
- [ ] 7.6 Validate longitude and latitude.
- [ ] 7.7 Validate polygon closure and geometry.
- [ ] 7.8 Support draft polygons generated from boundary points.
- [ ] 7.9 Let users preview and adjust draft boundaries.
- [ ] 7.10 Support GeoJSON import.
- [ ] 7.11 Validate imported files and reject malformed geometry.
- [ ] 7.12 Detect possible overlaps and duplicate boundaries.
- [ ] 7.13 Record boundary source and review status.
- [ ] 7.14 Add safe limits for uploaded file size and geometry complexity.
- [ ] 7.15 Test complex polygons and invalid input.

### Three or more coordinates

A polygon requires at least three distinct vertices. Coordinates must be interpreted in the correct order, and a polygon ring must be closed according to GeoJSON requirements.

If the submitted points are not in boundary order, the system can attempt to produce a draft outline, but it must not claim that the resulting geometry accurately represents the real locality.

### Acceptance criteria

- Valid polygons can be created and edited.
- Invalid geometries are rejected.
- Drafts can be previewed before submission.
- Imported boundaries undergo validation.
- The system retains the source and status of each official boundary.

---

## Phase 8 — Locality proposals and administrative review

**Goal:** Let devotees contribute geographic information without allowing unapproved data to alter the official map.

This phase implements your locality workflow in full.

### Tasks

- [ ] 8.1 Build the locality proposal form.
- [ ] 8.2 Allow authenticated devotees to submit proposals.
- [ ] 8.3 Include locality name, proposed parent, boundary, and supporting information.
- [ ] 8.4 Display the proposed boundary before submission.
- [ ] 8.5 Save proposals separately from official areas.
- [ ] 8.6 Create a devotee-visible proposal history.
- [ ] 8.7 Display proposal status and timestamps.
- [ ] 8.8 Allow the original submitter to edit their eligible proposal.
- [ ] 8.9 Allow the original submitter to withdraw their eligible proposal.
- [ ] 8.10 Prevent other devotees from modifying that submission.
- [ ] 8.11 Preserve versions and important proposal events.
- [ ] 8.12 Detect likely duplicates.
- [ ] 8.13 Link related proposals where appropriate.
- [ ] 8.14 Build the administrator review queue.
- [ ] 8.15 Implement approval, rejection, and request-for-correction actions.
- [ ] 8.16 Prevent approval from creating duplicate official areas.
- [ ] 8.17 Handle two proposals submitted simultaneously.
- [ ] 8.18 Notify the submitter when the status changes.
- [ ] 8.19 Ensure pending proposals never affect official coverage statistics.
- [ ] 8.20 Test every permission and lifecycle transition.

### Proposal statuses

A practical starting lifecycle is:

`Pending → Needs Correction → Pending → Approved`

Alternative outcomes:

- Rejected.
- Withdrawn.
- Duplicate of another proposal.

The exact transition rules will be defined in the API and tested. For example, a withdrawn proposal should not silently become editable again; a new submission or explicit resubmission flow should be used.

### Acceptance criteria

- Devotees can see the proposal history.
- A submitter can manage only their own eligible proposal.
- The administrator can review and resolve proposals.
- Duplicate proposals can be linked without erasing their histories.
- Only approved areas enter the official geographic dataset.

---

# PART IV — Invitation management

## Phase 9 — Population management

**Goal:** Give coverage statistics a meaningful denominator.

### Tasks

- [ ] 9.1 Build the population-management interface.
- [ ] 9.2 Allow administrators to enter population estimates.
- [ ] 9.3 Associate estimates with the correct geographic area.
- [ ] 9.4 Record the source of each estimate.
- [ ] 9.5 Record the estimate date and last verification date.
- [ ] 9.6 Distinguish verified figures from estimates.
- [ ] 9.7 Support importing population data from suitable files.
- [ ] 9.8 Validate imported rows and report errors.
- [ ] 9.9 Preserve historical population records.
- [ ] 9.10 Allow administrators to correct estimates without erasing their history.
- [ ] 9.11 Display missing or outdated population data.
- [ ] 9.12 Define aggregation rules for populations across geographic hierarchies.
- [ ] 9.13 Detect overlapping geographic areas that could cause double-counting.

### Important rule

We must not blindly add population estimates from overlapping or nested areas.

For example, if a region's population already includes three localities, adding the region's population to the populations of those three localities would inflate the total.

The system needs to understand whether figures describe a complete parent area or only a specific child area.

### Acceptance criteria

- Every estimate has an identifiable source and date where available.
- Missing data is clearly identified.
- Historical estimates remain available.
- Parent-level population aggregation does not double-count nested areas.

---

## Phase 10 — Invitation reporting

**Goal:** Let registered devotees report the number of people they have invited.

### Tasks

- [ ] 10.1 Build the Add Invitations page.
- [ ] 10.2 Allow the devotee to select an approved locality.
- [ ] 10.3 Allow entry of the invitation count.
- [ ] 10.4 Capture the reporting date.
- [ ] 10.5 Optionally capture invitation method and notes.
- [ ] 10.6 Validate the count and reject invalid values.
- [ ] 10.7 Save the report with its submitter and locality.
- [ ] 10.8 Prevent accidental duplicate submissions where possible.
- [ ] 10.9 Show a clear success confirmation.
- [ ] 10.10 Build the devotee's My Reports page.
- [ ] 10.11 Define whether and how a devotee may correct their own report.
- [ ] 10.12 Implement authorized corrections and audit history.
- [ ] 10.13 Allow administrators to review suspicious reports.
- [ ] 10.14 Add report filters and pagination.
- [ ] 10.15 Test simultaneous submissions and repeated requests.

### Example report

A devotee reports inviting 35 people in a locality.

The database records:

- The devotee who submitted the report.
- The reporting locality.
- The number of people reported.
- The reporting date.
- The submission timestamp.
- The report's current status.
- Its correction history, if applicable.

The report then contributes to the relevant geographic statistics according to the project's aggregation rules.

### Avoiding misleading numbers

At launch, we can count reported invitations, but we cannot automatically guarantee that every report refers to a different person.

If two devotees invite the same person, both may report that invitation.

Therefore, the website must not label the total as verified unique people reached unless we introduce a reliable and privacy-conscious deduplication method.

### Acceptance criteria

- Only authorized users can submit reports.
- Every report belongs to a valid reporting area.
- Invalid counts are rejected.
- Corrections are traceable.
- Repeated requests do not accidentally create duplicate records.
- Report totals are calculated consistently.

---

## Phase 11 — Invitation coverage calculations

**Goal:** Convert reports into understandable geographic progress.

### Tasks

- [ ] 11.1 Define the authoritative method for calculating invitation totals.
- [ ] 11.2 Aggregate eligible reports by locality.
- [ ] 11.3 Aggregate child-area totals into larger regions.
- [ ] 11.4 Calculate reported invitation coverage.
- [ ] 11.5 Handle missing population estimates.
- [ ] 11.6 Handle zero population estimates safely.
- [ ] 11.7 Handle percentages above 100% without silently capping them.
- [ ] 11.8 Distinguish missing data from genuine zero activity.
- [ ] 11.9 Add date-range filters where appropriate.
- [ ] 11.10 Add a defined reporting timezone.
- [ ] 11.11 Ensure map colors match the displayed statistics.
- [ ] 11.12 Test aggregation against known sample datasets.

### Coverage formula

\[
\text{Reported Coverage (\%)} =
\frac{\text{Eligible Reported Invitations}}
{\text{Population Estimate}}
\times 100
\]

The calculation is available only when the population estimate is valid and positive.

If the percentage exceeds 100%, we'll display it and flag it for review where appropriate. We won't silently change the underlying number.

### Acceptance criteria

The map, area-detail pages, dashboards, and analytics must all use consistent definitions and produce matching totals for the same filters.

---

# PART V — The website experience

## Phase 12 — Build the public pages

**Goal:** Make the platform useful even for people who never register.

### Tasks

- [ ] 12.1 Build the Home page.
- [ ] 12.2 Build the About page.
- [ ] 12.3 Build the Interactive Map page.
- [ ] 12.4 Build Area Details pages.
- [ ] 12.5 Display the Mahotsav venue as a separate point of interest.
- [ ] 12.6 Display approved geographic boundaries.
- [ ] 12.7 Display invitation totals and coverage where data is available.
- [ ] 12.8 Show the population estimate and its status.
- [ ] 12.9 Show active contributors and other approved public statistics.
- [ ] 12.10 Add area search.
- [ ] 12.11 Add map filters.
- [ ] 12.12 Add loading, empty, and error states.
- [ ] 12.13 Ensure pending proposals remain private to the appropriate authenticated audience.
- [ ] 12.14 Test mobile and desktop navigation.
- [ ] 12.15 Check accessibility and basic search-engine optimization.

### Map behavior

When someone selects an area, the website should open a detail panel showing information such as:

- Area name and geographic level.
- Population estimate.
- Reported invitations.
- Reported invitation coverage.
- Number of active contributors.
- Last report date.
- Data-quality warnings, if applicable.

The map should not attempt to display every contributor avatar simultaneously. We'll use aggregated markers or counts and load more detail when a user selects an area.

### Acceptance criteria

A visitor can explore the approved map, search for areas, select them, and understand the displayed statistics without registering.

---

## Phase 13 — Build the devotee dashboard

**Goal:** Give each devotee a useful view of their own contribution.

### Tasks

- [ ] 13.1 Build the dashboard overview.
- [ ] 13.2 Display the devotee's reported invitation total.
- [ ] 13.3 Display their recent reports.
- [ ] 13.4 Add report-history filters.
- [ ] 13.5 Link to Add Invitations.
- [ ] 13.6 Link to Locality Proposals.
- [ ] 13.7 Display proposal status changes.
- [ ] 13.8 Add profile management.
- [ ] 13.9 Display clear validation and error messages.
- [ ] 13.10 Add pagination for long histories.
- [ ] 13.11 Test all dashboard actions against server-side permissions.

### Acceptance criteria

The dashboard displays the correct account's data and never leaks another devotee's private information.

---

## Phase 14 — Build the administrator dashboard

**Goal:** Make routine administration possible without touching the codebase.

### Tasks

- [ ] 14.1 Build the administrator overview.
- [ ] 14.2 Display pending locality proposals.
- [ ] 14.3 Display invitation reports awaiting review, if review is enabled.
- [ ] 14.4 Add area creation and editing.
- [ ] 14.5 Add boundary import and editing.
- [ ] 14.6 Add population management.
- [ ] 14.7 Add devotee management.
- [ ] 14.8 Add report correction and moderation tools.
- [ ] 14.9 Add filters and search to administrative tables.
- [ ] 14.10 Add confirmation dialogs for destructive actions.
- [ ] 14.11 Add audit-history views.
- [ ] 14.12 Add export functionality where authorized.
- [ ] 14.13 Add pagination and bulk operations where useful.
- [ ] 14.14 Add clear success and failure messages.
- [ ] 14.15 Test administrator actions against realistic data.

### Acceptance criteria

Administrators can manage approved areas, proposals, reports, population data, and user accounts through the UI.

No normal administrative workflow should require editing database records manually or changing source code.

---

## Phase 15 — Analytics and leaderboard

**Goal:** Make progress measurable without encouraging misleading competition.

### Tasks

- [ ] 15.1 Build geographic coverage summaries.
- [ ] 15.2 Add date-range filters.
- [ ] 15.3 Add area-level comparisons.
- [ ] 15.4 Add invitation trends over time.
- [ ] 15.5 Add contributor activity statistics.
- [ ] 15.6 Add top-contributor views if approved for the campaign.
- [ ] 15.7 Define leaderboard ranking rules.
- [ ] 15.8 Distinguish raw invitation totals from verified unique recipients.
- [ ] 15.9 Exclude invalid or rejected reports from eligible totals.
- [ ] 15.10 Add clear handling of ties.
- [ ] 15.11 Protect personal information in public rankings.
- [ ] 15.12 Test analytics against the underlying reports.

### Recommended leaderboard metrics

- Total eligible reported invitations.
- Number of reporting days.
- Number of localities contributed to.
- Recent activity.
- Geographic coverage contributions.

We should avoid ranking devotees solely by the number of reports they submit. One large, valid report should not necessarily be treated as less meaningful than many tiny reports.

The final ranking rules should be transparent and should not reward duplicate or invalid reporting.

---

# PART VI — Reliability, security, and production readiness

## Phase 16 — Notifications and communication

**Goal:** Keep users informed without requiring them to constantly refresh the website.

### Tasks

- [ ] 16.1 Establish an in-app notification system if needed.
- [ ] 16.2 Notify a devotee when their locality proposal is approved.
- [ ] 16.3 Notify them when a proposal is rejected or requires correction.
- [ ] 16.4 Notify them when their proposal is marked as a potential duplicate.
- [ ] 16.5 Provide an administrator view of pending work.
- [ ] 16.6 Add reminders for proposals awaiting review.
- [ ] 16.7 Consider email notifications for important events.
- [ ] 16.8 Avoid sending duplicate notifications for repeated events.
- [ ] 16.9 Add notification preferences if the system grows.
- [ ] 16.10 Test delivery failures and retry behavior.

**Important:** Notifications should inform people about actual database state changes. A notification failure must not reverse a successful approval or submission.

---

## Phase 17 — Security and privacy hardening

**Goal:** Make sure the website protects its users and its data.

### Tasks

- [ ] 17.1 Review authentication and session security.
- [ ] 17.2 Review authorization on every protected endpoint.
- [ ] 17.3 Validate all user-controlled input on the server.
- [ ] 17.4 Prevent NoSQL injection and unsafe database query construction.
- [ ] 17.5 Protect against cross-site scripting.
- [ ] 17.6 Configure appropriate cross-origin and security headers.
- [ ] 17.7 Apply CSRF protections where applicable to the chosen authentication approach.
- [ ] 17.8 Rate-limit sensitive endpoints.
- [ ] 17.9 Protect file uploads and GeoJSON imports.
- [ ] 17.10 Avoid leaking database errors or internal stack traces.
- [ ] 17.11 Protect administrator accounts with stronger authentication where feasible.
- [ ] 17.12 Review password recovery and account-recovery flows.
- [ ] 17.13 Minimize personal information collected.
- [ ] 17.14 Define who can see devotee names, profiles, and contribution details.
- [ ] 17.15 Define data retention and deletion policies.
- [ ] 17.16 Test common authorization and input-validation failures.
- [ ] 17.17 Review dependencies for known vulnerabilities.
- [ ] 17.18 Ensure secrets never appear in source code, logs, or client bundles.

### Privacy decisions

We should not collect exact home addresses or precise personal locations unless a feature genuinely requires them.

For geographic submissions, the system needs the proposed area boundary, not the submitter's personal movement history.

The public map can display aggregated statistics without exposing private account information.

We should also decide whether contributor names are public, visible only to registered devotees, or visible only to administrators. Until that decision is made, the safer default is to expose aggregated contributor counts publicly and restrict identifiable contributor details.

---

## Phase 18 — Performance and scalability

**Goal:** Keep the website responsive as the number of areas, devotees, and reports grows.

### Tasks

- [ ] 18.1 Measure the performance of core pages.
- [ ] 18.2 Optimize MongoDB queries and indexes.
- [ ] 18.3 Add pagination to large lists.
- [ ] 18.4 Avoid loading every locality and boundary simultaneously.
- [ ] 18.5 Load detailed boundary data only when useful.
- [ ] 18.6 Simplify complex geographic boundaries when appropriate.
- [ ] 18.7 Load contributor details on demand.
- [ ] 18.8 Avoid repeated expensive aggregation queries.
- [ ] 18.9 Cache eligible public results where safe.
- [ ] 18.10 Invalidate caches when relevant data changes.
- [ ] 18.11 Avoid exposing private or pending data through shared caches.
- [ ] 18.12 Add sensible request timeouts and limits.
- [ ] 18.13 Test with realistic volumes of geographic and invitation data.
- [ ] 18.14 Establish performance targets for the core workflows.

### Map-loading strategy

At a broad zoom level, show a manageable set of geographic outlines and aggregated information.

As the user zooms in or selects an area, load more detailed boundaries and statistics as needed.

This prevents the map from becoming slow simply because the campaign includes many localities.

---

## Phase 19 — Accessibility, compatibility, and usability

**Goal:** Ensure people can actually use the website on the devices they have.

### Tasks

- [ ] 19.1 Test mobile phones, tablets, and desktop screens.
- [ ] 19.2 Test major supported browsers.
- [ ] 19.3 Ensure forms work with keyboard navigation.
- [ ] 19.4 Add appropriate labels and accessible error messages.
- [ ] 19.5 Maintain sufficient text contrast.
- [ ] 19.6 Ensure buttons and touch targets are usable on mobile.
- [ ] 19.7 Provide a list-based alternative to map-only interactions.
- [ ] 19.8 Handle slow internet connections gracefully.
- [ ] 19.9 Test zooming, scrolling, and map interactions on mobile.
- [ ] 19.10 Check long names, large counts, and unusual data values.
- [ ] 19.11 Test the interface with realistic user workflows rather than screenshots alone.

A map is inherently visual, so we should not make it the only way to discover or access geographic information. Search results and area lists should provide an alternative.

---

# PART VII — Testing and release

## Phase 20 — Automated and manual testing

**Goal:** Prove that the entire system works before opening it to users.

### Unit tests

Test individual functions such as:

- Coverage calculations.
- Polygon validation.
- Permission checks.
- Geographic aggregation.
- Duplicate detection.
- Input validation.
- Report eligibility.

### Integration tests

Test interactions between:

- API routes and MongoDB.
- Authentication and protected endpoints.
- Proposal submissions and database records.
- Approval actions and official areas.
- Invitation reports and coverage calculations.
- Population updates and analytics.
- Notifications and state changes.

### End-to-end tests

Test complete user journeys.

**Journey A: Visitor**

1. Opens the website.
2. Opens the interactive map.
3. Searches for an area.
4. Selects it.
5. Views its statistics.

**Journey B: Devotee**

1. Logs in.
2. Selects an approved locality.
3. Submits an invitation report.
4. Sees the updated report in their dashboard.
5. Views the locality proposal history.

**Journey C: Locality proposal**

1. A registered devotee creates a proposal.
2. The proposal becomes visible in the authenticated proposal history.
3. The submitter edits it.
4. Another devotee attempts to edit it and is denied.
5. An administrator reviews it.
6. The administrator approves it.
7. The locality becomes official.
8. The map displays the approved area.

**Journey D: Duplicate proposal**

1. Two devotees submit similar areas.
2. The system flags a possible duplicate.
3. The administrator reviews both.
4. One is approved.
5. The other is linked to the official area or otherwise resolved.
6. Both histories remain traceable.

**Journey E: Security**

1. A visitor attempts to submit an invitation report.
2. The server denies the request.
3. A devotee attempts an administrator-only action.
4. The server denies the request.
5. A devotee attempts to modify another person's proposal.
6. The server denies the request.

### Regression testing

After every substantial change, rerun the tests for previously completed functionality.

A new dashboard feature must not break authentication. A map improvement must not change coverage calculations. A database migration must not corrupt invitation history.

### Acceptance criteria

The release candidate must pass the required automated checks and the documented critical user journeys. Any unresolved failure must be documented, assessed, and either fixed or explicitly accepted before release.

---

## Phase 21 — Deployment and production configuration

**Goal:** Publish the website safely and reproducibly.

### Tasks

- [ ] 21.1 Choose the production hosting provider.
- [ ] 21.2 Configure production environment variables.
- [ ] 21.3 Configure the production MongoDB deployment.
- [ ] 21.4 Configure the required Google Maps APIs.
- [ ] 21.5 Configure the production domain.
- [ ] 21.6 Configure HTTPS.
- [ ] 21.7 Configure authentication callback URLs and trusted origins.
- [ ] 21.8 Configure production logging and error reporting.
- [ ] 21.9 Configure backups and retention.
- [ ] 21.10 Configure health checks and uptime monitoring.
- [ ] 21.11 Establish a repeatable deployment process.
- [ ] 21.12 Document how to roll back a faulty release.
- [ ] 21.13 Run production smoke tests.
- [ ] 21.14 Verify that no development credentials or test data remain.
- [ ] 21.15 Verify that the production build contains no unintended secrets.
- [ ] 21.16 Test database restoration before launch.
- [ ] 21.17 Record the release version and deployment date.

### Environments

We'll keep separate configurations for:

- **Development:** Local coding and experimentation.
- **Testing/staging:** Verification of release candidates.
- **Production:** The live website and real campaign data.

Development and staging must not accidentally use production data or send real notifications without explicit configuration.

### Acceptance criteria

The website can be deployed from a known code revision, configured without modifying source code, checked after deployment, and rolled back if necessary.

---

## Phase 22 — Controlled launch

**Goal:** Release the website without immediately exposing every possible problem to everyone.

### Launch checklist

- [ ] 22.1 Create the first administrator account securely.
- [ ] 22.2 Verify that administrator access works.
- [ ] 22.3 Import or create the initial approved geographic areas.
- [ ] 22.4 Add the Mahotsav venue as a point of interest.
- [ ] 22.5 Validate the initial population dataset.
- [ ] 22.6 Test invitation reporting with controlled test accounts.
- [ ] 22.7 Verify map coverage against known sample calculations.
- [ ] 22.8 Verify locality proposal permissions.
- [ ] 22.9 Verify database backups and recovery procedures.
- [ ] 22.10 Verify monitoring and error reporting.
- [ ] 22.11 Remove test accounts and test records where appropriate.
- [ ] 22.12 Publish basic user instructions.
- [ ] 22.13 Conduct a small pilot with selected devotees.
- [ ] 22.14 Fix critical usability and reliability problems.
- [ ] 22.15 Open registration and campaign access according to the launch policy.

### Recommended launch strategy

**Pilot → limited release → full release.**

This lets us discover real-world problems before the whole campaign depends on the website.

We should not treat a successful development build as proof that the application is ready for production.

---

# PART VIII — After launch: keeping the website alive

Now we get to the part most developers conveniently forget. 💀

A website is not finished when it goes live. It becomes a living system that needs monitoring, maintenance, data-quality checks, security updates, and occasional improvements.

We'll establish a recurring maintenance schedule **before launch**, so nobody has to invent one during a crisis.

## Phase 23 — First 72 hours after launch

**Goal:** Catch launch problems quickly.

### Tasks

- [ ] 23.1 Check website availability and response times.
- [ ] 23.2 Review application errors.
- [ ] 23.3 Check authentication and registration failures.
- [ ] 23.4 Verify that invitation reports are being saved correctly.
- [ ] 23.5 Verify that map searches and boundaries work.
- [ ] 23.6 Check Google Maps API errors and usage.
- [ ] 23.7 Check database performance and connection failures.
- [ ] 23.8 Review locality proposals and duplicate warnings.
- [ ] 23.9 Confirm notifications are delivered where enabled.
- [ ] 23.10 Collect feedback from pilot users.
- [ ] 23.11 Fix critical bugs before adding optional features.
- [ ] 23.12 Record issues, their severity, and their resolutions.

**Priority order:** Data loss and security incidents first, broken core workflows second, major usability issues third, cosmetic improvements afterward.

---

## Phase 24 — Daily operations

**Goal:** Keep the campaign running smoothly.

### Daily checks

- [ ] Check whether the website is online.
- [ ] Review critical application errors and alerts.
- [ ] Check failed invitation submissions.
- [ ] Review pending locality proposals.
- [ ] Identify proposals that may be duplicates.
- [ ] Check for unusually high invitation counts or suspicious activity.
- [ ] Verify that administrators can access the review queue.
- [ ] Check Google Maps API errors and abnormal usage.
- [ ] Review failed background jobs or notifications, if applicable.
- [ ] Confirm that automated backups completed successfully.

Not every task needs to be performed manually. Availability checks, error alerts, backup verification, and certain anomaly checks can be automated.

**Important:** An alert should identify an actionable problem, not simply generate noise. We'll configure thresholds and escalation rules so genuine incidents receive attention.

---

## Phase 25 — Weekly maintenance

**Goal:** Keep data accurate and resolve recurring operational issues.

### Tasks

- [ ] 25.1 Review unresolved locality proposals.
- [ ] 25.2 Review potential duplicate areas.
- [ ] 25.3 Review boundary corrections.
- [ ] 25.4 Review population records that are missing or outdated.
- [ ] 25.5 Review suspicious or inconsistent invitation reports.
- [ ] 25.6 Compare dashboard statistics against underlying data.
- [ ] 25.7 Review failed notifications and scheduled jobs.
- [ ] 25.8 Review user feedback and bug reports.
- [ ] 25.9 Check application performance trends.
- [ ] 25.10 Review API usage and cost trends.
- [ ] 25.11 Check backup status and investigate failures.
- [ ] 25.12 Prioritize the next week's fixes and improvements.

### Weekly deliverable

A short operational report containing:

- New issues.
- Resolved issues.
- Outstanding problems.
- Data-quality warnings.
- Security or availability incidents.
- API and infrastructure cost trends.
- Planned work for the next week.

We can automate much of this report later.

---

## Phase 26 — Monthly maintenance

**Goal:** Keep the system secure, sustainable, and understandable.

### Tasks

- [ ] 26.1 Review dependency updates and security advisories.
- [ ] 26.2 Apply appropriate patches after testing.
- [ ] 26.3 Review access permissions and administrator accounts.
- [ ] 26.4 Review database storage and query performance.
- [ ] 26.5 Test a database restoration from backup.
- [ ] 26.6 Review Google Maps usage and billing.
- [ ] 26.7 Review geographic data quality.
- [ ] 26.8 Review population estimates and their sources.
- [ ] 26.9 Review account-management and abuse reports.
- [ ] 26.10 Review application performance on mobile devices.
- [ ] 26.11 Review error rates and availability trends.
- [ ] 26.12 Review privacy and data-retention practices.
- [ ] 26.13 Remove genuinely obsolete data only according to the approved retention policy.
- [ ] 26.14 Plan and test the next maintenance release.

### Monthly deliverable

A maintenance summary containing system health, costs, backup status, security updates, data quality, and planned improvements.

---

## Phase 27 — Quarterly maintenance

**Goal:** Ensure the platform remains reliable as the campaign expands.

### Tasks

- [ ] 27.1 Review the overall architecture.
- [ ] 27.2 Review database indexes and query patterns.
- [ ] 27.3 Test restoration and disaster-recovery procedures.
- [ ] 27.4 Review account roles and administrative access.
- [ ] 27.5 Audit geographic aggregation and reporting accuracy.
- [ ] 27.6 Review whether new area types or hierarchy structures are needed.
- [ ] 27.7 Review accessibility and usability.
- [ ] 27.8 Review hosting and API costs.
- [ ] 27.9 Review incident response procedures.
- [ ] 27.10 Review backup retention and recovery objectives.
- [ ] 27.11 Review major dependency upgrades.
- [ ] 27.12 Update project documentation.
- [ ] 27.13 Review the roadmap against actual campaign needs.

Quarterly reviews are also a good time to decide whether a proposed feature solves a genuine problem or merely adds complexity.

---

# PART IX — Feature updates after launch

Operational maintenance and new features are different things. We need a process for both.

## Phase 28 — The ongoing development cycle

Every proposed feature or bug fix should pass through this workflow:

**1. Record the issue or idea**

Create a task with a clear title, description, priority, and expected outcome.

**2. Classify it**

Use categories such as:

- Critical security issue.
- Data integrity issue.
- Production bug.
- Usability improvement.
- Performance improvement.
- New feature.
- Documentation or maintenance.

**3. Define acceptance criteria**

Describe how we'll know the task is complete.

**4. Check dependencies**

Identify affected pages, API routes, database collections, permissions, and existing workflows.

**5. Implement the change**

Work in a separate branch or an otherwise controlled change set.

**6. Run tests**

Execute the relevant unit, integration, permission, and end-to-end tests.

**7. Run regression checks**

Verify that existing functionality remains intact.

**8. Review the change**

Check code quality, JavaScript-only compliance, security, data integrity, and documentation.

**9. Deploy safely**

Use staging when appropriate, then deploy to production through the established release process.

**10. Verify production behavior**

Check logs, metrics, and the affected workflow after deployment.

**11. Update documentation**

Record the behavior change, configuration changes, and any new operational requirements.

**12. Close the task**

Mark it complete only after the acceptance criteria have been met.

### How frequently should we release updates?

A sensible starting point is:

- **Critical security or data-integrity fixes:** As quickly as safely possible.
- **Important production bug fixes:** Based on severity, with expedited releases when necessary.
- **Routine improvements:** In planned release batches, perhaps weekly or fortnightly.
- **Major features:** Through a dedicated implementation and testing cycle.

These are starting guidelines, not deadlines that override proper testing.

---

# PART X — Automation, monitoring, and project intelligence 🤖

## Phase 29 — Automate repetitive maintenance

**Goal:** Reduce manual work without sacrificing oversight.

We should gradually automate the following tasks.

| Automation                   | Suggested frequency            | Purpose                                |
| ---------------------------- | ------------------------------ | -------------------------------------- |
| Website availability check   | Every 5 minutes                | Detect downtime                        |
| Error-rate monitoring        | Continuous                     | Detect production failures             |
| Backup verification          | Daily                          | Confirm backups are completing         |
| Pending-proposal summary     | Daily                          | Help administrators prioritize reviews |
| Duplicate-area checks        | On submission and periodically | Detect possible duplicates             |
| Data-quality checks          | Daily                          | Find invalid or inconsistent records   |
| Google Maps usage monitoring | Daily                          | Identify unusual API usage             |
| Weekly operational report    | Weekly                         | Summarize system health                |
| Dependency security review   | Weekly                         | Identify relevant vulnerabilities      |
| Database restoration test    | Monthly                        | Verify recoverability                  |
| Access review                | Monthly or quarterly           | Remove unnecessary permissions         |
| Performance review           | Monthly                        | Identify bottlenecks                   |
| Roadmap review               | Monthly                        | Reprioritize upcoming work             |

Actual frequencies can be adjusted according to usage, hosting capabilities, and cost.

### Important safeguards

- Automated duplicate detection must not automatically delete legitimate areas.
- Automated alerts must not expose sensitive user information.
- Backup success must be verified rather than inferred from a scheduled job completing.
- Automated maintenance must not modify production data without the required authorization.
- Dependency updates must be tested before deployment.

## Phase 30 — Build an internal operational dashboard

Eventually, administrators should have a dedicated view of the website's operational health.

It can show:

- Current application status.
- Recent errors.
- Pending locality proposals.
- Failed background jobs.
- Backup status.
- Database health indicators.
- Google Maps API usage and cost indicators.
- Recent deployments.
- Outstanding maintenance tasks.

This should be separate from the public campaign analytics dashboard.

**Campaign analytics tells us how the outreach is progressing. Operational analytics tells us whether the website itself is healthy.**

We should not mix those two responsibilities.

---

# PART XI — Data lifecycle and long-term reliability

## Phase 31 — Handle changes without destroying history

As the campaign grows, geographic data will inevitably change.

A locality may be renamed. Two proposals may turn out to describe the same area. A boundary may be corrected. Population estimates may be updated.

The system must accommodate these changes without corrupting historical reports.

### Tasks

- [ ] 31.1 Define how areas are renamed.
- [ ] 31.2 Define how areas are merged.
- [ ] 31.3 Define how areas are split.
- [ ] 31.4 Define how boundaries are corrected.
- [ ] 31.5 Define how retired areas are displayed.
- [ ] 31.6 Preserve report history through area changes.
- [ ] 31.7 Record who performed each important change.
- [ ] 31.8 Define whether historical statistics use current or historical boundaries.
- [ ] 31.9 Provide an administrative correction workflow.
- [ ] 31.10 Test all supported geographic change operations.

### Why this matters

Suppose a locality is split into two smaller areas after several months of invitation reporting.

We must decide whether historical reports remain attached to the original locality, are reassigned with an auditable correction, or are displayed using the historical boundary.

We cannot simply move all old reports around and pretend nothing happened.

The policy should be explicit, and every reassignment must be traceable.

---

## Phase 32 — Backup and disaster recovery

**Goal:** Ensure that a technical failure doesn't destroy the campaign's data.

### Tasks

- [ ] 32.1 Define recovery-point objectives: how much recent data loss is acceptable in a disaster.
- [ ] 32.2 Define recovery-time objectives: how quickly the website must return.
- [ ] 32.3 Configure automated database backups.
- [ ] 32.4 Protect backups with appropriate access controls.
- [ ] 32.5 Establish a backup-retention policy.
- [ ] 32.6 Monitor backup failures.
- [ ] 32.7 Test database restoration.
- [ ] 32.8 Document restoration procedures.
- [ ] 32.9 Document production rollback procedures.
- [ ] 32.10 Test recovery periodically.
- [ ] 32.11 Document emergency contacts and escalation responsibilities.

A backup that has never been restored successfully is an assumption, not a proven recovery plan.

We should verify the entire recovery process before launch and repeat the test periodically.

---

# PART XII — Future expansion

These features are not required for the initial release, but the architecture should leave room for them.

## Phase 33 — Advanced geographic features

Possible future additions:

- Multiple geographic boundary sources.
- Bulk geographic-data imports.
- More advanced polygon validation.
- Boundary version comparison.
- Area merge and split tools.
- Better detection of overlapping areas.
- Administrative approval queues for large imports.
- Configurable geographic hierarchies.
- Faster map rendering for very large datasets.

## Phase 34 — Advanced campaign features

Possible future additions:

- More detailed contributor analytics.
- Area coordinators.
- Campaign-specific targets.
- QR codes for accessing the website.
- Exportable campaign reports.
- Additional languages.
- Progressive Web App support.
- Better handling of unstable internet connections.
- Carefully designed offline reporting with conflict resolution.
- Additional dashboards for organizers.

## Phase 35 — Privacy-conscious deduplication

If the campaign eventually needs to estimate unique people invited rather than simply reported invitations, we'll need a separate design.

Potential approaches could include controlled recipient-level records, privacy-conscious deduplication, or other methods appropriate to the campaign.

This must be designed carefully because it introduces additional personal-data considerations.

It should not be added casually just to make the coverage percentage look more precise.

---

# PART XIII — The coding AI's operating rules

This section is especially important because we'll be using a coding AI to implement the roadmap.

The roadmap alone isn't enough. We also need a repeatable process for executing it.

## Phase 36 — Establish the coding protocol

Every implementation batch should follow these rules.

### Rule A: Inspect before changing

Before modifying the project, the coding AI must inspect the relevant files, existing architecture, dependencies, and current Git state.

It must not assume that the repository is empty or that previous work can be discarded.

### Rule B: Work in substantial, coherent batches

We can assign multiple related tasks together.

For example, a geographic-proposal batch might include:

- Database schema.
- API endpoints.
- Input validation.
- Authorization.
- Proposal-history interface.
- Editing and withdrawal behavior.
- Automated tests.
- Documentation.

This is more efficient than sending a separate message for every tiny task.

However, tasks should be grouped by dependencies and risk. Authentication, data migrations, and production deployment may require separate checkpoints even when other features can be batched together.

### Rule C: Never claim success without evidence

The coding AI must report:

- What it changed.
- What it tested.
- Which tests passed.
- Which tests failed.
- Which checks were not run.
- Any unresolved limitations.

A successful build is not proof that every feature works.

### Rule D: Preserve existing functionality

The coding AI must not casually delete files, replace working architecture, remove features, or rewrite unrelated components.

Changes should be scoped and reviewed.

### Rule E: Enforce JavaScript-only development

Every implementation batch must respect our `.js` and `.jsx` requirement.

The AI should check for accidental TypeScript files, imports, dependencies, and configuration.

### Rule F: Protect real data

Database migrations, bulk operations, production changes, and destructive actions require explicit safeguards.

The coding AI must not use real production data as disposable test data.

### Rule G: Maintain a project checkpoint

At the end of each substantial batch, update the project's progress records.

Recommended files include:

| File                | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `ROADMAP.md`        | The master implementation roadmap              |
| `PROJECT_STATUS.md` | Current implementation state                   |
| `CHANGELOG.md`      | User-visible and technical changes             |
| `ARCHITECTURE.md`   | System architecture and major design decisions |
| `TESTING.md`        | Test commands and verification requirements    |
| `DEPLOYMENT.md`     | Deployment and recovery instructions           |
| `DECISIONS.md`      | Important technical and product decisions      |

The exact filenames can be adapted to an existing repository.

### Rule H: Resume from the real project state

At the beginning of a new coding session, the AI should inspect the repository and read the latest project-status records.

It must not blindly trust an old summary if the code says otherwise.

### Rule I: Update the roadmap as reality changes

If a requirement changes, update the relevant decision and affected tasks.

Do not silently remove requirements just because they are inconvenient to implement.

### Rule J: Finish each batch with a clear handoff

The final update should include:

1. Tasks completed.
2. Important files changed.
3. Tests and results.
4. Known limitations.
5. Any configuration changes needed.
6. Current project status.
7. The next recommended batch.

This gives us continuity even if the coding session ends unexpectedly.

---

# PART XIV — The master release gates

We now have a roadmap, but we also need clear conditions for moving between stages.

| Gate                          | What must be true before proceeding                                             |
| ----------------------------- | ------------------------------------------------------------------------------- |
| Gate 1: Foundation            | The app builds, runs, and follows the JavaScript-only rule                      |
| Gate 2: Security foundation   | Authentication and server-side authorization are tested                         |
| Gate 3: Geographic foundation | The area hierarchy and database validation work                                 |
| Gate 4: Map functionality     | Google Maps, place search, and boundary rendering work                          |
| Gate 5: Proposal workflow     | Submission, editing, withdrawal, history, duplicate handling, and approval work |
| Gate 6: Reporting             | Invitation reports save correctly and can be audited                            |
| Gate 7: Analytics             | Population and invitation calculations are consistent                           |
| Gate 8: User experience       | Public, devotee, and administrator workflows work across supported devices      |
| Gate 9: Production readiness  | Security, backups, monitoring, performance, and recovery checks pass            |
| Gate 10: Launch               | Pilot testing is complete and critical issues are resolved                      |
| Gate 11: Ongoing operations   | Monitoring, maintenance, and release procedures are active                      |

A gate doesn't mean every possible enhancement must be finished. It means the required functionality for that stage is reliable enough to support the next stage.

---

# PART XV — Our practical execution order

The full roadmap is extensive, but we don't need to build everything simultaneously.

Here's the order I recommend for actually executing it.

## Stage 1 — Establish the foundation (closed 2026-11-04)

Progress checkpoint (2026-11-04; evidence in `project-status.md`):

- [ ] Product requirements baseline — documented, but Phase 0 remains partial and open decisions are recorded. This is not a Stage 1 release-gate failure; the open decisions carry into Stage 2 planning.
- [x] Project setup.
- [x] JavaScript-only enforcement.
- [x] MongoDB Atlas connection — live authentication verified; `make check-db` passed and the isolated test database passed the integration suite.
- [x] Basic layouts and navigation.
- [x] Initial unit-test setup; 47 unit tests and 6 Atlas-backed integration tests pass.
- [x] Project documentation, including the Stage 1 closure procedure.

**Current result:** Stage 1 is formally closed. `make check-db` and the complete `make ci` pipeline passed on 2026-11-04, and the production build was served and checked over HTTP. Product requirements remain PARTIAL, and Stage 2 has not been started; it requires explicit authorization and the ADR-010 decisions.

## Stage 2 — Secure the application

Preparation checkpoint (2026-11-04; no implementation):

- [x] Decision report prepared — ADR-010 options, recommendations, security/privacy impact, and owner questions are in `stage-2-decision-report.md`.
- [x] Authentication specification prepared — architecture, models, API contracts, validation, audit, testing, and acceptance criteria are in `stage-2-authentication-spec.md`.
- [ ] Owner decisions approved — authentication approach, registration policy, email verification, credential method, email provider, deletion/retention.
- [ ] Batch 0 — decision lock, models/indexes, auth primitives, bootstrap scripts, tests.
- [ ] Registration, login, logout, sessions.
- [ ] Email verification and password recovery.
- [ ] Roles, permissions, protected API routes, protected administrator pages.
- [ ] Account suspension/reactivation and audit history.
- [ ] Browser/E2E verification and Stage 2 closure record.

**Current result:** Stage 2 is designed but not implemented. No auth code, collection, dependency, or environment variable exists. Implementation begins only after the owner answers the six questions in the decision report.

## Stage 3 — Build the geographic core

Complete:

- Geographic hierarchy.
- Official area records.
- Google Maps integration.
- Place search.
- Boundary creation and editing.
- Geographic imports.
- Locality proposals and review.

**Result:** A working geographic management system.

## Stage 4 — Build invitation tracking

Complete:

- Population management.
- Invitation reporting.
- Report history.
- Corrections and validation.
- Coverage calculations.
- Geographic aggregation.

**Result:** Reliable invitation statistics.

## Stage 5 — Complete the application experience

Complete:

- Public pages.
- Interactive map.
- Area details.
- Devotee dashboard.
- Administrator dashboard.
- Proposal history.
- Analytics and leaderboard.

**Result:** The complete user-facing product.

## Stage 6 — Harden and launch

Complete:

- Security review.
- Performance testing.
- Accessibility testing.
- End-to-end testing.
- Backups and restoration.
- Production configuration.
- Pilot release.
- Full launch.

**Result:** A production-ready Mahotsav platform.

## Stage 7 — Operate and improve

Continue:

- Daily monitoring.
- Weekly operational reviews.
- Monthly maintenance.
- Quarterly architecture reviews.
- Bug fixes and feature releases.
- Geographic data maintenance.
- Documentation and recovery testing.

**Result:** A platform that stays reliable after launch rather than slowly falling apart.

---

# PART XVI — The master definition of done

A feature is not complete merely because the coding AI says it is done.

Every feature must satisfy the relevant criteria below.

### Functionality

- The intended workflow works.
- Edge cases are handled.
- Error states are understandable.
- The feature works with real application data.

### Security

- Permissions are enforced on the server.
- Inputs are validated.
- Unauthorized access is rejected.
- Sensitive information is protected.

### Data integrity

- Database updates are consistent.
- Duplicate operations are handled safely.
- Important changes are traceable.
- Historical records remain valid.

### User experience

- The interface is responsive.
- Forms provide useful feedback.
- Loading and empty states are handled.
- Accessibility has been considered.

### Testing

- Relevant automated tests pass.
- Regression tests pass.
- Critical user journeys are verified.
- Any untested behavior is explicitly documented.

### Maintainability

- Code follows the project's conventions.
- No TypeScript has been introduced.
- Configuration and dependencies are documented.
- The README and project-status records are updated.

### Production readiness

Where relevant, monitoring, rollback, backups, and operational procedures are in place.

Not every tiny UI adjustment needs a full disaster-recovery exercise, obviously. But every change must receive testing proportionate to its risk.

---

# 🏁 Final verdict: This is our master roadmap

We've now mapped the project from its initial specification all the way through implementation, launch, routine maintenance, security updates, data management, future features, and ongoing development.

**The most important architectural decision is the separation between proposed geographic areas and approved geographic areas.** That separation protects the map, prevents pending submissions from distorting analytics, and lets devotees contribute without granting them administrative control.

The second most important decision is to build the reporting and geographic data models properly before layering dashboards and leaderboards on top.

And the third is to treat deployment and maintenance as part of the project itself—not as something we'll figure out five minutes before launch. 💀

## Our next step

Before we begin feature development, the first coding batch should establish the repository foundation and create the project's documentation files.

The coding AI should:

1. Inspect the existing repository, if one already exists.
2. Establish or verify the JavaScript-only Next.js setup.
3. Document the architecture and master roadmap.
4. Configure the initial development environment.
5. Verify the build and development commands.
6. Report the actual state of the project.
7. Recommend the next implementation batch.

We'll then proceed through the roadmap in coherent batches, updating the project status after every substantial milestone.

**One final principle:** The roadmap is comprehensive, but it isn't frozen. If implementation reveals a genuine technical constraint or your campaign requirements change, we'll update the plan deliberately instead of forcing a bad decision into the code.
