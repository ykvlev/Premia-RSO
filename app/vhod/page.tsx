import { redirect } from "next/navigation";

/** /vhod устарел — редирект на единый /login */
export default function LegacyVhodPage() {
  redirect("/login");
}
