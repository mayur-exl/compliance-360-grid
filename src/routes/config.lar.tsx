import { createFileRoute } from "@tanstack/react-router";
import { ConfigList } from "@/components/ConfigList";
import { LAR_ALLOWED_GROUPS } from "@/lib/mock-data";

export const Route = createFileRoute("/config/lar")({
  head: () => ({ meta: [{ title: "LAR Allowed List — Compliance 360" }] }),
  component: () => <ConfigList title="LAR Allowed Groups" subtitle="Groups permitted in Logical Access Reviews" initial={LAR_ALLOWED_GROUPS} />,
});
