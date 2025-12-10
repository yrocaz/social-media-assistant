import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import { User } from "better-auth";

export async function getCurrentUserId(): Promise<string | undefined> {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  return session?.user?.id;
}

export async function getCurrentUser(): Promise<User | undefined> {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  return session?.user;
}
