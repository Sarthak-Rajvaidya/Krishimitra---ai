import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../services/api";
import type { Cart } from "../types";
import { useAuth } from "./useAuth";

const empty: Cart = { items: [], subtotal_paise: 0, discount_paise: 0, delivery_fee_paise: 0, total_paise: 0 };
interface Ctx { cart: Cart; count: number; refresh: () => void; add: (pid: number, qty?: number, recId?: number) => Promise<void>; setQty: (id: number, q: number) => Promise<void>; remove: (id: number) => Promise<void> }
const CartCtx = createContext<Ctx>(null as never);
export const useCart = () => useContext(CartCtx);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart>(empty);
  const refresh = useCallback(() => {
    if (user?.role === "FARMER") api.get<Cart>("/cart").then(setCart).catch(() => setCart(empty)); else setCart(empty);
  }, [user]);
  useEffect(refresh, [refresh]);
  const add = async (product_id: number, quantity = 1, recommendation_id?: number) => setCart(await api.post<Cart>("/cart/items", { product_id, quantity, recommendation_id }));
  const setQty = async (id: number, quantity: number) => setCart(await api.put<Cart>(`/cart/items/${id}`, { quantity }));
  const remove = async (id: number) => setCart(await api.del<Cart>(`/cart/items/${id}`));
  return <CartCtx.Provider value={{ cart, count: cart.items.reduce((n, i) => n + i.quantity, 0), refresh, add, setQty, remove }}>{children}</CartCtx.Provider>;
}
