const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "..", "lib", "farmMetrics.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loadedModule = { exports: {} };
new Function("module", "exports", compiled)(loadedModule, loadedModule.exports);
const {
  calculateNetSalesRevenue,
  calculateSupplierPayables,
  calculateWorkerPayables,
  calculatePayrollPeriodPayables,
  countActiveAnimals,
  countLowStockFarmItems,
  withoutAnimalRecords,
} = loadedModule.exports;

test("daily net sales deducts the exact expense total from gross sales", () => {
  assert.equal(calculateNetSalesRevenue(12000, [{ amount: 1250 }, { amount: 750 }]), 10000);
  assert.equal(calculateNetSalesRevenue(500, []), 500);
  assert.equal(calculateNetSalesRevenue(500, [{ amount: 650 }]), -150);
});

test("animal counts exclude sold and deceased animals", () => {
  assert.deepEqual(
    countActiveAnimals([
      { animal_type: "Cow", status: "Active" },
      { animal_type: "Buffalo", status: "Active" },
      { animal_type: "Cow", status: "Sold" },
      { animal_type: "Calf", status: "Deceased" },
    ]),
    { Cow: 1, Buffalo: 1, Calf: 0 }
  );
});

test("deleting an animal filters its health and yield histories only", () => {
  const history = [
    { id: "health-1", animal_id: "animal-1" },
    { id: "yield-1", animal_id: "animal-1" },
    { id: "health-2", animal_id: "animal-2" },
  ];
  assert.deepEqual(withoutAnimalRecords(history, "animal-1"), [
    { id: "health-2", animal_id: "animal-2" },
  ]);
});

test("supplier payables subtract supplier payments from purchase liabilities", () => {
  assert.equal(
    calculateSupplierPayables(
      [{ supplier_id: "supplier-1", total_cost: 1000 }],
      [
        { supplier_id: "supplier-2", transaction_type: "Purchase", total_cost: 500 },
        { transaction_type: "Consumption", total_cost: 0 },
      ],
      [{ supplier_id: "supplier-1", amount: 1100 }]
    ),
    500
  );
  assert.equal(
    calculateSupplierPayables(
      [
        { supplier_id: "supplier-1", total_cost: 1000 },
        { supplier_id: "supplier-2", total_cost: 1000 },
      ],
      [],
      [{ supplier_id: "supplier-1", amount: 1200 }]
    ),
    1000
  );
});

test("payroll payables include earned wages, adjustments, advances, and unpaid monthly salary", () => {
  assert.equal(
    calculateWorkerPayables(
      [{
        worker_id: "worker-1",
        period_month: "2026-11",
        base_wage: 400,
        bonuses: 20,
        overtime: 30,
        deductions: 10,
        advances: 100,
        amount_paid: 200,
      }],
      [
        { id: "worker-1", is_active: true, wage_type: "Monthly Salary", wage_rate: 400 },
        { id: "worker-2", is_active: true, wage_type: "Monthly Salary", wage_rate: 500 },
      ],
      "2026-11"
    ),
    640
  );
});

test("one worker's advance does not reduce another worker's payable", () => {
  assert.equal(
    calculatePayrollPeriodPayables(
      [
        { worker_id: "worker-1", period_month: "2026-11", base_wage: 100, amount_paid: 200, advances: 0, bonuses: 0, overtime: 0, deductions: 0 },
        { worker_id: "worker-2", period_month: "2026-11", base_wage: 500, amount_paid: 0, advances: 0, bonuses: 0, overtime: 0, deductions: 0 },
      ],
      "2026-11"
    ),
    500
  );
});

test("monthly salary payable remains outstanding after a separate advance entry", () => {
  assert.equal(
    calculateWorkerPayables(
      [{
        worker_id: "worker-1",
        period_month: "2026-11",
        base_wage: 0,
        bonuses: 0,
        overtime: 0,
        deductions: 0,
        advances: 50,
        amount_paid: 0,
      }],
      [{ id: "worker-1", is_active: true, wage_type: "Monthly Salary", wage_rate: 500 }],
      "2026-11"
    ),
    450
  );
});

test("low-stock KPI counts both feed and medicine inventory", () => {
  assert.equal(
    countLowStockFarmItems(
      [{ quantity: 3, low_stock_threshold: 5 }, { quantity: 20, low_stock_threshold: 5 }],
      [{ quantity: 1, low_stock_threshold: 2 }]
    ),
    2
  );
});
