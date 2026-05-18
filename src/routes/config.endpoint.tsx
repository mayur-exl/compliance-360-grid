import { createFileRoute } from "@tanstack/react-router";
import { ConfigList } from "@/components/ConfigList";
import { ENDPOINT_BASELINE } from "@/lib/mock-data";

export const Route = createFileRoute("/config/endpoint")({
  head: () => ({ meta: [{ title: "Endpoint Baseline — Compliance 360" }] }),
  component: () => <ConfigList title="Endpoint Baseline" subtitle="Mandatory endpoint security controls" initial={ENDPOINT_BASELINE} />,
});
