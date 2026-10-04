# Mian Dairy Farm — Milk Dairy & Distribution Management Web Application

A production-ready, highly responsive Milk Dairy & Distribution Management Web Application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Shadcn UI**, and **Supabase (PostgreSQL)**.

Designed for both dairy farm managers on desktop screens and delivery riders on mobile devices during morning and evening distribution rounds.

---

## Key Features & Modules

### 1. Dashboard Overview (`/`)
- **Milk Intake vs. Distribution**: Real-time counters for today's intake (KG), distributed milk (KG), and physical loss/wastage (KG).
- **Financial Snapshot**: Today's sales revenue, bulk milk costs, operating expenses, and daily net margin.
- **Operational Alerts**: Today's total Naghas (absent customers), cash collected, and outstanding account receivables.
- **Live Route Feed**: Instant table of today's customer delivery round.

### 2. Customer Management & Ledger (`/customers` & `/customers/[id]`)
- **Customer CRUD**: Full name, unique phone number (WhatsApp enabled), delivery colony/address, fixed rate per KG, and opening balance.
- **Search & Filters**: Search by name, phone, or address; filter by active/inactive and balance status.
- **Customer Transaction Ledger**: Detailed chronological record of every milk delivery, Nagha tag, and payment credit with real-time running balance calculation.
- **Payment Collection Form**: Log payments with date, amount, payment mode (`Cash`, `Bank Transfer`, `EasyPaisa/JazzCash`), and reference notes.

### 3. Fast Daily Milk Batch Entry (`/daily-entry`)
- **Batch Grid**: Date-filtered table of all active customers for quick, keyboard-friendly recording.
- **Quick 'Nagha' Toggle**: Instantly mark a customer as absent for the day (zeroes quantity and charges).
- **Custom Rate Overrides**: Override fixed rate for specific bulk orders or special discounts on any day.
- **Sticky Live Summary**: Real-time counter of total KGs distributed and total billed amounts.

### 4. Farm Purchases & Reconciliation (`/purchases`)
- **Supplier Directory**: Register cattle farms, contact information, and standard purchase rates.
- **Intake Log**: Record bulk farm purchases with quantity, rate, and auto-calculated total cost.
- **Daily Reconciliation Engine**:
  $$\text{Wastage / Variance (KG)} = \text{Total Farm Purchases (KG)} - \text{Total Customer Deliveries (KG)}$$
  Features automated status badges: *Balanced*, *Normal Handling Variance (<3%)*, or *High Loss Alert (>3%)*.

### 5. Daily Expenses (`/expenses`)
- **Overhead Tracker**: Log daily operational expenses with category selection:
  - `Petrol/Fuel` (delivery bikes and vans)
  - `Vehicle Maintenance` (oil changes, tire repairs)
  - `Staff Salary` (delivery personnel daily wages)
  - `Feed/Containers` (ice bags, milk cans, containers)
  - `Miscellaneous`
- **Monthly Filter**: Visual metric cards summarizing expenses by category and total monthly spend.

### 6. Billing, PDF & WhatsApp Reports (`/reports`)
- **Automated Monthly Bill Calculator**:
  $$\text{Net Payable} = (\text{Total KGs Sold} \times \text{Applicable Rate}) + \text{Previous Balance} - \text{Total Payments}$$
- **Client-Side PDF Generator**: Generates clean, branded PDF invoices using `@react-pdf/renderer` featuring customer info, itemized daily delivery log, subtotal, and total due.
- **Direct WhatsApp Sharing**: Generates a pre-filled `https://wa.me/<phone>?text=...` URL with a formatted bill summary, bank account / EasyPaisa details, and friendly greeting.
- **Outstanding Balance Recovery**: Table of customers with pending balances with one-click WhatsApp payment reminders.
- **Monthly Profit & Loss (P&L)**:
  $$\text{Net Business Profit} = \text{Sales Revenue} - (\text{Farm Purchases Cost} + \text{Operating Expenses})$$

---

## Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Next.js 14 (App Router)** | Modern full-stack React framework with SSR and static page optimization |
| **TypeScript** | Strict type safety for data models and form handlers |
| **Tailwind CSS** | Clean utility-first styling with responsive breakpoints |
| **Shadcn UI & Lucide Icons** | Accessible UI primitives (Buttons, Tables, Dialogs, Badges, Tabs) |
| **Supabase (PostgreSQL)** | Cloud PostgreSQL database with Row Level Security (RLS) |
| **React Hook Form + Zod** | Robust client-side validation and error messaging |
| **@react-pdf/renderer** | Client-side dynamic PDF bill generator |
| **date-fns** | Date calculations and Pakistani formatting (`dd MMM yyyy`) |

---

## Getting Started Locally

