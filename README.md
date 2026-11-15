# Employee Management — SPFx + React web part

A SharePoint Framework (SPFx 1.20) web part that manages employee records stored in a SharePoint list.

## What it does

- **CRUD**: add, edit and delete employees (deletes go to the site recycle bin, so they can be restored).
- **Search and filter**: instant search across name, ID, email, phone and designation; filter by department and status; sortable columns; pagination.
- **Registration form**: side panel with validation (required fields, email/phone format, unique Employee ID checked against SharePoint before saving).
- **Dashboard**: totals, active/on-leave counts, new hires in the last 90 days, headcount by department split by status, and most recent joiners.
- **Export**: download the current filtered view as CSV.
- **Self-provisioning**: if the list doesn't exist, the web part offers a "Set up list" button that creates it with all columns.
- **Configurable**: web part title, list name and page size from the property pane. Works in SharePoint pages and Teams tabs.

## Project structure

```
src/webparts/employeeManagement/
├── EmployeeManagementWebPart.ts          # SPFx entry point, property pane, wires the service into React
├── EmployeeManagementWebPart.manifest.json
├── components/
│   ├── EmployeeManagement.tsx            # Root: loading, list setup, tabs, notifications
│   ├── EmployeeList.tsx                  # Directory: search, filters, sort, paging, delete dialog, CSV export
│   ├── EmployeeForm.tsx                  # Add / edit panel with validation
│   ├── Dashboard.tsx                     # Stats and department chart
│   ├── helpers.ts                        # Avatars, status colors, date formatting
│   └── EmployeeManagement.module.scss
├── models/IEmployee.ts                   # Types, departments, statuses
├── services/EmployeeService.ts           # All SharePoint REST calls (SPHttpClient)
└── loc/                                  # Localized strings
scripts/Provision-EmployeeList.ps1        # Optional PnP PowerShell provisioning + sample data
```

## SharePoint list schema

| Column (internal name) | Display name  | Type                                       |
|------------------------|---------------|--------------------------------------------|
| Title                  | Full name     | Single line of text                        |
| EmployeeCode           | Employee ID   | Text, required, unique, indexed            |
| Email                  | Email         | Text, required                             |
| Phone                  | Phone         | Text                                       |
| Department             | Department    | Choice                                     |
| Designation            | Designation   | Text                                       |
| JoiningDate            | Joining date  | Date only                                  |
| EmployeeStatus         | Status        | Choice: Active, On Leave, Inactive         |

## Prerequisites

- Node.js **18.x** (SPFx 1.20 supports Node 18 only). Use `nvm` to switch if needed.
- Gulp CLI and Yeoman (only Gulp is strictly needed for this project):
  ```bash
  npm install -g gulp-cli yo @microsoft/generator-sharepoint@1.20.0
  ```
- A Microsoft 365 tenant with an App Catalog, and edit rights on a SharePoint site.

> If your organization is on a newer SPFx version, update every `@microsoft/sp-*` package in `package.json` to that version and match its supported Node version, or run `npx @pnp/cli-microsoft365 spfx project upgrade` for a guided upgrade.

## Run locally

```bash
npm install
gulp trust-dev-cert
```

1. Open `config/serve.json` and replace `{tenantDomain}` with your site, e.g. `contoso.sharepoint.com/sites/hr`.
2. Run `gulp serve`.
3. In the hosted workbench (`https://<your-site>/_layouts/workbench.aspx`), add **Employee Management** (Advanced group).
4. Click **Set up list** the first time, or run the PowerShell script beforehand.

## Deploy to SharePoint

```bash
gulp bundle --ship
gulp package-solution --ship
```

1. Upload `sharepoint/solution/spfx-employee-management.sppkg` to the tenant App Catalog.
2. Choose **Make this solution available to all sites** (the package uses `skipFeatureDeployment`).
3. Edit any modern page, add **Employee Management**, and publish.

## Optional: provision with PowerShell and load sample data

```powershell
./scripts/Provision-EmployeeList.ps1 -SiteUrl https://contoso.sharepoint.com/sites/hr -ClientId <your-entra-app-id> -WithSampleData
```

## Permissions

The web part runs as the signed-in user. To add/edit/delete employees users need **Contribute** on the list; for read-only users, give **Read** and they'll get an error message if they try to save. Clicking **Set up list** requires **Manage Lists** (site owners). Consider breaking permission inheritance on the Employees list so only HR can edit it, since it holds personal data.

## Ideas to extend

- Use PnPjs (`@pnp/sp`) instead of raw REST for cleaner queries and batching.
- Replace the Email text field with a Person column and the PeoplePicker control from `@pnp/spfx-controls-react`.
- Add a profile photo using Microsoft Graph (`MSGraphClientV3`).
- Server-side paging with `$skiptoken` for lists larger than 5,000 items.
- An approval flow in Power Automate when a new employee is registered.
