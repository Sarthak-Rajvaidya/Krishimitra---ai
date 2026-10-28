import { Route, Routes } from "react-router-dom";
import { RequireRole } from "./components/ui";
import DashboardLayout from "./layouts/DashboardLayout";
import StoreLayout from "./layouts/StoreLayout";
import * as A from "./pages/Admin";
import { Login, Register } from "./pages/Auth";
import * as D from "./pages/Developer";
import { Account, Addresses, CartPage, Checkout, MyFarm, OrderDetail, Orders } from "./pages/Farmer";
import * as F from "./pages/FinanceFounder";
import { Advisory, CropDoctor, DiagnosisPage } from "./pages/AI";
import { Help, Home, ProductPage, Shop } from "./pages/Storefront";

const adminNav = [{ to: "/admin", label: "Overview" }, { to: "/admin/products", label: "Products" }, { to: "/admin/inventory", label: "Inventory" }, { to: "/admin/orders", label: "Orders" },
  { to: "/admin/customers", label: "Customers" }, { to: "/admin/promotions", label: "Promotions" }, { to: "/admin/users", label: "Users and Roles" }, { to: "/admin/audit", label: "Audit Logs" }];
const finNav = [{ to: "/finance", label: "Financial Overview" }, { to: "/finance/ledger", label: "Sales Ledger" }, { to: "/finance/refunds", label: "Refunds" }, { to: "/finance/expenses", label: "Expenses" },
  { to: "/finance/reconciliation", label: "Payment Reconciliation" }, { to: "/finance/gst", label: "GST Reports" }];
const devNav = [{ to: "/developer", label: "System Overview" }, { to: "/developer/models", label: "Model Registry" }, { to: "/developer/knowledge", label: "RAG Documents" },
  { to: "/developer/flags", label: "Feature Flags" }, { to: "/developer/errors", label: "Error Logs" }, { to: "/developer/audit", label: "Audit Logs" }];
const founderNav = [{ to: "/founder", label: "Executive Overview" }];

const farmer = (el: JSX.Element) => <RequireRole roles={["FARMER"]}>{el}</RequireRole>;

export default function App() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route index element={<Home />} /><Route path="shop" element={<Shop />} /><Route path="shop/:slug" element={<Shop />} /><Route path="search" element={<Shop search />} />
        <Route path="product/:id" element={<ProductPage />} /><Route path="login" element={<Login />} /><Route path="register" element={<Register />} /><Route path="help" element={<Help />} />
        <Route path="cart" element={farmer(<CartPage />)} /><Route path="checkout" element={farmer(<Checkout />)} /><Route path="orders" element={farmer(<Orders />)} />
        <Route path="orders/:id" element={farmer(<OrderDetail />)} /><Route path="addresses" element={farmer(<Addresses />)} /><Route path="account" element={farmer(<Account />)} />
        <Route path="my-farm" element={farmer(<MyFarm />)} /><Route path="crop-doctor" element={farmer(<CropDoctor />)} /><Route path="diagnoses/:id" element={farmer(<DiagnosisPage />)} />
        <Route path="advisory" element={farmer(<Advisory />)} /><Route path="advisory/:id" element={farmer(<Advisory />)} />
      </Route>
      <Route path="admin" element={<RequireRole roles={["ADMIN"]}><DashboardLayout items={adminNav} title="Administration" /></RequireRole>}>
        <Route index element={<A.AdminOverview />} /><Route path="products" element={<A.AdminProducts />} /><Route path="inventory" element={<A.AdminInventory />} /><Route path="orders" element={<A.AdminOrders />} />
        <Route path="customers" element={<A.AdminCustomers />} /><Route path="promotions" element={<A.AdminPromotions />} /><Route path="users" element={<A.AdminUsers />} /><Route path="audit" element={<A.AuditLogs />} />
      </Route>
      <Route path="finance" element={<RequireRole roles={["FINANCE"]}><DashboardLayout items={finNav} title="Finance" /></RequireRole>}>
        <Route index element={<F.FinanceOverview />} /><Route path="ledger" element={<F.Ledger />} /><Route path="refunds" element={<F.Refunds />} /><Route path="expenses" element={<F.Expenses />} />
        <Route path="reconciliation" element={<F.Recon />} /><Route path="gst" element={<F.Gst />} />
      </Route>
      <Route path="founder" element={<RequireRole roles={["FOUNDER"]}><DashboardLayout items={founderNav} title="Founder" /></RequireRole>}><Route index element={<F.FounderOverview />} /></Route>
      <Route path="developer" element={<RequireRole roles={["DEVELOPER"]}><DashboardLayout items={devNav} title="Developer" /></RequireRole>}>
        <Route index element={<D.SystemOverview />} /><Route path="models" element={<D.Models />} /><Route path="knowledge" element={<D.Knowledge />} /><Route path="flags" element={<D.Flags />} /><Route path="errors" element={<D.ErrorLogs />} /><Route path="audit" element={<D.DevAudit />} />
      </Route>
      <Route path="*" element={<div className="p-10 text-center">Page not found.</div>} />
    </Routes>
  );
}
