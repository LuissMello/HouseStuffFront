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
export type TaskDifficulty = "easy" | "medium" | "hard";

export type SaveHouseholdTask = {
  potId: string;
  name: string;
  description: string;
  kind: HouseholdTaskKind;
  recurrenceDays: number | null;
  difficulty: TaskDifficulty;
  isAvailableToAllResidents: boolean;
  eligibleUserIds: string[];
};

export type HouseholdTask = {
  id: string;
  potId: string;
  potName: string;
  name: string;
  description: string | null;
  kind: HouseholdTaskKind;
  recurrenceDays: number | null;
  isActive: boolean;
  difficulty: TaskDifficulty;
  isAvailableToAllResidents: boolean;
  eligibleUserIds: string[];
};

export type DrawProposal = {
  taskId: string;
  potId: string;
  potName: string;
  taskName: string;
  description: string | null;
  kind: HouseholdTaskKind;
  recurrenceDays: number | null;
  difficulty: TaskDifficulty;
};

export type ActiveAssignment = DrawProposal & {
  assignmentId: string;
  acceptedAt: string;
};

export type CompletedAssignment = {
  assignmentId: string;
  taskId: string;
  taskName: string;
  kind: HouseholdTaskKind;
  completedAt: string;
  nextAvailableAt: string | null;
  returnsToPot: boolean;
};

export type RoutineOverview = {
  generatedAt: string;
  upcoming: Array<{
    taskId: string;
    potId: string;
    potName: string;
    taskName: string;
    description: string | null;
    nextAvailableAt: string;
  }>;
  history: Array<{
    assignmentId: string;
    taskId: string;
    potName: string;
    taskName: string;
    kind: HouseholdTaskKind;
    acceptedAt: string;
    completedAt: string;
  }>;
};

export type ShoppingItem = { id: string; categoryId: string; name: string };
export type ShoppingCategory = { id: string; name: string; displayOrder: number; items: ShoppingItem[] };
export type PurchaseWish = { id: string; name: string; storeUrl: string | null; priority: number };
export type CalendarEventKind = "date" | "birthday" | "appointment";
export type CalendarParticipant = { userId: string; name: string };
export type CalendarEntry = {
  entryId: string;
  eventId: string | null;
  source: "event" | "task";
  kind: CalendarEventKind | "recurringTask";
  title: string;
  description: string | null;
  date: string | null;
  definitionDate: string | null;
  startsAt: string | null;
  endsAt: string | null;
  appliesToAll: boolean;
  participants: CalendarParticipant[];
};
export type CalendarRange = { fromDate: string; toDate: string; entries: CalendarEntry[] };
export type SaveCalendarEvent = {
  title: string;
  description: string | null;
  kind: CalendarEventKind;
  appliesToAll: boolean;
  allDayDate: string | null;
  startsAt: string | null;
  endsAt: string | null;
  participantUserIds: string[];
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
  changeUserRole: (userId: string, isAdministrator: boolean) =>
    request<UserSummary>(`/api/v1/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ isAdministrator }) }),
};

export const residenceApi = {
  current: () => request<Residence>("/api/v1/residences/current"),
  create: (name: string) => request<Residence>("/api/v1/residences", { method: "POST", body: JSON.stringify({ name }) }),
  addMember: (userId: string) => request<Residence>(`/api/v1/residences/current/members/${userId}`, { method: "POST" }),
};

export const potApi = {
  list: () => request<Pot[]>("/api/v1/pots"),
  listForManagement: () => request<Pot[]>("/api/v1/admin/pots"),
  create: (input: { name: string; description: string }) => request<Pot>("/api/v1/admin/pots", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: { name: string; description: string }) => request<Pot>(`/api/v1/admin/pots/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  setActive: (id: string, isActive: boolean) => request<Pot>(`/api/v1/admin/pots/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
  move: (id: string, offset: number) => request<Pot[]>(`/api/v1/admin/pots/${id}/move`, { method: "POST", body: JSON.stringify({ offset }) }),
};

export const householdTaskApi = {
  listForManagement: (potId?: string) => request<HouseholdTask[]>(`/api/v1/admin/tasks${potId ? `?potId=${encodeURIComponent(potId)}` : ""}`),
  create: (input: SaveHouseholdTask) =>
    request<HouseholdTask>("/api/v1/admin/tasks", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: SaveHouseholdTask) =>
    request<HouseholdTask>(`/api/v1/admin/tasks/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  setActive: (id: string, isActive: boolean) => request<HouseholdTask>(`/api/v1/admin/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
};

export const assignmentApi = {
  current: () => request<ActiveAssignment | null>("/api/v1/assignments/current"),
  draw: (potId: string, excludedTaskIds: string[], difficulty: TaskDifficulty | null) => request<DrawProposal>("/api/v1/draws", { method: "POST", body: JSON.stringify({ potId, excludedTaskIds, difficulty }) }),
  accept: (taskId: string) => request<ActiveAssignment>("/api/v1/assignments/accept", { method: "POST", body: JSON.stringify({ taskId }) }),
  completeCurrent: () => request<CompletedAssignment>("/api/v1/assignments/current/complete", { method: "POST" }),
};

export const routineApi = {
  overview: () => request<RoutineOverview>("/api/v1/routine"),
};

export const calendarApi = {
  range: (input: { fromDate: string; toDate: string; fromUtc: string; toUtc: string }) => {
    const query = new URLSearchParams(input);
    return request<CalendarRange>(`/api/v1/calendar?${query}`);
  },
  create: (input: SaveCalendarEvent) => request("/api/v1/calendar/events", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: SaveCalendarEvent) => request(`/api/v1/calendar/events/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  delete: (id: string) => request<boolean>(`/api/v1/calendar/events/${id}`, { method: "DELETE" }),
};

export const shoppingApi = {
  catalog: () => request<ShoppingCategory[]>("/api/v1/shopping/catalog"),
  createCategory: (name: string) => request<ShoppingCategory>("/api/v1/shopping/categories", { method: "POST", body: JSON.stringify({ name }) }),
  updateCategory: (id: string, name: string) => request<ShoppingCategory>(`/api/v1/shopping/categories/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  moveCategory: (id: string, offset: number) => request<ShoppingCategory[]>(`/api/v1/shopping/categories/${id}/move`, { method: "POST", body: JSON.stringify({ offset }) }),
  deleteCategory: (id: string) => request<boolean>(`/api/v1/shopping/categories/${id}`, { method: "DELETE" }),
  createItem: (input: { categoryId: string; name: string }) => request<ShoppingItem>("/api/v1/shopping/items", { method: "POST", body: JSON.stringify(input) }),
  updateItem: (id: string, input: { categoryId: string; name: string }) => request<ShoppingItem>(`/api/v1/shopping/items/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteItem: (id: string) => request<boolean>(`/api/v1/shopping/items/${id}`, { method: "DELETE" }),
};

export const purchaseWishApi = {
  list: () => request<PurchaseWish[]>("/api/v1/purchase-wishes"),
  create: (input: { name: string; storeUrl: string | null }) => request<PurchaseWish>("/api/v1/purchase-wishes", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: { name: string; storeUrl: string | null }) => request<PurchaseWish>(`/api/v1/purchase-wishes/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  delete: (id: string) => request<boolean>(`/api/v1/purchase-wishes/${id}`, { method: "DELETE" }),
  reorder: (orderedIds: string[]) => request<PurchaseWish[]>("/api/v1/purchase-wishes/order", { method: "PUT", body: JSON.stringify({ orderedIds }) }),
};
