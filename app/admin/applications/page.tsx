import { redirect } from "next/navigation";

/**
 * Старый светлый список заявок заменён тёмной панелью на «/admin»
 * (макет заказчика, Figma). Оставляем редирект для старых ссылок/закладок.
 */
export default function ApplicationsRedirect() {
  redirect("/admin");
}
