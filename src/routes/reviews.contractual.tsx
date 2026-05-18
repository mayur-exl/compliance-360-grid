import { createFileRoute } from "@tanstack/react-router";
import { ReviewWorkflow, CONTRACTUAL_CFG } from "@/components/ReviewWorkflow";

export const Route = createFileRoute("/reviews/contractual")({
  head: () => ({ meta: [{ title: "Contractual Compliance — Compliance 360" }] }),
  component: () => <ReviewWorkflow cfg={CONTRACTUAL_CFG} />,
});
