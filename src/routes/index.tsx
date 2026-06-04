import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KLANBARZ" },
      { name: "description", content: "App de miembros del gimnasio KLANBARZ." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/app" });
  },
  component: () => null,
});
