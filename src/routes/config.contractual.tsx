import { createFileRoute } from "@tanstack/react-router";
import { ConfigList } from "@/components/ConfigList";
import { CONTRACTUAL_CONTROLS } from "@/lib/mock-data";

export const Route = createFileRoute("/config/contractual")({
  head: () => ({ meta: [{ title: "Contractual Comp. List — Compliance 360" }] }),
  component: () => <ConfigList title="Contractual Compliance List" subtitle="Master list of contractual controls validated during review" initial={CONTRACTUAL_CONTROLS} />,
});
