import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import HomePage from "../app/page";
import LoginPage from "../app/login/page";
import HousePage from "../app/app/page";
import RoutinePage from "../app/app/routine/page";
import PotsPage from "../app/app/pots/page";
import TasksPage from "../app/app/tasks/page";
import ShoppingPage from "../app/app/shopping/page";
import WishesPage from "../app/app/wishes/page";
import UsersPage from "../app/admin/users/page";
import "../app/globals.css";

const routes: Record<string, () => React.ReactNode> = {
  "/": () => <HomePage />,
  "/login": () => <LoginPage />,
  "/app": () => <HousePage />,
  "/app/routine": () => <RoutinePage />,
  "/app/pots": () => <PotsPage />,
  "/app/tasks": () => <TasksPage />,
  "/app/shopping": () => <ShoppingPage />,
  "/app/wishes": () => <WishesPage />,
  "/admin/users": () => <UsersPage />,
  "/admin/pots": () => <PotsPage />,
  "/admin/tasks": () => <TasksPage />,
};

function currentHash() {
  return window.location.hash.slice(1) || "/";
}

function HashApp() {
  const [hash, setHash] = useState(currentHash);
  const [path, query = ""] = hash.split("?");
  const renderRoute = routes[path] ?? routes["/"];

  useEffect(() => {
    const handleHashChange = () => setHash(currentHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    const section = new URLSearchParams(query).get("section");
    if (!section) {
      window.scrollTo({ top: 0 });
      return;
    }

    requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView());
  }, [path, query]);

  return renderRoute();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashApp />
  </StrictMode>,
);
