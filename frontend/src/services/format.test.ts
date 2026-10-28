import { rupees } from "./api";
test("formats paise as rupees", () => { expect(rupees(26600)).toContain("266"); expect(rupees(null)).toBe("—"); });
