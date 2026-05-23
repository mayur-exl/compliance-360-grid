import { createFileRoute } from "@tanstack/react-router";
import { ContractualWorkflow } from "@/components/ContractualWorkflow";

export const Route = createFileRoute("/reviews/contractual")({
  head: () => ({ meta: [{ title: "Contractual Compliance — Compliance 360" }] }),
  component: () => <ContractualWorkflow />,
});
