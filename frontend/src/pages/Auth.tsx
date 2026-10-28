import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Field } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { api } from "../services/api";

const schema = z.object({ email: z.string().email("Enter a valid email"), password: z.string().min(8, "At least 8 characters") });
type F = z.infer<typeof schema>;
export const homeFor = (role: string) => (role === "FARMER" ? "/" : `/${role.toLowerCase()}`);

export function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });
  const { login } = useAuth(); const nav = useNavigate(); const toast = useToast();
  return (
    <form className="card mx-auto mt-10 max-w-sm space-y-3" onSubmit={handleSubmit(async (v) => { try { const u = await login(v.email, v.password); nav(homeFor(u.role)); } catch (e: any) { toast(e.message, "err"); } })}>
      <h1 className="text-lg font-bold">Sign in</h1>
      <Field label="Email" error={errors.email?.message}><input className="input" type="email" autoComplete="username" {...register("email")} /></Field>
      <Field label="Password" error={errors.password?.message}><input className="input" type="password" autoComplete="current-password" {...register("password")} /></Field>
      <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in"}</button>
      <p className="text-xs text-slate-500">New farmer? <Link to="/register" className="underline">Create account</Link>. Demo logins are printed by the seed command.</p>
    </form>
  );
}

const reg = z.object({ full_name: z.string().min(2), email: z.string().email(), password: z.string().min(8).max(72), phone: z.string().optional() });
export function Register() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof reg>>({ resolver: zodResolver(reg) });
  const nav = useNavigate(); const toast = useToast(); const { login } = useAuth();
  return (
    <form className="card mx-auto mt-10 max-w-sm space-y-3" onSubmit={handleSubmit(async (v) => { try { await api.post("/auth/register", v); await login(v.email, v.password); nav("/"); } catch (e: any) { toast(e.message, "err"); } })}>
      <h1 className="text-lg font-bold">Create farmer account</h1>
      <Field label="Full name" error={errors.full_name?.message}><input className="input" {...register("full_name")} /></Field>
      <Field label="Email" error={errors.email?.message}><input className="input" type="email" {...register("email")} /></Field>
      <Field label="Phone (optional)"><input className="input" inputMode="tel" {...register("phone")} /></Field>
      <Field label="Password" error={errors.password?.message}><input className="input" type="password" autoComplete="new-password" {...register("password")} /></Field>
      <button className="btn-primary w-full" disabled={isSubmitting}>Create account</button>
    </form>
  );
}
