import * as React from "react";
import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatDateDisplay } from "@/lib/utils";

export interface DailyReportDelivery {
  customerId: string;
  customerName: string;
  quantityKg: number;
  ratePerKg: number;
  totalAmount: number;
}

export interface DailyReportPDFDocumentProps {
  date: string;
  deliveries: DailyReportDelivery[];
  naghaCustomers: string[];
  totalFarmIntake: number;
  totalMilkKg: number;
  totalRevenue: number;
  totalExpenses: number;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 38,
    paddingBottom: 48,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#0284c7",
    paddingBottom: 14,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
  },
  logo: {
    width: 48,
    height: 48,
    marginRight: 12,
    borderRadius: 24,
  },
  brandDetails: {
    flexDirection: "column",
  },
  farmName: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#0369a1",
  },
  subtitle: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 9,
  },
  reportMeta: {
    alignItems: "flex-end",
  },
  reportTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
  },
  reportDate: {
    marginTop: 4,
    fontSize: 9,
    color: "#64748b",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 9,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: 22,
  },
  summaryCard: {
    width: "50%",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  summaryCardInner: {
    padding: 10,
    minHeight: 54,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
  },
  summaryValue: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a",
  },
  positiveValue: {
    color: "#047857",
  },
  negativeValue: {
    color: "#be123c",
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 9,
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    fontSize: 8,
    fontWeight: "bold",
    color: "#475569",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    fontSize: 8,
  },
  colCustomer: { width: "40%" },
  colQuantity: { width: "18%", textAlign: "right" },
  colRate: { width: "19%", textAlign: "right" },
  colAmount: { width: "23%", textAlign: "right" },
  emptyState: {
    padding: 14,
    textAlign: "center",
    color: "#64748b",
    fontSize: 9,
  },
  naghaSection: {
    marginTop: 18,
  },
  naghaList: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: "#fecdd3",
    borderRadius: 4,
    backgroundColor: "#fff1f2",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  naghaCustomer: {
    width: "50%",
    paddingVertical: 4,
    paddingRight: 8,
    fontSize: 8,
    color: "#9f1239",
  },
  naghaEmpty: {
    padding: 9,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    fontSize: 8,
    color: "#64748b",
  },
  tableTotal: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 9,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    fontWeight: "bold",
    fontSize: 8,
  },
  tableTotalLabel: {
    color: "#475569",
    marginRight: 14,
  },
  tableTotalValue: {
    color: "#0f172a",
  },
  footer: {
    position: "absolute",
    left: 38,
    right: 38,
    bottom: 22,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#94a3b8",
  },
});

function formatAmount(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function DailyReportPDFDocument({
  date,
  deliveries,
  naghaCustomers,
  totalFarmIntake,
  totalMilkKg,
  totalRevenue,
  totalExpenses,
}: DailyReportPDFDocumentProps) {
  const netDailyProfitLoss = totalRevenue - totalExpenses;

  return (
    <Document title={`Daily_Report_${date}.pdf`} author="Mian Dairy Farm">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image src="/monogram.jpeg" style={styles.logo} />
            <View style={styles.brandDetails}>
              <Text style={styles.farmName}>Mian Dairy Farm</Text>
              <Text style={styles.subtitle}>Daily milk supply and distribution</Text>
            </View>
          </View>
          <View style={styles.reportMeta}>
            <Text style={styles.reportTitle}>DAILY OPERATIONS REPORT</Text>
            <Text style={styles.reportDate}>{formatDateDisplay(date)}</Text>
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Summary Overview</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardInner}>
                <Text style={styles.summaryLabel}>Total Farm Intake</Text>
                <Text style={styles.summaryValue}>{totalFarmIntake.toFixed(2)} Kg</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardInner}>
                <Text style={styles.summaryLabel}>Total Milk Distributed</Text>
                <Text style={styles.summaryValue}>{totalMilkKg.toFixed(2)} Kg</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardInner}>
                <Text style={styles.summaryLabel}>Total Deliveries</Text>
                <Text style={styles.summaryValue}>
                  {deliveries.length} {deliveries.length === 1 ? "customer" : "customers"}
                </Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardInner}>
                <Text style={styles.summaryLabel}>Total Revenue / Sales</Text>
                <Text style={[styles.summaryValue, styles.positiveValue]}>
                  {formatAmount(totalRevenue)}
                </Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardInner}>
                <Text style={styles.summaryLabel}>Expenses / Net Daily P&amp;L</Text>
                <Text style={styles.summaryValue}>
                  {formatAmount(totalExpenses)} /{" "}
                  <Text
                    style={
                      netDailyProfitLoss >= 0
                        ? styles.positiveValue
                        : styles.negativeValue
                    }
                  >
                    {formatAmount(netDailyProfitLoss)}
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.naghaSection}>
          <Text style={styles.sectionTitle}>
            Nagha (Off / No Milk) Customers ({naghaCustomers.length})
          </Text>
          {naghaCustomers.length > 0 ? (
            <View style={styles.naghaList}>
              {naghaCustomers.map((customerName, index) => (
                <Text key={`${customerName}-${index}`} style={styles.naghaCustomer}>
                  {customerName}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.naghaEmpty}>No customers marked Nagha for this date.</Text>
          )}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Customer Deliveries</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader} fixed>
              <Text style={styles.colCustomer}>Customer</Text>
              <Text style={styles.colQuantity}>Quantity (Kg)</Text>
              <Text style={styles.colRate}>Rate / Kg</Text>
              <Text style={styles.colAmount}>Line Total</Text>
            </View>
            {deliveries.length > 0 ? (
              deliveries.map((delivery) => (
                <View key={delivery.customerId} style={styles.tableRow} wrap={false}>
                  <Text style={styles.colCustomer}>{delivery.customerName}</Text>
                  <Text style={styles.colQuantity}>
                    {delivery.quantityKg.toFixed(2)}
                  </Text>
                  <Text style={styles.colRate}>{formatAmount(delivery.ratePerKg)}</Text>
                  <Text style={styles.colAmount}>{formatAmount(delivery.totalAmount)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyState}>No milk deliveries recorded for this date.</Text>
            )}
            <View style={styles.tableTotal}>
              <Text style={styles.tableTotalLabel}>Total Sales</Text>
              <Text style={styles.tableTotalValue}>{formatAmount(totalRevenue)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Mian Dairy Farm - Daily Report</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
