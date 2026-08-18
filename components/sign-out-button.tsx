import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

/** Выход: server action, без клиентского JS. */
export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <Button variant="outline" type="submit">
        Выйти
      </Button>
    </form>
  );
}
