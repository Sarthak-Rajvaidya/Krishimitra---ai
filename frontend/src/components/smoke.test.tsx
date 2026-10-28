import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Empty, Kpi, RequireRole } from "./ui";
import { AuthProvider } from "../hooks/useAuth";

beforeEach(() => { globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: "no", json: async () => ({ detail: "Not authenticated" }), headers: new Headers() }) as never; });

test("renders KPI and empty state", () => {
  render(<><Kpi label="Orders" value={5} /><Empty text="Nothing here" /></>);
  expect(screen.getByText("Orders")).toBeInTheDocument(); expect(screen.getByText("Nothing here")).toBeInTheDocument();
});
test("protected route redirects anonymous users", async () => {
  render(<MemoryRouter initialEntries={["/admin"]}><AuthProvider><RequireRole roles={["ADMIN"]}><div>secret</div></RequireRole></AuthProvider></MemoryRouter>);
  await screen.findByText(/./); expect(screen.queryByText("secret")).toBeNull();
});
