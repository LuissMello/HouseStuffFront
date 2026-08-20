export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  isAdministrator: boolean;
  residenceId: string | null;
  residenceName: string | null;
};

export type UserSummary = CurrentUser;

export type Residence = {
  id: string;
  name: string;
  members: Array<{ id: string; name: string; email: string; isAdministrator: boolean }>;
};

export type Pot = {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type HouseholdTaskKind = "oneTime" | "reusable" | "recurring";

export type HouseholdTask = {
  id: string;
  potId: string;
  potName: string;
  name: string;
  description: string | null;
  kind: HouseholdTaskKind;
  recurrenceDays: number | null;
  isActive: boolean;
};

export type DrawProposal = {
  taskId: string;
  potId: string;
  potName: string;
  taskName: string;
  description: string | null;
  kind: HouseholdTaskKind;
  recurrenceDays: number | null;
};

export type ActiveAssignment = DrawProposal & {
  assignmentId: string;
  acceptedAt: string;
};

type Problem = { title?: string; detail?: string; code?: string };

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5049";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as Problem;
    throw new ApiError(problem.title ?? problem.detail ?? "Não foi possível concluir a operação.", response.status, problem.code);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const accessApi = {
  login: (email: string, password: string, rememberMe: boolean) => request<CurrentUser>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, rememberMe }),
  }),
  logout: () => request<void>("/api/v1/auth/logout", { method: "POST" }),
  me: () => request<CurrentUser>("/api/v1/auth/me"),
  listUsers: () => request<UserSummary[]>("/api/v1/admin/users"),
  createUser: (input: { name: string; email: string; temporaryPassword: string; isAdministrator: boolean }) =>
    request<UserSummary>("/api/v1/admin/users", { method: "POST", body: JSON.stringify(input) }),
};

export const residenceApi = {
  current: () => request<Residence>("/api/v1/residences/current"),
  create: (name: string) => request<Residence>("/api/v1/residences", { method: "POST", body: JSON.stringify({ name }) }),
  addMember: (userId: string) => request<Residence>(`/api/v1/residences/current/members/${userId}`, { method: "POST" }),
};

export const potApi = {
  list: () => request<Pot[]>("/api/v1/pots"),
  listAdmin: () => request<Pot[]>("/api/v1/admin/pots"),
  create: (input: { name: string; description: string }) => request<Pot>("/api/v1/admin/pots", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: { name: string; description: string }) => request<Pot>(`/api/v1/admin/pots/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  setActive: (id: string, isActive: boolean) => request<Pot>(`/api/v1/admin/pots/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
  move: (id: string, offset: number) => request<Pot[]>(`/api/v1/admin/pots/${id}/move`, { method: "POST", body: JSON.stringify({ offset }) }),
};

export const householdTaskApi = {
  listAdmin: (potId?: string) => request<HouseholdTask[]>(`/api/v1/admin/tasks${potId ? `?potId=${encodeURIComponent(potId)}` : ""}`),
  create: (input: { potId: string; name: string; description: string; kind: HouseholdTaskKind; recurrenceDays: number | null }) =>
    request<HouseholdTask>("/api/v1/admin/tasks", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: { potId: string; name: string; description: string; kind: HouseholdTaskKind; recurrenceDays: number | null }) =>
    request<HouseholdTask>(`/api/v1/admin/tasks/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  setActive: (id: string, isActive: boolean) => request<HouseholdTask>(`/api/v1/admin/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
};

export const assignmentApi = {
  current: () => request<ActiveAssignment | null>("/api/v1/assignments/current"),
  draw: (potId: string, excludedTaskIds: string[]) => request<DrawProposal>("/api/v1/draws", { method: "POST", body: JSON.stringify({ potId, excludedTaskIds }) }),
  accept: (taskId: string) => request<ActiveAssignment>("/api/v1/assignments/accept", { method: "POST", body: JSON.stringify({ taskId }) }),
};
