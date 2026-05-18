import { createFileRoute } from "@tanstack/react-router";
import { ReviewWorkflow, LAR_CFG } from "@/components/ReviewWorkflow";

export const Route = createFileRoute("/reviews/lar")({
  head: () => ({ meta: [{ title: "Logical Access Review — Compliance 360" }] }),
  component: () => <ReviewWorkflow cfg={LAR_CFG} />,
});
