import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { MonthlyBillSummary } from "@/types/database";

// Create PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#0284c7",
    paddingBottom: 15,
    marginBottom: 15,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 12,
    borderRadius: 30, // Round monogram appearance
  },
  titleContainer: {
    flexDirection: "column",
  },
  brandName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0369a1",
  },
  brandSub: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },
  invoiceMeta: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  invoiceDate: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },
  section: {
    marginBottom: 15,
  },
  customerBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  custCol: {
    flexDirection: "column",
  },
  custLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
  },
  custValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 2,
  },
  custSub: {
    fontSize: 8,
    color: "#475569",
    marginTop: 2,
  },
  table: {
    width: "100%",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontWeight: "bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 8,
  },
  colDate: { width: "25%" },
  colStatus: { width: "25%" },
  colQty: { width: "20%", textAlign: "right" },
  colRate: { width: "15%", textAlign: "right" },
  colTotal: { width: "15%", textAlign: "right" },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 15,
  },
  summaryBox: {
    width: "50%",
    padding: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 8,
    color: "#475569",
  },
  summaryVal: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#0f172a",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 5,
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0369a1",
  },
  totalVal: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#b91c1c",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 30,
    right: 30,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    fontSize: 7,
    color: "#94a3b8",
  },
});

export function InvoicePDFDocument({ bill }: { bill: MonthlyBillSummary }) {
  const {
    customer,
    monthName,
    previousBalance,
    deliveries,
    totalQtyKg,
    totalMilkCost,
    payments,
    totalPayments,
    netPayableAmount,
  } = bill;

  return (
    <Document title={`Milk_Bill_${customer.name}_${monthName}.pdf`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Top Left Monogram / Logo */}
            <Image src="/monogram.jpeg" style={styles.logo} />
            <View style={styles.titleContainer}>
              <Text style={styles.brandName}>Mian Dairy Farm</Text>
              <Text style={styles.brandSub}>
                Fresh Farm Milk Daily Supply & Distribution
              </Text>
              <Text style={styles.brandSub}>Helpline / Support: 0300-7609043</Text>
            </View>
          </View>

          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceTitle}>MONTHLY MILK BILL</Text>
            <Text style={styles.invoiceDate}>Billing Month: {monthName}</Text>
            <Text style={styles.invoiceDate}>
              Issued: {new Date().toLocaleDateString("en-PK")}
            </Text>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <View style={styles.customerBox}>
            <View style={styles.custCol}>
              <Text style={styles.custLabel}>Customer Details</Text>
              <Text style={styles.custValue}>{customer.name}</Text>
              {customer.phone ? (
                <Text style={styles.custSub}>Phone: {customer.phone}</Text>
              ) : null}
              {customer.address ? (
                <Text style={styles.custSub}>Address: {customer.address}</Text>
              ) : null}
            </View>
            <View style={[styles.custCol, { alignItems: "flex-end" }]}>
              <Text style={styles.custLabel}>Standard Delivery Rate</Text>
              <Text style={styles.custValue}>
                Rs. {customer.fixed_rate_per_kg} / KG
              </Text>
              <Text style={styles.custSub}>Payment Mode: Cash / Online</Text>
            </View>
          </View>
        </View>

        {/* Itemized Daily Deliveries Table */}
        <View style={styles.section}>
          <Text style={[styles.custLabel, { marginBottom: 4 }]}>
            Itemized Daily Delivery Log ({deliveries.length} Days)
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colDate}>Date</Text>
              <Text style={styles.colStatus}>Delivery Status</Text>
              <Text style={styles.colQty}>Milk (KG)</Text>
              <Text style={styles.colRate}>Rate/KG</Text>
              <Text style={styles.colTotal}>Amount (Rs.)</Text>
            </View>

            {deliveries.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={{ width: "100%", textAlign: "center", color: "#64748b" }}>
                  No deliveries recorded during this month.
                </Text>
              </View>
            ) : (
              deliveries.map((d) => (
                <View key={d.id} style={styles.tableRow}>
                  <Text style={styles.colDate}>{d.entry_date}</Text>
                  <Text style={styles.colStatus}>
                    {d.is_nagha ? "Nagha (Absent)" : "Delivered"}
                  </Text>
                  <Text style={styles.colQty}>
                    {d.is_nagha ? "0.00" : Number(d.qty_kg).toFixed(2)}
                  </Text>
                  <Text style={styles.colRate}>
                    Rs. {d.custom_rate || customer.fixed_rate_per_kg}
                  </Text>
                  <Text style={styles.colTotal}>
                    Rs. {Number(d.total_amount).toFixed(0)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Financial Summary Calculation */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Milk Supplied:</Text>
              <Text style={styles.summaryVal}>{totalQtyKg.toFixed(2)} KG</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>This Month Milk Charges:</Text>
              <Text style={styles.summaryVal}>
                Rs. {totalMilkCost.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Previous Unpaid Balance:</Text>
              <Text style={styles.summaryVal}>
                Rs. {previousBalance.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Less Payments Received:</Text>
              <Text style={[styles.summaryVal, { color: "#15803d" }]}>
                - Rs. {totalPayments.toLocaleString()}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>NET TOTAL PAYABLE:</Text>
              <Text style={styles.totalVal}>
                Rs. {netPayableAmount.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer with Payment Instructions */}
        <View style={styles.footer}>
          <Text>
            Please settle your milk bill by the 5th of the month. We accept Cash,
            EasyPaisa, JazzCash, or Bank Transfer.
          </Text>
          <Text style={{ marginTop: 2 }}>
            Thank you for trusting Mian Dairy Farm. Cleanliness & Pure Quality Guaranteed.
          </Text>
        </View>
      </Page>
    </Document>
  );
}