import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { Customer } from "@/types/database";

export interface QuickManualBill {
  customer: Customer;
  regularQtyKg: number;
  extraQtyKg: number;
  ratePerKg: number;
  previousBalance: number;
  payments: number;
  totalQtyKg: number;
  totalAmount: number;
  netPayable: number;
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
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
    paddingBottom: 16,
    marginBottom: 22,
  },
  brand: { flexDirection: "row", alignItems: "center" },
  logo: { width: 48, height: 48, marginRight: 12 },
  brandName: { fontSize: 18, fontWeight: "bold", color: "#0369a1" },
  brandSub: { fontSize: 8, color: "#64748b", marginTop: 3 },
  title: { fontSize: 13, fontWeight: "bold", color: "#0f172a" },
  issueDate: { fontSize: 8, color: "#64748b", marginTop: 4 },
  customerBox: {
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 5,
    backgroundColor: "#f8fafc",
  },
  label: { fontSize: 8, color: "#64748b", textTransform: "uppercase" },
  customerName: { fontSize: 13, fontWeight: "bold", color: "#0f172a", marginTop: 5 },
  customerSub: { fontSize: 9, color: "#475569", marginTop: 3 },
  sectionTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 8 },
  summary: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 5,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  rowLabel: { color: "#475569" },
  rowValue: { fontWeight: "bold", color: "#0f172a" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 12,
    backgroundColor: "#f0f9ff",
  },
  totalLabel: { fontSize: 11, fontWeight: "bold", color: "#0369a1" },
  totalValue: { fontSize: 13, fontWeight: "bold", color: "#be123c" },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 36,
    right: 36,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
  },
});

const formatAmount = (amount: number) =>
  `Rs. ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

export function QuickManualBillPDFDocument({ bill }: { bill: QuickManualBill }) {
  const { customer } = bill;

  return (
    <Document
      title={`Quick_Manual_Bill_${customer.name.replace(/\s+/g, "_")}.pdf`}
      author="Mian Dairy Farm"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image src="/monogram.jpeg" style={styles.logo} />
            <View>
              <Text style={styles.brandName}>Mian Dairy Farm</Text>
              <Text style={styles.brandSub}>Fresh Farm Milk Daily Supply & Distribution</Text>
              <Text style={styles.brandSub}>Helpline / Support: 0300-7609043</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.title}>QUICK MANUAL BILL</Text>
            <Text style={styles.issueDate}>
              Issued: {new Date().toLocaleDateString("en-PK")}
            </Text>
          </View>
        </View>

        <View style={styles.customerBox}>
          <Text style={styles.label}>Customer</Text>
          <Text style={styles.customerName}>{customer.name}</Text>
          {customer.phone ? (
            <Text style={styles.customerSub}>Phone: {customer.phone}</Text>
          ) : null}
          {customer.address ? (
            <Text style={styles.customerSub}>Address: {customer.address}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Bill Summary</Text>
        <View style={styles.summary}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Regular Milk</Text>
            <Text style={styles.rowValue}>{bill.regularQtyKg.toFixed(2)} KG</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Extra Milk</Text>
            <Text style={styles.rowValue}>{bill.extraQtyKg.toFixed(2)} KG</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total Milk</Text>
            <Text style={styles.rowValue}>{bill.totalQtyKg.toFixed(2)} KG</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Rate per KG</Text>
            <Text style={styles.rowValue}>{formatAmount(bill.ratePerKg)} / KG</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total Milk Amount</Text>
            <Text style={styles.rowValue}>{formatAmount(bill.totalAmount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Previous Unpaid Balance</Text>
            <Text style={styles.rowValue}>{formatAmount(bill.previousBalance)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Payments Made</Text>
            <Text style={styles.rowValue}>-{formatAmount(bill.payments)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>NET PAYABLE</Text>
            <Text style={styles.totalValue}>{formatAmount(bill.netPayable)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Thank you for trusting Mian Dairy Farm.</Text>
        </View>
      </Page>
    </Document>
  );
}
