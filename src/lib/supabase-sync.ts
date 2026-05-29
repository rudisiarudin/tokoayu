import { supabase } from "./supabase";
import { products, customers, debts, transactions } from "./dummy-data";

// Type definitions to match dummy data structures
export type Product = (typeof products)[number];
export type Customer = (typeof customers)[number];
export type Debt = (typeof debts)[number];
export type Transaction = {
  id: string;
  time: string;
  customer: string;
  total: number;
  profit: number;
  method: string;
  itemsCount?: number;
  status?: string;
};

/**
 * Fetch products from Supabase with graceful fallback
 */
export async function getSupabaseProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sold", { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) return data as Product[];
    
    // Seed dummy data if database table exists but is empty
    await seedProducts();
    return products;
  } catch (err) {
    console.warn("Supabase products fetch failed, using offline mock data:", err);
    return products;
  }
}

/**
 * Fetch customers from Supabase with graceful fallback
 */
export async function getSupabaseCustomers(): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*");

    if (error) throw error;
    if (data && data.length > 0) return data as Customer[];
    
    await seedCustomers();
    return customers;
  } catch (err) {
    console.warn("Supabase customers fetch failed, using offline mock data:", err);
    return customers;
  }
}

/**
 * Fetch debts from Supabase with graceful fallback
 */
export async function getSupabaseDebts(): Promise<Debt[]> {
  try {
    const { data, error } = await supabase
      .from("debts")
      .select("*");

    if (error) throw error;
    if (data && data.length > 0) return data as Debt[];
    
    await seedDebts();
    return debts;
  } catch (err) {
    console.warn("Supabase debts fetch failed, using offline mock data:", err);
    return debts;
  }
}

/**
 * Save new transaction to Supabase
 */
export async function saveSupabaseTransaction(transaction: Omit<Transaction, "id" | "time"> & { id?: string; time?: string }) {
  const newTx = {
    id: transaction.id || `TX-${Math.floor(1000 + Math.random() * 9000)}`,
    time: transaction.time || new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    itemsCount: transaction.itemsCount,
    total: transaction.total,
    profit: transaction.profit,
    method: transaction.method,
    status: transaction.status || "Terbayar"
  };

  try {
    const { error } = await supabase.from("transactions").insert([newTx]);
    if (error) throw error;
    console.log("Transaction successfully synced to Supabase:", newTx.id);
  } catch (err) {
    console.warn("Could not sync transaction to Supabase, saved offline:", err);
  }
  return newTx;
}

/**
 * Update product stock and sold count in Supabase
 */
export async function updateSupabaseProduct(product: Product) {
  try {
    const { error } = await supabase
      .from("products")
      .update({
        stock: product.stock,
        sold: product.sold
      })
      .eq("id", product.id);
    
    if (error) throw error;
    console.log("Product successfully updated in Supabase:", product.name);
  } catch (err) {
    console.warn("Could not sync product update to Supabase, saved locally:", err);
  }
}

/**
 * Save new customer to Supabase
 */
export async function saveSupabaseCustomer(customer: Customer) {
  try {
    const { error } = await supabase.from("customers").insert([customer]);
    if (error) throw error;
    console.log("Customer successfully synced to Supabase:", customer.name);
  } catch (err) {
    console.warn("Could not sync customer to Supabase, saved locally:", err);
  }
}

/**
 * Save new debt to Supabase
 */
export async function saveSupabaseDebt(debt: Debt) {
  try {
    const { error } = await supabase.from("debts").insert([debt]);
    if (error) throw error;
    console.log("Debt record successfully synced to Supabase:", debt.customer);
  } catch (err) {
    console.warn("Could not sync debt to Supabase, saved locally:", err);
  }
}

/**
 * Save new product to Supabase
 */
export async function saveSupabaseProduct(product: Product) {
  try {
    const { error } = await supabase.from("products").insert([product]);
    if (error) throw error;
    console.log("Product successfully synced to Supabase:", product.name);
  } catch (err) {
    console.warn("Could not sync new product to Supabase, saved locally:", err);
  }
}

// Private helpers for automatic seeding of empty databases
async function seedProducts() {
  try {
    await supabase.from("products").insert(products);
  } catch (e) {
    console.log("Auto-seeding products skipped (tables might not exist yet)");
  }
}

async function seedCustomers() {
  try {
    await supabase.from("customers").insert(customers);
  } catch (e) {
    console.log("Auto-seeding customers skipped (tables might not exist yet)");
  }
}

async function seedDebts() {
  try {
    await supabase.from("debts").insert(debts);
  } catch (e) {
    console.log("Auto-seeding debts skipped (tables might not exist yet)");
  }
}
