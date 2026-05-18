import { createFileRoute } from "@tanstack/react-router";
import { ReviewWorkflow, ENDPOINT_CFG } from "@/components/ReviewWorkflow";

export const Route = createFileRoute("/reviews/endpoint")({
  head: () => ({ meta: [{ title: "Endpoint Review — Compliance 360" }] }),
  component: () => <ReviewWorkflow cfg={ENDPOINT_CFG} />,
});