### 1. Clone or Open Project Directory
```bash
cd "c:\Users\NCS\Desktop\Milk Diary Management System"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup (Supabase & Admin Auth)
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Custom Admin Credentials (defaults to admin@miandairy.com / admin123)
NEXT_PUBLIC_ADMIN_EMAIL=admin@miandairy.com
NEXT_PUBLIC_ADMIN_PASSWORD=admin123
```
> **Note**: If you run without Supabase credentials, the application **automatically runs in Demo Mode** with persistent browser storage, pre-loaded sample customers, suppliers, and deliveries, so you can test all features immediately!

### 4. Admin Access & Credentials
All pages (`/`, `/customers`, `/daily-entry`, `/purchases`, `/expenses`, `/reports`) are protected by the Admin Authentication Guard.
- **Login URL**: `/login`
- **Default Email**: `admin@miandairy.com` (or username `admin`)
- **Default Password**: `admin123`
- *Tip: The login page includes a convenient **"Quick Demo Admin Login"** button that automatically fills credentials with one click.*

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Setting Up Supabase Database

1. Sign in to your [Supabase Dashboard](https://supabase.com).
2. Create a new project (e.g. `dairy-management`).
3. In the left navigation, click on the **SQL Editor**.
4. Open the file `supabase/schema.sql` from this repository, copy all the SQL code, paste it into the Supabase SQL Editor, and click **Run**.
5. This creates:
   - Tables: `customers`, `daily_sales`, `customer_payments`, `suppliers`, `daily_purchases`, `daily_expenses`
   - Constraints, foreign keys with cascade delete, and unique checks
   - Performance indexes on dates and customer IDs
   - Row Level Security (RLS) policies
   - Sample seed records for quick testing
6. Copy your **Project URL** and **anon public API Key** from **Project Settings -> API** and add them to your `.env.local`.

---

## Deploying to Vercel

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Sign in to [Vercel](https://vercel.com) and click **Add New -> Project**.
3. Import your dairy management repository.
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase Anon Key
5. Click **Deploy**. Vercel will automatically build the Next.js App Router project and provision a globally distributed production URL.

---

## Project Structure

```
├── app/
│   ├── layout.tsx                    # Root layout with responsive Viewport & AppShell
│   ├── page.tsx                      # Dashboard: Intake, Distribution, Reconciliation, Financials
│   ├── globals.css                   # Tailwind theme colors and CSS variables
│   ├── customers/
│   │   ├── page.tsx                  # Customer directory, balance indicators, filters
│   │   └── [id]/page.tsx             # Detailed customer ledger & running balance
│   ├── daily-entry/
│   │   └── page.tsx                  # Batch daily milk delivery entry with Nagha toggle
│   ├── purchases/
│   │   └── page.tsx                  # Farm bulk purchases & Daily Reconciliation Engine
│   ├── expenses/
│   │   └── page.tsx                  # Expense logging & category breakdown
│   └── reports/
│       └── page.tsx                  # Monthly bill calculator, PDF generator, WhatsApp share, P&L
├── components/
│   ├── ui/                           # Shadcn UI primitives (Button, Input, Table, Dialog, Badge, Tabs)
│   ├── layout/
│   │   ├── AppShell.tsx              # Responsive container
│   │   ├── Sidebar.tsx               # Desktop navigation with database status badge
│   │   ├── Navbar.tsx                # Mobile toggle and quick dispatch button
│   │   └── MobileNav.tsx             # Mobile drawer and sticky bottom bar for delivery boys
│   ├── customers/
│   │   ├── CustomerFormDialog.tsx    # Customer Add/Edit modal (React Hook Form + Zod)
│   │   └── PaymentDialog.tsx         # Payment collection modal
│   ├── purchases/
│   │   ├── SupplierFormDialog.tsx    # Supplier / Farm registration modal
│   │   └── PurchaseEntryDialog.tsx   # Daily intake recording modal
│   ├── expenses/
│   │   └── ExpenseFormDialog.tsx     # Operational expense logging modal
│   └── reports/
│       ├── InvoicePDFDocument.tsx    # @react-pdf/renderer document template
│       ├── InvoiceModal.tsx          # PDF preview & download modal
│       ├── WhatsAppShareButton.tsx   # Auto-generates wa.me billing links
│       ├── OutstandingRecoveryTable.tsx # Debtors table with WhatsApp reminders
│       └── ProfitLossStatement.tsx   # Net Profit calculator
├── lib/
│   ├── supabaseClient.ts             # Supabase client singleton with configuration guard
│   ├── mockData.ts                   # Realistic sample data
│   ├── store.ts                      # Unified DataStore service (Supabase + LocalStore)
│   ├── utils.ts                      # PKR Currency, KG formatters, and cn() helper
│   └── validations.ts                # Zod schemas for all forms
├── types/
│   └── database.ts                   # Supabase entities and domain interfaces
└── supabase/
    └── schema.sql                    # Production PostgreSQL DDL and seed data
```

---

## License
MIT License. Built for modern dairy farms and urban milk distribution teams.
