export type Role = "FARMER" | "ADMIN" | "FINANCE" | "DEVELOPER" | "FOUNDER";
export interface User { id: number; email: string; full_name: string; role: Role; permissions: string[]; language: string; is_demo: boolean }
export interface Product {
  id: number; sku: string; name: string; category: string; category_name: string; product_type: string; description: string;
  pack_size: string; price_paise: number; unit_price_paise: number | null; unit: string; image_url: string | null; crops: string[];
  use_tags: string[]; safety_info: string; in_stock: boolean; stock: number; low_stock: boolean; is_demo: boolean; label_verified: boolean; data_note: string | null;
}
export interface CartItem { id: number; product_id: number; name: string; pack_size: string; unit_price_paise: number; quantity: number; line_total_paise: number; available: number; recommendation_id: number | null }
export interface Cart { items: CartItem[]; subtotal_paise: number; discount_paise: number; delivery_fee_paise: number; total_paise: number; tax_included_paise?: number; promo_code?: string | null }
export interface Address { id: number; label: string; line1: string; village?: string; district: string; state: string; pincode: string; is_default: boolean }
export interface Citation { n: number; title: string; page: number | null; section: string | null; excerpt: string }
export interface Candidate {
  recommendation_id: number; product_id: number; name: string; purpose: string; included: boolean; why_considered: string;
  exclusion_reason: string | null; evidence: Citation[]; uncertainty: string | null; label_restrictions: string; dose_info: string;
  pack: { pack_size: string; price_paise: number; in_stock: boolean }; requires_expert: boolean;
}
