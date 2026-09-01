import ClockApp from "@/components/ClockApp";
import { getState } from "@/lib/state";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initial = await getState();
  return <ClockApp initial={initial} />;
}
