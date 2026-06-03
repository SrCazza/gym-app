import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GymCuenca" },
      { name: "description", content: "App de miembros del gimnasio GymCuenca." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/app" });
  },
  component: () => null,
});
